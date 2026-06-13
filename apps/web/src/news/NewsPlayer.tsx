import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];

interface ReadLine {
  countryName: string;
  text: string;
}

const MS_PER_CHAR = 55;
const FALLBACK_MS = 2800;

export function NewsPlayer({ news, isHost = false }: { news: NewsItem[]; isHost?: boolean }) {
  const [stage, setStage] = useState<'intro' | number>('intro');
  const [lineIdx, setLineIdx] = useState(0);
  const [subtitleText, setSubtitleText] = useState('');
  const [readLog, setReadLog] = useState<ReadLine[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // intro → first item
  useEffect(() => {
    if (stage !== 'intro') return;
    const id = setTimeout(() => { setStage(0); setLineIdx(0); }, 2800);
    return () => clearTimeout(id);
  }, [stage]);

  const idx = typeof stage === 'number' ? stage : -1;
  const item = idx >= 0 && idx < news.length ? news[idx]! : null;

  // когда меняется страна или строка — обновляем субтитр и таймер
  useEffect(() => {
    if (!item) return;
    const line = item.lines[lineIdx] ?? null;
    if (!line) return;
    setSubtitleText('');

    let charI = 0;
    const delay = MS_PER_CHAR;
    const iv = setInterval(() => {
      charI++;
      setSubtitleText(line.slice(0, charI));
      if (charI >= line.length) clearInterval(iv);
    }, delay);

    const ms = item.audioUrl ? Math.max(line.length * MS_PER_CHAR + 600, FALLBACK_MS) : FALLBACK_MS;
    const timer = setTimeout(() => {
      setReadLog((prev) => [...prev, { countryName: item.countryName, text: line }]);
      if (lineIdx + 1 < item.lines.length) {
        setLineIdx((l) => l + 1);
      }
    }, ms);

    return () => { clearInterval(iv); clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, idx]);

  // запуск аудио при смене страны
  useEffect(() => {
    if (!item) return;
    const el = audioRef.current;
    if (item.audioUrl && el) {
      setAudioEl(el);
      el.src = item.audioUrl;
      el.onended = null;
      void el.play().catch(() => {});
      return () => { el.pause(); el.onended = null; };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // автоскролл лога
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [readLog]);

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

  const allLinesShown = lineIdx >= item.lines.length - 1 && subtitleText.length >= (item.lines[lineIdx] ?? '').length;

  return (
    <div className="flex w-full flex-col gap-0 overflow-hidden rounded-2xl bg-slate-900">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Диктор на весь экран с субтитрами */}
      <div className="relative w-full" style={{ minHeight: '55vw', maxHeight: '60vh' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
          <Anchor audioEl={item.audioUrl ? audioEl : null} />
        </div>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        {/* Оверлей: страна + выпуск */}
        <div className="absolute left-3 top-3 rounded bg-slate-950/70 px-2 py-1 text-xs uppercase tracking-widest text-amber-400">
          {item.countryName} — выпуск {idx + 1}/{news.length}
        </div>
        {/* Субтитры */}
        {subtitleText && (
          <div className="absolute bottom-12 left-0 right-0 px-4 text-center">
            <span className="rounded bg-slate-950/80 px-2 py-1 text-lg font-bold leading-relaxed text-white drop-shadow-lg">
              {subtitleText}
            </span>
          </div>
        )}
        {/* Кнопка «дальше» — только хост */}
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

      {/* Лог прочитанных новостей */}
      {readLog.length > 0 && (
        <div className="max-h-36 overflow-y-auto border-t border-slate-800 p-3">
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-600">Прочитано</div>
          <ul className="flex flex-col gap-1">
            {readLog.map((l, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-400">
                <span className="shrink-0 font-semibold text-amber-500">{l.countryName}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
