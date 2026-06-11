import { useEffect, useState } from 'react';

/** Обратный отсчёт до unix ms; сервер — источник истины. */
export function Timer({ endsAt }: { endsAt: number | null }) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;
  const m = Math.floor(left / 60);
  const s = left % 60;
  return (
    <span className={`tabular-nums font-mono ${left <= 30 ? 'text-red-400' : 'text-slate-300'}`}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}
