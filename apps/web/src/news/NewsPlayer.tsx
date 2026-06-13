import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];


const MS_PER_CHAR = 55;
const FALLBACK_MS = 2800;

function playIntroJingle() {
  try {
    const ctx = new AudioContext();
    // Rising 3-note arpeggio then a held chord
    const arpNotes = [523, 659, 784]; // C5, E5, G5
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
    // Final chord (C major + octave)
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
    // AudioContext not available (e.g. in tests)
  }
}

export function NewsPlayer({ news, isHost = false }: { news: NewsItem[]; isHost?: boolean }) {
  const [stage, setStage] = useState<'intro' | number>('intro');
  const [lineIdx, setLineIdx] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const jinglePlayed = useRef(false);

  // Play intro jingle once on mount
  useEffect(() => {
    if (!jinglePlayed.current) {
      jinglePlayed.current = true;
      playIntroJingle();
    }
  }, []);

  // intro → first item
  useEffect(() => {
    if (stage !== 'intro') return;
    const id = setTimeout(() => {
      setStage(0);
      setLineIdx(0);
    }, 2800);
    return () => clearTimeout(id);
  }, [stage]);

  const idx = typeof stage === 'number' ? stage : -1;
  const item = idx >= 0 && idx < news.length ? news[idx]! : null;

  // typewriter + auto-advance per line
  useEffect(() => {
    if (!item) return;
    const line = item.lines[lineIdx] ?? null;
    if (!line) return;
    setSubtitleText('');

    let charI = 0;
    const iv = setInterval(() => {
      charI++;
      setSubtitleText(line.slice(0, charI));
      if (charI >= line.length) clearInterval(iv);
    }, MS_PER_CHAR);

    const ms = item.audioUrl
      ? Math.max(line.length * MS_PER_CHAR + 600, FALLBACK_MS)
      : FALLBACK_MS;
    const timer = setTimeout(() => {
      if (lineIdx + 1 < item.lines.length) {
        setLineIdx((l) => l + 1);
      }
    }, ms);

    return () => {
      clearInterval(iv);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, idx]);

  // audio playback when country changes
  useEffect(() => {
    if (!item) return;
    const el = audioRef.current;
    if (item.audioUrl && el) {
      setAudioEl(el);
      el.src = item.audioUrl;
      el.onended = null;
      void el.play().catch(() => {});
      return () => {
        el.pause();
        el.onended = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const goNext = () => {
    setAudioEl(null);
    audioRef.current?.pause();
    if (idx + 1 < news.length) {
      setStage(idx + 1);
      setLineIdx(0);
    } else {
      setStage(news.length);
    }
  };

  if (stage === 'intro') {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 p-10">
        <div className="animate-ping text-5xl">🌍</div>
        <div className="animate-pulse text-center text-3xl font-black tracking-widest text-amber-400">
          НОВОСТИ НАЧИНАЮТСЯ
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="w-full rounded-2xl bg-slate-900 p-6 text-center text-slate-400">
        На этом выпуск новостей окончен. Оставайтесь с нами.
      </div>
    );
  }

  const currentLine = item.lines[lineIdx] ?? '';
  const lineProgress = currentLine.length > 0 ? subtitleText.length / currentLine.length : 1;
  const allLinesShown =
    lineIdx >= item.lines.length - 1 && subtitleText.length >= currentLine.length;

  return (
    <div className="flex w-full flex-col gap-0 overflow-hidden rounded-2xl bg-slate-900">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Anchor fill area */}
      <div className="relative w-full" style={{ minHeight: '55vw', maxHeight: '60vh' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <Anchor
            audioEl={item.audioUrl ? audioEl : null}
            currentLine={subtitleText || currentLine}
          />
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25 pointer-events-none"
          />
        )}
        {/* Country + episode label */}
        <div className="absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-widest text-amber-400">
          {item.countryName} — выпуск {idx + 1}/{news.length}
        </div>
        {/* Subtitles */}
        {subtitleText && (
          <div className="absolute bottom-12 left-0 right-0 px-4 text-center">
            <span className="rounded bg-slate-950/80 px-2 py-1 text-lg font-bold leading-relaxed text-white drop-shadow-lg">
              {subtitleText}
            </span>
          </div>
        )}
        {/* Host: skip / next */}
        {isHost && allLinesShown && (
          <button
            onClick={goNext}
            className="absolute bottom-3 right-3 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            {idx + 1 < news.length ? 'Следующая страна →' : 'Завершить выпуск ✓'}
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
          style={{ width: `${lineProgress * 100}%` }}
        />
      </div>

    </div>
  );
}
