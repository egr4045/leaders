import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';
import { getAudioCtx, unlockAudio } from '../lib/audioUnlock';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];
type NewsCursor = RoomSnapshot['newsCursor'];

const INTRO_MS = 4500; // intro splash duration (matches server NEWS_INTRO_MS + jingle)
// Tiny silent mp3 — played (muted) inside a user gesture to unlock the <audio> element.
const SILENT_MP3 =
  'data:audio/mp3;base64,//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

function playIntroJingle() {
  try {
    // Shared context so a global user gesture (installAudioUnlock) can resume it.
    const ctx = getAudioCtx();
    if (!ctx) return;
    void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    const note = (freq: number, start: number, dur: number, peak: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };

    const t0 = ctx.currentTime + 0.05;
    // Low bed for gravitas
    note(131, t0, 3.4, 0.05, 'triangle');
    // Ascending fanfare arpeggio
    [523, 659, 784, 1047].forEach((f, i) => note(f, t0 + i * 0.26, 0.55, 0.13));
    // Sustained mid chord
    [523, 659, 784].forEach((f) => note(f, t0 + 1.05, 1.9, 0.06));
    // Resolved bright sting
    [523, 659, 784, 1047, 1319].forEach((f) => note(f, t0 + 2.5, 1.8, 0.07));
    // NB: shared context is intentionally not closed.
  } catch {
    // AudioContext not available
  }
}

/**
 * Выпуск новостей. Прогресс (какая страна/строка) задаёт СЕРВЕР через `cursor`
 * (snapshot.newsCursor) — у всех клиентов одинаково, не застревает. Локально
 * клиент только проигрывает озвучку текущей строки и рисует субтитры/диктора.
 *   cursor === null            → интро-заставка (играет джингл)
 *   cursor.countryIdx < len    → читается страна[countryIdx], строка[lineIdx]
 *   cursor.countryIdx >= len   → выпуск окончен
 */
