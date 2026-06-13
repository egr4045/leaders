import { useEffect, useState } from 'react';
import { adminApi, type CountryEntry } from './api';

const SECTORS: [string, string][] = [
  ['economy', 'Экономика'],
  ['science', 'Наука'],
  ['army', 'Армия'],
  ['smi', 'СМИ'],
  ['intel', 'Разведка'],
];
const RESOURCES: [string, string][] = [
  ['money', 'Деньги'],
  ['gold', 'Золото'],
  ['food', 'Еда'],
  ['influence', 'Влияние'],
];
const POPULATION: [string, string][] = [
  ['rabotyagi', 'Работяги'],
  ['umniki', 'Умники'],
  ['siloviki', 'Силовики'],
  ['mediyshchiki', 'Медийщ.'],
  ['ministry', 'Министры'],
];

function csv(v?: string[]): string {
  return (v ?? []).join(', ');
}
function parseCsv(text: string): string[] {
  return text.split(',').map((x) => x.trim()).filter(Boolean);
}

function NumRecGrid({
  title,
  fields,
  values,
  max,
  onChange,
}: {
  title: string;
  fields: [string, string][];
  values: Record<string, number>;
  max?: number;
  onChange: (next: Record<string, number>) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{title}</div>
      <div className="grid grid-cols-5 gap-1">
        {fields.map(([key, label]) => (
          <label key={key} className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] text-slate-500">{label}</span>
            <input
              type="number"
              min={0}
              max={max}
              value={values[key] ?? 0}
              onChange={(e) => onChange({ ...values, [key]: Number(e.target.value) })}
              className="w-full rounded bg-slate-900 px-1 py-1 text-center text-xs text-slate-200 focus:outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function CountryRow({ country, onSaved }: { country: CountryEntry; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CountryEntry>(() => ({ ...country }));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const set = (patch: Partial<CountryEntry>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await adminApi.updateCountry(country.id, draft as unknown as Record<string, unknown>);
      setMsg('✓ сохранено — нажми «Применить» вверху');
      onSaved();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-800/50"
      >
        <div>
          <span className="font-semibold">{String(draft.name)}</span>
          <span className="ml-2 font-mono text-xs text-slate-500">{country.id}</span>
        </div>
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-800 p-3 text-sm">
          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-slate-400">Название</span>
            <input
              value={String(draft.name ?? '')}
              onChange={(e) => set({ name: e.target.value })}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 focus:outline-none"
            />
          </label>

          <NumRecGrid
            title="Стартовые секторы (0–10)"
            fields={SECTORS}
            max={10}
            values={(draft.startSectors ?? {}) as Record<string, number>}
            onChange={(v) => set({ startSectors: v })}
          />
          <NumRecGrid
            title="Стартовые ресурсы"
            fields={RESOURCES}
            values={(draft.startResources ?? {}) as Record<string, number>}
            onChange={(v) => set({ startResources: v })}
          />
          <NumRecGrid
            title="Стартовое население"
            fields={POPULATION}
            values={(draft.startPopulation ?? {}) as Record<string, number>}
            onChange={(v) => set({ startPopulation: v })}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-emerald-300">Стартовые статусы (id через запятую)</span>
              <input
                value={csv(draft.startStatuses)}
                onChange={(e) => set({ startStatuses: parseCsv(e.target.value) })}
                placeholder="напр. regime_kommunizm"
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Уникальные перки</span>
              <input
                value={csv(draft.uniquePerks)}
                onChange={(e) => set({ uniquePerks: parseCsv(e.target.value) })}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Уникальные слабости</span>
              <input
                value={csv(draft.uniqueWeaknesses)}
                onChange={(e) => set({ uniqueWeaknesses: parseCsv(e.target.value) })}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Эксклюзивные чудеса</span>
              <input
                value={csv(draft.exclusiveWonders)}
                onChange={(e) => set({ exclusiveWonders: parseCsv(e.target.value) })}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-0.5 text-xs">
            <span className="text-slate-400">Заметка (подсказка в лобби)</span>
            <textarea
              value={String(draft.notes ?? '')}
              onChange={(e) => set({ notes: e.target.value })}
              rows={2}
              className="resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {saving ? 'Сохраняю…' : 'Сохранить страну'}
            </button>
            {msg && <span className="text-xs text-amber-400">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function CountryEditor() {
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setCountries(await adminApi.getCountries());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-slate-500">
        {countries.length} стран · правки применяются в игре после кнопки «🔄 Применить» (новые партии стартуют с новыми настройками)
      </div>
      {error && <div className="rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-300">{error}</div>}
      {countries.map((c) => (
        <CountryRow key={c.id} country={c} onSaved={load} />
      ))}
    </div>
  );
}
