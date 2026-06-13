import { useEffect, useState } from 'react';
import { adminApi, type TunablesTimers } from './api';

const FIELDS: { key: keyof TunablesTimers; label: string }[] = [
  { key: 'cabinetSeconds', label: 'Кабинет (раунд)' },
  { key: 'unSummarySeconds', label: 'ООН: сводка новостей' },
  { key: 'unCommentSecondsPerPlayer', label: 'ООН: комментарий на игрока' },
  { key: 'unDebateSeconds', label: 'ООН: дебаты' },
  { key: 'unVoteSeconds', label: 'ООН: голосование' },
  { key: 'resultsSeconds', label: 'Итоги года' },
  { key: 'yearSummarySeconds', label: 'Сводка года' },
  { key: 'reconnectPauseSecondsMax', label: 'Макс. пауза на реконнект' },
];

// Быстрый тест: всё короткое, чтобы прогонять год за пару минут.
const FAST_PRESET: TunablesTimers = {
  cabinetSeconds: 30,
  unSummarySeconds: 8,
  unCommentSecondsPerPlayer: 12,
  unDebateSeconds: 20,
  unVoteSeconds: 15,
  resultsSeconds: 10,
  yearSummarySeconds: 12,
  reconnectPauseSecondsMax: 60,
};

export function TimersPanel() {
  const [timers, setTimers] = useState<TunablesTimers | null>(null);
  const [years, setYears] = useState(5);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const t = await adminApi.getTunables();
      setTimers(t.timers);
      setYears(t.game.years);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (next: TunablesTimers, nextYears: number) => {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await adminApi.updateTunables({ timers: next, game: { years: nextYears } });
      setTimers(next);
      setYears(nextYears);
      setMsg('✓ Сохранено и применено. Действует со следующей фазы (текущий отсчёт не сократится).');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!timers) {
    return <div className="py-10 text-center text-slate-500">{error || 'Загрузка…'}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => void save(FAST_PRESET, years)}
          disabled={saving}
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40"
        >
          ⚡ Быстрый тест (короткие таймеры)
        </button>
        <button
          onClick={() => void load()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          Сбросить к текущим
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/10 px-3 py-2 text-sm">
          <span className="text-amber-200">Лет в партии</span>
          <input
            type="number"
            min={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right"
          />
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm">
            <span className="text-slate-300">{f.label}</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={timers[f.key]}
                onChange={(e) => setTimers({ ...timers, [f.key]: Number(e.target.value) })}
                className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right"
              />
              <span className="text-xs text-slate-600">сек</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => void save(timers, years)}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {saving ? 'Сохраняю…' : 'Сохранить и применить'}
        </button>
        {msg && <span className="text-sm text-emerald-300">{msg}</span>}
        {error && <span className="text-sm text-red-300">{error}</span>}
      </div>

      <p className="text-xs text-slate-600">
        Применяется горячо (без рестарта) — правит content/tunables.json и перезагружает контент.
        Влияет на новые фазы и новые комнаты; уже идущий отсчёт не сокращается (убей и пересоздай комнату для мгновенного эффекта).
      </p>
    </div>
  );
}
