import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';
import { getAudioCtx, unlockAudio } from '../lib/audioUnlock';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];

const MS_PER_CHAR = 55;
const FALLBACK_MS = 2800;
const INTRO_MS = 4500; // news opening duration before playback starts (matches jingle)
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

export function NewsPlayer({ news, isHost = false }: { news: NewsItem[]; isHost?: boolean }) {
  const [started, setStarted] = useState(false);
  const [countryIdx, setCountryIdx] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [introElapsed, setIntroElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const jinglePlayed = useRef(false);

  // Fixed intro, then start news
  useEffect(() => {
    // Best-effort: resume shared context + prime the <audio> element so autoplay
    // works. If the browser still blocks playback, the tap overlay below recovers it.
    unlockAudio();
    const el = audioRef.current;
    if (el) {
      el.muted = true;
      el.src = SILENT_MP3;
      el.play().then(() => {
        el.pause();
        el.muted = false;
      }).catch(() => {});
    }

    // If audio is still locked (no prior user gesture this session), prompt a tap
    // up front so the jingle + anchor play from the start. Cleared once unlocked.
    const c = getAudioCtx();
    let onState: (() => void) | null = null;
    if (c) {
      if (c.state !== 'running') setAudioBlocked(true);
      onState = () => { if (c.state === 'running') setAudioBlocked(false); };
      c.addEventListener('statechange', onState);
    }

    if (started) return () => { if (c && onState) c.removeEventListener('statechange', onState); };
    // Only play the jingle if audio is actually unlocked, so its scheduled notes
    // can't fire over the news after a late tap.
    if (!jinglePlayed.current && c && c.state === 'running') { jinglePlayed.current = true; playIntroJingle(); }
    const tick = setInterval(() => setIntroElapsed((p) => p + 100), 100);
    const id = setTimeout(() => {
      clearInterval(tick);
      setStarted(true);
    }, INTRO_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(id);
      if (c && onState) c.removeEventListener('statechange', onState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = started && countryIdx < news.length ? news[countryIdx]! : null;

  // Per-line playback: audio → onended sync; else → char-count timer
  useEffect(() => {
    if (!item) return;
    const line = item.lines[lineIdx] ?? null;
    if (!line) return;

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
      
      el.onplay = () => {
        updateSubtitle();
      };
      
      el.onended = () => {
        cancelAnimationFrame(rAF);
        setSubtitleText(line);
        if (lineIdx + 1 < item.lines.length) {
          setLineIdx((l) => l + 1);
        }
      };
      el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
      return () => {
        cancelAnimationFrame(rAF);
        el.pause();
        el.onended = null;
        el.onplay = null;
      };
    } else {
      setAudioEl(null);
      if (el) { el.pause(); el.onended = null; }
      
      let charI = 0;
      const iv = setInterval(() => {
        charI++;
        setSubtitleText(line.slice(0, charI));
        if (charI >= line.length) clearInterval(iv);
      }, MS_PER_CHAR);

      const ms = Math.max(line.length * MS_PER_CHAR + 600, FALLBACK_MS);
      const timer = setTimeout(() => {
        if (lineIdx + 1 < item.lines.length) {
          setLineIdx((l) => l + 1);
        }
      }, ms);
      return () => {
        clearInterval(iv);
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, lineIdx, countryIdx]);

  const goNext = () => {
    const el = audioRef.current;
    if (el) { el.pause(); el.onended = null; }
    setAudioEl(null);
    setSubtitleText('');
    if (countryIdx + 1 < news.length) {
      setCountryIdx((i) => i + 1);
      setLineIdx(0);
    } else {
      setCountryIdx(news.length);
    }
  };

  // Recover from a blocked autoplay — runs inside the user's tap (a real gesture).
  const unlockFromTap = () => {
    unlockAudio();
    setAudioBlocked(false);
    const el = audioRef.current;
    if (!el) return;
    el.muted = false;
    const cur = el.src;
    if (started && cur && !cur.startsWith('data:')) {
      // A news line is loaded — play it audibly now.
      el.play().catch(() => {});
    } else {
      // Still in the intro — prime the element so the TTS at INTRO_MS is allowed.
      el.muted = true;
      el.src = SILENT_MP3;
      el.play().then(() => { el.pause(); el.muted = false; }).catch(() => {});
    }
  };

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

      {/* ── Intro screen (5 seconds) ──────────────────────────────────────────────── */}
      {!started ? (
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-950"
             style={{ minHeight: 'min(55vw, 42vh)', maxHeight: '48vh' }}>
          {/* Animated globe */}
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

          {/* Channel logo */}
          <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white shadow-lg shadow-red-900">①</div>

          {/* Live indicator */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs font-semibold tracking-widest text-white/70">ПРЯМОЙ ЭФИР</span>
          </div>

          {/* Main title */}
          <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center"
               style={{ opacity: Math.min(1, Math.min(1, introElapsed / INTRO_MS) * 4), transform: `scale(${0.85 + Math.min(1, introElapsed / INTRO_MS) * 0.15})`, transition: 'none' }}>
            <div className="text-6xl font-black tracking-[0.2em] text-white drop-shadow-lg">НОВОСТИ</div>
            <div className="text-xs tracking-[0.4em] text-white/40 uppercase">Лидеры нации</div>
            {/* Countdown */}
            <div className="mt-1 text-3xl font-mono font-bold text-red-500/80">{Math.max(0, Math.ceil((INTRO_MS - introElapsed) / 1000)) > 0 ? Math.max(0, Math.ceil((INTRO_MS - introElapsed) / 1000)) : ''}</div>
          </div>

          {/* Progress sweep */}
          <div className="absolute bottom-10 left-8 right-8 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-red-500 transition-none" style={{ width: `${Math.min(1, introElapsed / INTRO_MS) * 100}%` }} />
          </div>

          {/* Red bottom stripe */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-red-600 px-4 py-2">
            <span className="text-base font-bold tracking-wider text-white">ВЕСТИ</span>
            <span className="text-white/60">•</span>
            <span className="overflow-hidden whitespace-nowrap text-sm text-white/80" style={{ maxWidth: '70%' }}>
              {news[0]?.countryName ?? 'Специальный выпуск'}
            </span>
          </div>
        </div>
      ) : !item ? (
        <div className="w-full rounded-2xl bg-slate-900 p-6 text-center text-slate-400">
          На этом выпуск новостей окончен. Оставайтесь с нами.
        </div>
      ) : (
        (() => {
          const currentLine = item.lines[lineIdx] ?? '';
          const allLinesShown = lineIdx >= item.lines.length - 1 && subtitleText.length >= currentLine.length;
          
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
                {/* Country label */}
                <div className="absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-widest text-amber-400">
                  {item.countryName} — выпуск {countryIdx + 1}/{news.length}
                </div>
                {/* Host controls */}
                {isHost && allLinesShown && (
                  <button
                    onClick={goNext}
                    className="absolute bottom-3 right-3 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
                  >
                    {countryIdx + 1 < news.length ? 'Следующая страна →' : 'Завершить выпуск ✓'}
                  </button>
                )}
                {isHost && !allLinesShown && (
                  <button
                    onClick={goNext}
                    className="absolute bottom-3 right-3 rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-500 hover:text-slate-300"
                  >
                    пропустить →
                  </button>
                )}
              </div>

              {/* Line progress bar */}
              <div className="h-1 w-full bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{ width: `${currentLine.length > 0 ? subtitleText.length / currentLine.length * 100 : 100}%` }}
                />
              </div>
            </>
          );
        })()
      )}
    </div>
  );
}
