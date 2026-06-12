import type { AdvisorCard } from '@leaders/shared';
import { effectSummary } from '../../lib/effectSummary';

export function CardResultModal({
  card,
  choiceIndex,
  wonderFallback,
  onDone,
}: {
  card: AdvisorCard;
  choiceIndex: number;
  wonderFallback: string | null;
  onDone: () => void;
}) {
  const choice = card.choices[choiceIndex];
  const effects = choice ? effectSummary(choice) : [];
  const directionLabel = choiceIndex === 0 ? '←' : choiceIndex === 1 ? '→' : '↑';

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
          {card.speaker}
        </div>
        <p className="mb-3 text-sm leading-snug text-slate-400">{card.situation}</p>

        <div className="mb-3 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-3">
          <div className="mb-1 text-xs text-slate-500">Вы выбрали {directionLabel}</div>
          <div className="font-semibold">{choice?.label}</div>
        </div>

        {effects.length > 0 && (
          <div className="mb-3">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Эффекты</div>
            <div className="flex flex-wrap gap-1.5">
              {effects.map((e, i) => (
                <span
                  key={i}
                  className={`rounded px-2 py-0.5 text-xs font-mono ${
                    e.startsWith('+') ? 'bg-emerald-900/40 text-emerald-300' :
                    e.startsWith('-') ? 'bg-red-900/40 text-red-300' :
                    'bg-slate-800 text-slate-300'
                  }`}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {wonderFallback && (
          <div className="mb-3 rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 text-sm">
            <div className="mb-0.5 text-xs font-semibold text-amber-400">Чудо уже занято</div>
            <div className="text-slate-300">У вас получился {wonderFallback}. Сочувствуем.</div>
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="w-full max-w-sm rounded-xl bg-amber-500 py-3 font-bold text-slate-950 hover:bg-amber-400"
      >
        Далее →
      </button>
    </div>
  );
}
