import { useState } from 'react';
import type { StatusEntry } from './api';
import { adminApi } from './api';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  state: { label: 'Состояние', color: 'bg-slate-700 text-slate-300' },
  law: { label: 'Закон', color: 'bg-blue-900/50 text-blue-300' },
  tech: { label: 'Технология', color: 'bg-cyan-900/50 text-cyan-300' },
  regime: { label: 'Режим', color: 'bg-red-900/50 text-red-300' },
  wonder: { label: 'Чудо', color: 'bg-amber-900/50 text-amber-300' },
};

const TYPE_ORDER = ['law', 'tech', 'regime', 'wonder', 'state'];

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
const SECTORS: [string, string][] = [
  ['economy', 'Эконом.'],
  ['science', 'Наука'],
  ['army', 'Армия'],
  ['smi', 'СМИ'],
  ['intel', 'Развед.'],
];
const MOD_SCALARS: [string, string][] = [
  ['scienceMult', 'Множ. науки (доля)'],
  ['inflationDelta', '± инфляция (доля)'],
  ['dovolstvoDrift', 'Дрейф довольства/год'],
  ['foodPerCapitaMult', 'Множ. еды/душу'],
  ['forbesLegacy', 'Форбс-легаси'],
];

type Raw = Record<string, unknown>;

// ---------- утилиты вложенного редактирования с авто-очисткой пустых веток ----------
function getIn(obj: Raw, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur && typeof cur === 'object') cur = (cur as Raw)[k];
    else return undefined;
  }
  return cur;
}
function setIn(obj: Raw, path: string[], value: unknown): Raw {
  const head = path[0];
  if (head === undefined) return obj;
  const rest = path.slice(1);
  const next: Raw = { ...obj };
  if (rest.length === 0) {
    if (value === undefined || value === '' || (typeof value === 'number' && Number.isNaN(value))) delete next[head];
    else next[head] = value;
    return next;
  }
  const child = setIn((obj[head] as Raw) ?? {}, rest, value);
  if (child && typeof child === 'object' && Object.keys(child).length === 0) delete next[head];
  else next[head] = child;
  return next;
}

