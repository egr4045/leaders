import { useEffect, useRef, useState } from 'react';
import type { RoomSnapshot } from '@leaders/shared';
import { Anchor } from './Anchor';

type NewsItem = NonNullable<RoomSnapshot['news']>[number];

/**
 * Плеер сводки (раздел 10): заставка «Новости начинаются», затем по каждой
 * стране — диктор с липсинком, картинка-вставка и текст. Если озвучка не
 * успела сгенериться — фолбэк: текст без звука с таймером.
 */
export function NewsPlayer({ news }: { news: NewsItem[] }) {
  const [stage, setStage] = useState<'intro' | number>('intro');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (stage !== 'intro') return;
    const id = setTimeout(() => setStage(0), 2800);
    return () => clearTimeout(id);
  }, [stage]);

  const idx = typeof stage === 'number' ? stage : -1;
  const item = idx >= 0 && idx < news.length ? news[idx]! : null;

  // запуск озвучки сегмента; без озвучки — текстовый таймер
  useEffect(() => {
    if (!item) return;
    const el = audioRef.current;
    const next = () => setStage((s) => (typeof s === 'number' ? s + 1 : s));
    if (item.audioUrl && el) {
      setAudioEl(el);
      el.src = item.audioUrl;
      el.onended = next;
      void el.play().catch(() => {
        // автоплей заблокирован — фолбэк на таймер
        const id = setTimeout(next, 6000);
        el.onended = null;
        return () => clearTimeout(id);
      });
      return () => {
        el.onended = null;
        el.pause();
      };
    }
    const id = setTimeout(next, 6000);
    return () => clearTimeout(id);
  }, [item]);

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

  return (
    <div className="flex w-full flex-col items-center gap-3 rounded-2xl bg-slate-900 p-5">
      <audio ref={audioRef} crossOrigin="anonymous" />
      <div className="text-xs uppercase tracking-widest text-slate-500">
        выпуск {idx + 1} из {news.length}
      </div>
      <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Anchor audioEl={item.audioUrl ? audioEl : null} />
        <div className="flex-1">
          <h3 className="mb-2 text-2xl font-black text-amber-400">{item.countryName}</h3>
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              className="mb-2 max-h-40 w-full rounded-lg object-cover"
            />
          )}
          <ul className="list-inside list-disc text-sm text-slate-200">
            {item.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          {!item.audioUrl && (
            <div className="mt-2 text-xs text-slate-500">🔇 озвучка не успела — читаем глазами</div>
          )}
        </div>
      </div>
      <button
        onClick={() => setStage(idx + 1)}
        className="text-xs text-slate-500 underline"
      >
        дальше →
      </button>
    </div>
  );
}