export function NewsPlayer({
  news,
  isHost = false,
  cursor,
  onSkip,
}: {
  news: NewsItem[];
  isHost?: boolean;
  cursor: NewsCursor;
  onSkip?: () => void;
}) {
  const [subtitleText, setSubtitleText] = useState('');
  const [introElapsed, setIntroElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const jinglePlayed = useRef(false);

  const started = cursor !== null;
  const countryIdx = cursor?.countryIdx ?? 0;
  const lineIdx = cursor?.lineIdx ?? 0;
  const item = started && countryIdx < news.length ? news[countryIdx]! : null;
  const finished = started && countryIdx >= news.length;

  // Mount: unlock audio + (during intro only) play the jingle and run the countdown.
  useEffect(() => {
    unlockAudio();
    const el = audioRef.current;
    if (el) {
      el.muted = true;
      el.src = SILENT_MP3;
      el.play().then(() => { el.pause(); el.muted = false; }).catch(() => {});
    }

    const c = getAudioCtx();
    let onState: (() => void) | null = null;
    if (c) {
      if (c.state !== 'running') setAudioBlocked(true);
      onState = () => { if (c.state === 'running') setAudioBlocked(false); };
      c.addEventListener('statechange', onState);
    }

    let tick: ReturnType<typeof setInterval> | null = null;
    // Only when we mount during the intro (cursor still null) do we play the jingle
    // + show the countdown. Late joiners (cursor already set) skip straight to news.
    if (cursor === null) {
      if (!jinglePlayed.current && c && c.state === 'running') {
        jinglePlayed.current = true;
        playIntroJingle();
      }
      tick = setInterval(() => setIntroElapsed((p) => Math.min(INTRO_MS, p + 100)), 100);
    }
    return () => {
      if (tick) clearInterval(tick);
      if (c && onState) c.removeEventListener('statechange', onState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play the current line's TTS (server drives WHICH line; we only play it).
  useEffect(() => {
    if (!item) { setAudioEl(null); return; }
    const line = item.lines[lineIdx] ?? null;
    if (!line) { setSubtitleText(''); return; }

    setSubtitleText('');
    const el = audioRef.current;
    const audioUrl = item.lineAudioUrls?.[lineIdx] ?? null;

    if (audioUrl && el) {
      setAudioEl(el);
      el.muted = false;
      el.src = audioUrl;

      let rAF = 0;
      let lastCharI = -1;
      const updateSubtitle = () => {
        if (el.duration > 0) {
          const charI = Math.floor((el.currentTime / el.duration) * line.length);
          if (charI !== lastCharI) {
            lastCharI = charI;
            setSubtitleText(line.slice(0, charI));
          }
        }
        rAF = requestAnimationFrame(updateSubtitle);
      };
      el.onplay = () => updateSubtitle();
      el.onended = () => { cancelAnimationFrame(rAF); setSubtitleText(line); };
      el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      return () => {
        cancelAnimationFrame(rAF);
        el.pause();
        el.onended = null;
        el.onplay = null;
      };
    } else {
      // No audio for this line — type the subtitle locally so the anchor isn't static.
      setAudioEl(null);
      if (el) { el.pause(); el.onended = null; }
      let charI = 0;
      const iv = setInterval(() => {
        charI++;
        setSubtitleText(line.slice(0, charI));
        if (charI >= line.length) clearInterval(iv);
      }, 55);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, countryIdx, lineIdx]);

  // Recover from a blocked autoplay — runs inside the user's tap (a real gesture).
  const unlockFromTap = () => {
    unlockAudio();
    setAudioBlocked(false);
    const el = audioRef.current;
    if (!el) return;
    el.muted = false;
    const cur = el.src;
    if (started && cur && !cur.startsWith('data:')) {
      el.play().catch(() => {});
    } else {
      el.muted = true;
      el.src = SILENT_MP3;
      el.play().then(() => { el.pause(); el.muted = false; }).catch(() => {});
    }
  };

  const introPct = Math.min(1, introElapsed / INTRO_MS);

  return (
    <div className="relative flex w-full flex-col gap-0 overflow-hidden rounded-2xl bg-slate-900">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Tap-to-enable-sound overlay (autoplay was blocked) */}
      {audioBlocked && (
        <button
          onClick={unlockFromTap}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/70 backdrop-blur-sm"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-3xl shadow-lg shadow-red-900">🔊</span>
          <span className="text-base font-bold text-white">Нажмите для звука</span>
          <span className="text-xs text-white/60">Браузер заблокировал автозапуск</span>
        </button>
      )}

      {!started ? (
        /* ── Intro splash (server starts the cursor after the jingle) ── */
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-950"
             style={{ minHeight: 'min(55vw, 42vh)', maxHeight: '48vh' }}>
          <svg className="absolute inset-0 h-full w-full opacity-[0.08]" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"
               style={{ animation: 'spin 8s linear infinite', transformOrigin: '50% 50%' }}>
            <circle cx="200" cy="130" r="160" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
            <ellipse cx="200" cy="130" rx="160" ry="65" fill="none" stroke="#60a5fa" strokeWidth="1" />
            <ellipse cx="200" cy="130" rx="160" ry="120" fill="none" stroke="#60a5fa" strokeWidth="0.8" />
            <ellipse cx="200" cy="130" rx="90" ry="160" fill="none" stroke="#60a5fa" strokeWidth="0.6" />
            <line x1="200" y1="-30" x2="200" y2="290" stroke="#60a5fa" strokeWidth="1" />
            <line x1="40" y1="130" x2="360" y2="130" stroke="#60a5fa" strokeWidth="1" />
            <line x1="60" y1="70" x2="340" y2="190" stroke="#60a5fa" strokeWidth="0.5" />
            <line x1="60" y1="190" x2="340" y2="70" stroke="#60a5fa" strokeWidth="0.5" />
          </svg>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white shadow-lg shadow-red-900">①</div>
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-semibold tracking-widest text-white/70">ПРЯМОЙ ЭФИР</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center"
               style={{ opacity: Math.min(1, introPct * 4), transform: `scale(${0.85 + introPct * 0.15})`, transition: 'none' }}>
            <div className="text-6xl font-black tracking-[0.2em] text-white drop-shadow-lg">НОВОСТИ</div>
            <div className="text-xs tracking-[0.4em] text-white/40 uppercase">Лидеры нации</div>
            <div className="mt-1 text-3xl font-mono font-bold text-red-500/80">{Math.ceil((INTRO_MS - introElapsed) / 1000) > 0 ? Math.ceil((INTRO_MS - introElapsed) / 1000) : ''}</div>
          </div>

          <div className="absolute bottom-10 left-8 right-8 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-none" style={{ width: `${introPct * 100}%` }} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-red-600 px-4 py-2">
            <span className="text-base font-bold tracking-wider text-white">ВЕСТИ</span>
            <span className="text-white/60">•</span>
            <span className="overflow-hidden whitespace-nowrap text-sm text-white/80" style={{ maxWidth: '70%' }}>
              {news[0]?.countryName ?? 'Специальный выпуск'}
            </span>
          </div>
        </div>
      ) : finished || !item ? (
        <div className="w-full rounded-2xl bg-slate-900 p-6 text-center text-slate-400">
          На этом выпуск новостей окончен. Оставайтесь с нами.
        </div>
      ) : (
        (() => {
          const currentLine = item.lines[lineIdx] ?? '';
          const lastCountry = countryIdx + 1 >= news.length;
          return (
            <>
              {/* Anchor area */}
              <div className="relative w-full" style={{ minHeight: 'min(55vw, 42vh)', maxHeight: '48vh' }}>
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                  <Anchor audioEl={audioEl} currentLine={subtitleText || currentLine} />
                </div>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
                  />
                )}
                <div className="absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-widest text-amber-400">
                  {item.countryName} — выпуск {countryIdx + 1}/{news.length}
                </div>
                {/* Host: skip current country (server-synced for everyone) */}
                {isHost && onSkip && (
                  <button
                    onClick={onSkip}
                    className="absolute bottom-3 right-3 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
                  >
                    {lastCountry ? 'Завершить выпуск ✓' : 'Следующая страна →'}
                  </button>
                )}
              </div>

              {/* Line progress bar */}
              <div className="h-1 w-full bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${currentLine.length > 0 ? (subtitleText.length / currentLine.length) * 100 : 100}%` }}
                />
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