function NumGrid({
  title,
  fields,
  basePath,
  draft,
  onChange,
}: {
  title: string;
  fields: [string, string][];
  basePath: string[];
  draft: Raw;
  onChange: (d: Raw) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{title}</div>
      <div className="grid grid-cols-5 gap-1">
        {fields.map(([key, label]) => {
          const v = getIn(draft, [...basePath, key]);
          return (
            <label key={key} className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-500">{label}</span>
              <input
                type="number"
                step="any"
                value={v === undefined ? '' : String(v)}
                onChange={(e) =>
                  onChange(setIn(draft, [...basePath, key], e.target.value === '' ? undefined : Number(e.target.value)))
                }
                className="w-full rounded bg-slate-900 px-1 py-1 text-center text-xs text-slate-200 focus:outline-none"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ModifiersForm({
  basePath,
  draft,
  onChange,
}: {
  basePath: string[];
  draft: Raw;
  onChange: (d: Raw) => void;
}) {
  const special = getIn(draft, [...basePath, 'special']);
  const [specialJson, setSpecialJson] = useState(special ? JSON.stringify(special) : '');
  const [specialErr, setSpecialErr] = useState('');

  const applySpecial = (text: string) => {
    setSpecialJson(text);
    if (!text.trim()) {
      setSpecialErr('');
      onChange(setIn(draft, [...basePath, 'special'], undefined));
      return;
    }
    try {
      const parsed = JSON.parse(text) as Raw;
      setSpecialErr('');
      onChange(setIn(draft, [...basePath, 'special'], parsed));
    } catch {
      setSpecialErr('невалидный JSON');
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded bg-slate-850 border border-slate-700 p-2">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {MOD_SCALARS.map(([key, label]) => {
          const v = getIn(draft, [...basePath, key]);
          return (
            <label key={key} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">{label}</span>
              <input
                type="number"
                step="any"
                value={v === undefined ? '' : String(v)}
                onChange={(e) =>
                  onChange(setIn(draft, [...basePath, key], e.target.value === '' ? undefined : Number(e.target.value)))
                }
                className="w-24 rounded bg-slate-900 px-1.5 py-1 text-right text-slate-200 focus:outline-none"
              />
            </label>
          );
        })}
      </div>
      <NumGrid title="Множители выработки классов (1 = без изм.)" fields={POPULATION} basePath={[...basePath, 'outputMult']} draft={draft} onChange={onChange} />
      <NumGrid title="Эмиграция классов (доля/год)" fields={POPULATION} basePath={[...basePath, 'emigration']} draft={draft} onChange={onChange} />
      <label className="flex flex-col gap-0.5 text-xs">
        <span className="text-slate-400">special (именованные хуки, JSON: {`{"inflationImmunity":true}`})</span>
        <input
          value={specialJson}
          onChange={(e) => applySpecial(e.target.value)}
          placeholder='{"ministerUpkeepMult":0.5}'
          className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
        />
        {specialErr && <span className="text-red-400">{specialErr}</span>}
      </label>
    </div>
  );
}

function csv(v: unknown): string {
  return Array.isArray(v) ? (v as string[]).join(', ') : '';
}
function parseCsv(text: string): string[] | undefined {
  const arr = text.split(',').map((x) => x.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

function StatusRow({ status, onUpdate }: { status: StatusEntry; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Raw>(() => ({ ...(status as unknown as Raw) }));
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [editJson, setEditJson] = useState('');

  const typeMeta = TYPE_LABELS[status.type] ?? { label: status.type, color: 'bg-slate-700 text-slate-300' };
  const isWonder = draft.type === 'wonder';
  const isRegime = draft.type === 'regime';
  const isLaw = draft.type === 'law';

  const set = (path: string[], value: unknown) => setDraft((d) => setIn(d, path, value));

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      await adminApi.replaceStatus(status.id, draft);
      setMsg('✓ сохранено — нажми «Применить» вверху');
      onUpdate();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveJson = async () => {
    try {
      const data = JSON.parse(editJson) as Raw;
      await adminApi.replaceStatus(status.id, data);
      setDraft(data);
      setMsg('✓ сохранено');
      onUpdate();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-slate-800/50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{status.id}</span>
            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${typeMeta.color}`}>{typeMeta.label}</span>
            {!!draft.auto && <span className="rounded bg-emerald-900/40 px-1 py-0.5 text-xs text-emerald-400">авто</span>}
          </div>
          <div className="mt-0.5 text-sm font-semibold">{String(draft.name ?? status.name)}</div>
          {!!draft.description && <div className="mt-0.5 truncate text-xs text-slate-400">{String(draft.description)}</div>}
        </div>
        <span className="text-slate-500 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-slate-800 p-3 text-sm">
          {/* Базовое */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Название</span>
              <input
                value={String(draft.name ?? '')}
                onChange={(e) => set(['name'], e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Описание</span>
              <textarea
                value={String(draft.description ?? '')}
                onChange={(e) => set(['description'], e.target.value || undefined)}
                rows={2}
                className="resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1">
                <span className="text-slate-400">Группа исключения</span>
                <input
                  value={String(draft.exclusiveGroup ?? '')}
                  onChange={(e) => set(['exclusiveGroup'], e.target.value || undefined)}
                  placeholder="regime"
                  className="w-28 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-slate-200 focus:outline-none"
                />
              </label>
              {isLaw && (
                <label className="flex items-center gap-1">
                  <span className="text-slate-400">Мин. министров</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.minMinistry === undefined ? '' : String(draft.minMinistry)}
                    onChange={(e) => set(['minMinistry'], e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-16 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-slate-200 focus:outline-none"
                  />
                </label>
              )}
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(draft.revocable)}
                  onChange={(e) => set(['revocable'], e.target.checked || undefined)}
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-slate-400">Отменяемый</span>
              </label>
              {isRegime && (
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.mediaIsLiberal)}
                    onChange={(e) => set(['mediaIsLiberal'], e.target.checked || undefined)}
                    className="h-4 w-4 accent-sky-500"
                  />
                  <span className="text-slate-400">Свободные СМИ (либеральные)</span>
                </label>
              )}
            </div>
          </div>

          {/* Эффекты (пока активен у владельца) */}
          <div className="rounded-lg border border-slate-700 p-2">
            <div className="mb-1 text-xs font-bold text-slate-300">Эффекты (пока статус активен)</div>
            <div className="flex flex-col gap-2">
              <NumGrid title="Ресурсы ±" fields={RESOURCES} basePath={['effects', 'resources']} draft={draft} onChange={setDraft} />
              <NumGrid title="Население ±" fields={POPULATION} basePath={['effects', 'population']} draft={draft} onChange={setDraft} />
              <NumGrid title="Секторы ±" fields={SECTORS} basePath={['effects', 'sectors']} draft={draft} onChange={setDraft} />
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Довольство ± (пунктов)</span>
                <input
                  type="number"
                  step="any"
                  value={getIn(draft, ['effects', 'dovolstvo']) === undefined ? '' : String(getIn(draft, ['effects', 'dovolstvo']))}
                  onChange={(e) => set(['effects', 'dovolstvo'], e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-24 rounded bg-slate-900 px-1.5 py-1 text-right text-slate-200 focus:outline-none"
                />
              </label>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Постоянные модификаторы</div>
                <ModifiersForm basePath={['effects', 'modifiers']} draft={draft} onChange={setDraft} />
              </div>
            </div>
          </div>

          {/* globalEffects — аура на чужие страны */}
          <div className={`rounded-lg border p-2 ${isWonder ? 'border-amber-700/50 bg-amber-950/10' : 'border-slate-700'}`}>
            <div className="mb-1 text-xs font-bold text-amber-300">
              Глобальная аура {isWonder && '🏛'}
              <span className="ml-1 font-normal text-slate-400">— действует на ВСЕ ЧУЖИЕ страны каждый год</span>
            </div>
            <div className="flex flex-col gap-2">
              <NumGrid title="Секторы чужих ±" fields={SECTORS} basePath={['globalEffects', 'sectors']} draft={draft} onChange={setDraft} />
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">Модификаторы чужих</div>
                <ModifiersForm basePath={['globalEffects', 'modifiers']} draft={draft} onChange={setDraft} />
              </div>
              <p className="text-[11px] text-slate-600">
                Пример: YouTube ставит чужим СМИ либеральные через special {`{"forceLiberalMedia":true}`}; АЭС душит чужую выработку работяг через outputMult 0.95.
              </p>
            </div>
          </div>

          {/* Условия / связи */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Требует статусы (id через запятую)</span>
              <input
                value={csv(getIn(draft, ['requires', 'statuses']))}
                onChange={(e) => set(['requires', 'statuses'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Требует условия движка</span>
              <input
                value={csv(getIn(draft, ['requires', 'conditions']))}
                onChange={(e) => set(['requires', 'conditions'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Открывает карточки</span>
              <input
                value={csv(getIn(draft, ['unlocks', 'advisorCards']))}
                onChange={(e) => set(['unlocks', 'advisorCards'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Открывает статусы</span>
              <input
                value={csv(getIn(draft, ['unlocks', 'statuses']))}
                onChange={(e) => set(['unlocks', 'statuses'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Блокирует карточки</span>
              <input
                value={csv(getIn(draft, ['locks', 'advisorCards']))}
                onChange={(e) => set(['locks', 'advisorCards'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-slate-400">Блокирует статусы</span>
              <input
                value={csv(getIn(draft, ['locks', 'statuses']))}
                onChange={(e) => set(['locks', 'statuses'], parseCsv(e.target.value))}
                className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
              />
            </label>
          </div>

          {isLaw && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Цена: деньги</span>
                <input
                  type="number"
                  value={getIn(draft, ['cost', 'money']) === undefined ? '' : String(getIn(draft, ['cost', 'money']))}
                  onChange={(e) => set(['cost', 'money'], e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-24 rounded bg-slate-900 px-1.5 py-1 text-right text-slate-200 focus:outline-none"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Цена: влияние</span>
                <input
                  type="number"
                  value={getIn(draft, ['cost', 'influence']) === undefined ? '' : String(getIn(draft, ['cost', 'influence']))}
                  onChange={(e) => set(['cost', 'influence'], e.target.value === '' ? undefined : Number(e.target.value))}
                  className="w-24 rounded bg-slate-900 px-1.5 py-1 text-right text-slate-200 focus:outline-none"
                />
              </label>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="rounded bg-emerald-600 px-4 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {saving ? 'Сохраняю…' : 'Сохранить статус'}
            </button>
            <button
              onClick={() => {
                setShowJson(!showJson);
                if (!showJson) setEditJson(JSON.stringify(draft, null, 2));
              }}
              className="rounded border border-slate-700 px-2 py-1.5 text-xs text-slate-400 hover:border-amber-400"
            >
              {showJson ? 'Скрыть JSON' : 'Сырой JSON'}
            </button>
            {msg && <span className="text-xs text-amber-400">{msg}</span>}
          </div>

          {showJson && (
            <div>
              <textarea
                value={editJson}
                onChange={(e) => setEditJson(e.target.value)}
                rows={12}
                className="w-full rounded bg-slate-800 p-2 font-mono text-xs text-slate-300 focus:outline-none"
              />
              <button onClick={() => void saveJson()} className="mt-1 rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                Сохранить JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeSection({
  typeKey,
  statuses,
  onUpdate,
}: {
  typeKey: string;
  statuses: StatusEntry[];
  onUpdate: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const typeMeta: { label: string; color: string } = TYPE_LABELS[typeKey] ?? {
    label: typeKey,
    color: 'bg-slate-700 text-slate-300',
  };
  return (
    <div className="mb-4">
      <button onClick={() => setCollapsed(!collapsed)} className="mb-2 flex w-full items-center gap-2 text-left">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${typeMeta.color}`}>{typeMeta.label}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">{statuses.length} шт.</span>
        <span className="ml-auto text-xs text-slate-500">{collapsed ? '▼ развернуть' : '▲ свернуть'}</span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {statuses.map((s) => (
            <StatusRow key={s.id} status={s} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusEditor({ statuses, onRefresh }: { statuses: StatusEntry[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [effectFilter, setEffectFilter] = useState<string | null>(null);

  const textFiltered = statuses.filter(
    (s) =>
      !filter ||
      s.id.includes(filter) ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  const effectFiltered = effectFilter === null 
    ? textFiltered 
    : textFiltered.filter((s) => {
        // Проверяем сырой JSON на наличие сектора в effects.sectors
        const sectors = (s as unknown as Record<string, any>).effects?.sectors ?? {};
        if (effectFilter === 'economy') return typeof sectors.economy === 'number';
        if (effectFilter === 'science') return typeof sectors.science === 'number';
        if (effectFilter === 'army') return typeof sectors.army === 'number';
        if (effectFilter === 'smi') return typeof sectors.smi === 'number';
        if (effectFilter === 'intel') return typeof sectors.intel === 'number';
        if (effectFilter === 'dovolstvo') return typeof (s as unknown as Record<string, any>).effects?.dovolstvo === 'number' || typeof (s as unknown as Record<string, any>).effects?.modifiers?.dovolstvoDrift === 'number';
        return true;
      });

  const displayed = typeFilter ? effectFiltered.filter((s) => s.type === typeFilter) : effectFiltered;

  const knownTypes = TYPE_ORDER.filter((t) => statuses.some((s) => s.type === t));
  const extraTypes = Array.from(new Set(statuses.filter((s) => !TYPE_ORDER.includes(s.type)).map((s) => s.type)));
  const allTypes = [...knownTypes, ...extraTypes];

  const groups = allTypes
    .map((t) => ({ type: t, items: displayed.filter((s) => s.type === t) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Поиск по id, названию, описанию…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setTypeFilter(null)}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            typeFilter === null ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Все ({statuses.length})
        </button>
        {allTypes.map((t) => {
          const count = statuses.filter((s) => s.type === t).length;
          if (!count) return null;
          const m: { label: string; color: string } = TYPE_LABELS[t] ?? { label: t, color: '' };
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
                typeFilter === t ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {m.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1 mt-1">
        <span className="text-xs text-slate-500 py-1 mr-2">Влияет на:</span>
        {[
          { key: null, label: 'Все' },
          { key: 'economy', label: '💰 Экономика' },
          { key: 'science', label: '🔬 Наука' },
          { key: 'army', label: '⚔️ Армия' },
          { key: 'smi', label: '📺 СМИ' },
          { key: 'intel', label: '🕵️ Разведка' },
          { key: 'dovolstvo', label: '😊 Довольство' },
        ].map(({ key, label }) => (
          <button
            key={key ?? 'all'}
            onClick={() => setEffectFilter(key)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
              effectFilter === key ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-500">{displayed.length} статусов · разверни статус для структурного редактора</div>

      {typeFilter !== null ? (
        <div className="flex flex-col gap-2">
          {displayed.map((s) => (
            <StatusRow key={s.id} status={s} onUpdate={onRefresh} />
          ))}
        </div>
      ) : (
        groups.map((g) => <TypeSection key={g.type} typeKey={g.type} statuses={g.items} onUpdate={onRefresh} />)
      )}
    </div>
  );
}
