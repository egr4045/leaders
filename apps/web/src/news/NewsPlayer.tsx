import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];

const MS_PER_CHAR = 55;
const FALLBACK_MS = 2800;
const INTRO_MS = 5000; // news opening duration before playback starts

function playIntroJingle() {
  try {
    const ctx = new AudioContext();
    const arpNotes = [523, 659, 784];
    let t = ctx.currentTime + 0.05;
    for (const freq of arpNotes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
      t += 0.22;
    }
    for (const freq of [523, 659, 784, 1047]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.6);
    }
    setTimeout(() => ctx.close(), 3500);
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
  const jinglePlayed = useRef(false);

  // Fixed 5-second intro, then start news
  useEffect(() => {
    if (started) return;
    if (!jinglePlayed.current) { jinglePlayed.current = true; playIntroJingle(); }
    const tick = setInterval(() => setIntroElapsed((p) => p + 100), 100);
    const id = setTimeout(() => {
      clearInterval(tick);
      setStarted(true);
    }, INTRO_MS);
    return () => { clearInterval(tick); clearTimeout(id); };
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

    let charI = 0;
    const iv = setInterval(() => {
      charI++;
      setSubtitleText(line.slice(0, charI));
      if (charI >= line.length) clearInterval(iv);
    }, MS_PER_CHAR);

    if (audioUrl && el) {
      setAudioEl(el);
      el.src = audioUrl;
      el.onended = () => {
        clearInterval(iv);
        setSubtitleText(line);
        if (lineIdx + 1 < item.lines.length) {
          setLineIdx((l) => l + 1);
        }
      };
      void el.play().catch(() => {});
      return () => {
        clearInterval(iv);
        el.pause();
        el.onended = null;
      };
    } else {
      setAudioEl(null);
      if (el) { el.pause(); el.onended = null; }
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
  }, [lineIdx, countryIdx]);

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

  // ── Intro screen (5 seconds) ────────────────────────────────────────────────
  if (!started) {
    const introPct = Math.min(1, introElapsed / INTRO_MS);
    const secsLeft = Math.max(0, Math.ceil((INTRO_MS - introElapsed) / 1000));
    return (
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
             style={{ opacity: Math.min(1, introPct * 4), transform: `scale(${0.85 + introPct * 0.15})`, transition: 'none' }}>
          <div className="text-6xl font-black tracking-[0.2em] text-white drop-shadow-lg">НОВОСТИ</div>
          <div className="text-xs tracking-[0.4em] text-white/40 uppercase">Лидеры нации</div>
          {/* Countdown */}
          <div className="mt-1 text-3xl font-mono font-bold text-red-500/80">{secsLeft > 0 ? secsLeft : ''}</div>
        </div>

        {/* Progress sweep */}
        <div className="absolute bottom-10 left-8 right-8 h-0.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-red-500 transition-none" style={{ width: `${introPct * 100}%` }} />
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
    );
  }

  // ── Finished ────────────────────────────────────────────────────────────────
  if (!item) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 p-6 text-center text-slate-400">
        На этом выпуск новостей окончен. Оставайтесь с нами.
      </div>
    );
  }

  const currentLine = item.lines[lineIdx] ?? '';
  const allLinesShown = lineIdx >= item.lines.length - 1 && subtitleText.length >= currentLine.length;

  return (
    <div className="flex w-full flex-col gap-0 overflow-hidden rounded-2xl bg-slate-900">
      <audio ref={audioRef} crossOrigin="anonymous" />

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
    </div>
  );
}
