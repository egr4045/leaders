import { useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import type { AdvisorCard } from '@leaders/shared';

const SWIPE_PX = 110;

export function SwipeCard({
  card,
  onChoose,
}: {
  card: AdvisorCard;
  onChoose: (choiceIndex: number) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const [busy, setBusy] = useState(false);

  const leftOpacity = useTransform(x, [-SWIPE_PX, -30], [1, 0]);
  const rightOpacity = useTransform(x, [30, SWIPE_PX], [0, 1]);
  const upOpacity = useTransform(y, [-SWIPE_PX, -30], [1, 0]);

  const choose = (i: number) => {
    if (busy || !card.choices[i]) return;
    setBusy(true);
    onChoose(i);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { x: dx, y: dy } = info.offset;
    if (card.choices[2] && dy < -SWIPE_PX && Math.abs(dx) < SWIPE_PX) return choose(2);
    if (dx < -SWIPE_PX) return choose(0);
    if (dx > SWIPE_PX) return choose(1);
  };

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <motion.div
        key={card.id}
        drag={!busy}
        dragSnapToOrigin
        onDragEnd={onDragEnd}
        style={{ x, y, rotate }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm cursor-grab touch-none select-none rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl active:cursor-grabbing"
      >
        <motion.div style={{ opacity: leftOpacity }} className="absolute left-3 top-3 rounded bg-red-500/90 px-2 py-1 text-xs font-bold">
          ← {card.choices[0]?.label}
        </motion.div>
        <motion.div style={{ opacity: rightOpacity }} className="absolute right-3 top-3 rounded bg-emerald-500/90 px-2 py-1 text-xs font-bold">
          {card.choices[1]?.label} →
        </motion.div>
        {card.choices[2] && (
          <motion.div style={{ opacity: upOpacity }} className="absolute left-1/2 top-3 -translate-x-1/2 rounded bg-sky-500/90 px-2 py-1 text-xs font-bold">
            ↑ {card.choices[2].label}
          </motion.div>
        )}

        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
          {card.speaker}
        </div>
        <p className="min-h-28 text-lg leading-snug">{card.situation}</p>
        <div className="mt-3 text-center text-xs text-slate-500">
          свайп ← → {card.choices[2] ? '↑' : ''} или кнопки ниже
        </div>
      </motion.div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {card.choices.map((c, i) => (
          <button
            key={i}
            disabled={busy}
            onClick={() => choose(i)}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-left text-sm transition-colors hover:border-amber-400 disabled:opacity-40"
          >
            <span className="mr-2 text-slate-500">{i === 0 ? '←' : i === 1 ? '→' : '↑'}</span>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
