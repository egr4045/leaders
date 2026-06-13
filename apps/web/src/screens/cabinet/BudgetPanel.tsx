import { useState, useCallback, useEffect } from 'react';
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

const SECTOR_COLORS: Record<string, string> = {
  economy: 'bg-emerald-500',
  science: 'bg-blue-500',
  army: 'bg-red-500',
  smi: 'bg-purple-500',
  intel: 'bg-amber-500',
};

const SECTOR_KEYS = ['economy', 'science', 'army', 'smi', 'intel'] as const;

export function BudgetPanel({ you }: { you: PrivateCountryView }) {
  const { emitRaw } = useGame();
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    const savedBudget = you.budget ?? {};
    return Object.fromEntries(SECTOR_KEYS.map((k) => [k, savedBudget[k] ?? 0]));
  });
  const [saving, setSaving] = useState(false);

  const income = you.projection?.moneyIncome ?? 0;
  const used = Object.values(alloc).reduce((a, b) => a + b, 0);
  const reserve = Math.max(0, 100 - used);

  const setSlider = useCallback((key: string, value: number) => {
    setAlloc((prev) => {
      const othersSum = Object.entries(prev)
        .filter(([k]) => k !== key)
        .reduce((a, [, v]) => a + v, 0);
      const clamped = Math.min(value, Math.max(0, 100 - othersSum));
      return { ...prev, [key]: clamped };
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setSaving(true);
      emitRaw(SocketEvents.CabinetSetBudget, { budget: alloc }).then(() => setSaving(false));
    }, 400);
    return () => clearTimeout(t);
  }, [alloc, emitRaw]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Распределение бюджета</div>
        {income > 0 && (
          <div className="text-xs text-slate-400">Доход: ~{income} ден.</div>
        )}
      </div>

      {/* Allocation bar */}
      <div className="mb-1 flex h-4 w-full overflow-hidden rounded-lg">
        {SECTOR_KEYS.map((key) => {
          const pct = alloc[key] ?? 0;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              title={`${SECTOR_NAMES[key]}: ${pct}%`}
              className={`h-full transition-all duration-200 ${SECTOR_COLORS[key]}`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
        {reserve > 0 && (
          <div
            className="h-full bg-slate-700 transition-all duration-200"
            style={{ width: `${reserve}%` }}
          />
        )}
      </div>
      {reserve === 0 && (
        <div className="mb-2 text-center text-xs text-amber-500">🔒 Бюджет распределён полностью</div>
      )}

      <div className="mb-3 flex flex-col gap-2.5 mt-3">
        {SECTOR_KEYS.map((key) => {
          const pct = alloc[key] ?? 0;
          const amount = income > 0 ? Math.round((income * pct) / 100) : 0;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className={`inline-block h-2 w-2 rounded-full ${SECTOR_COLORS[key]}`} />
                  {SECTOR_NAMES[key]}
                </span>
                <span className="font-mono text-slate-400">
                  {pct}%
                  {income > 0 && amount > 0 && (
                    <span className="ml-1 text-amber-400">= {amount} ден.</span>
                  )}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pct}
                onChange={(e) => setSlider(key, Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-amber-500 hover:accent-amber-400"
              />
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm">
        <span className="text-slate-400">В казну (резерв)</span>
        <span className="font-mono font-bold text-slate-200">
          {reserve}%
          {income > 0 && reserve > 0 && (
            <span className="ml-1 text-xs text-slate-400">= {Math.round((income * reserve) / 100)} ден.</span>
          )}
        </span>
      </div>

      <div className="mt-2 text-center text-xs text-slate-500">
        {saving ? 'Сохранение...' : '✓ Изменения сохранены'}
      </div>
      <p className="mt-1.5 text-xs text-slate-600">
        Инвестиции накапливаются; при достижении порога сектор вырастет на уровень.
      </p>
    </div>
  );
}
