import { useState, useCallback } from 'react';
import type { PrivateCountryView } from '@leaders/shared';
import { SocketEvents } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

const SECTOR_NAMES: Record<string, string> = {
  economy: 'Экономика',
  science: 'Наука',
  army: 'Армия',
  smi: 'СМИ',
  intel: 'Разведка',
};
const SECTOR_KEYS = ['economy', 'science', 'army', 'smi', 'intel'] as const;

export function BudgetPanel({ you }: { you: PrivateCountryView }) {
  const { emitRaw } = useGame();
  const [alloc, setAlloc] = useState<Record<string, number>>(() =>
    Object.fromEntries(SECTOR_KEYS.map((k) => [k, 0])),
  );
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const income = you.projection?.moneyIncome ?? 0;
  const used = Object.values(alloc).reduce((a, b) => a + b, 0);
  const reserve = Math.max(0, 100 - used);

  const setSlider = useCallback((key: string, value: number) => {
    setAlloc((prev) => {
      const next = { ...prev, [key]: value };
      const total = Object.values(next).reduce((a, b) => a + b, 0);
      if (total > 100) {
        // clamp: scale others down proportionally
        const excess = total - 100;
        const others = Object.entries(next).filter(([k]) => k !== key);
        const othersTotal = others.reduce((a, [, v]) => a + v, 0);
        if (othersTotal > 0) {
          for (const [k] of others) {
            next[k] = Math.max(0, Math.round((next[k]! - (next[k]! / othersTotal) * excess)));
          }
        }
      }
      return next;
    });
    setSaved(false);
  }, []);

  const save = async () => {
    setSaving(true);
    await emitRaw(SocketEvents.CabinetSetBudget, { budget: alloc });
    setSaved(true);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Распределение бюджета</div>
        {income > 0 && (
          <div className="text-xs text-slate-400">
            Доход: ~{income} ден.
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-col gap-2.5">
        {SECTOR_KEYS.map((key) => {
          const pct = alloc[key] ?? 0;
          const amount = income > 0 ? Math.round(income * pct / 100) : 0;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-300">{SECTOR_NAMES[key]}</span>
                <span className="font-mono text-slate-400">
                  {pct}%{income > 0 && amount > 0 && <span className="ml-1 text-amber-400">= {amount} ден.</span>}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={pct}
                onChange={(e) => setSlider(key, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-amber-500"
              />
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
        <span className="text-slate-400">В казну (резерв)</span>
        <span className="font-mono font-bold text-slate-200">
          {reserve}%{income > 0 && reserve > 0 && (
            <span className="ml-1 text-xs text-slate-400">= {Math.round(income * reserve / 100)} ден.</span>
          )}
        </span>
      </div>

      <button
        onClick={() => void save()}
        disabled={saving}
        className={`w-full rounded-xl py-2 text-sm font-bold transition-colors ${
          saved
            ? 'bg-emerald-700 text-white'
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50'
        }`}
      >
        {saving ? 'Сохраняю…' : saved ? '✓ Сохранено' : 'Сохранить распределение'}
      </button>
      <p className="mt-1.5 text-xs text-slate-600">
        Инвестиции накапливаются; при достижении порога сектор вырастет на уровень.
      </p>
    </div>
  );
}
