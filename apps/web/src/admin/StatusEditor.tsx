import { useState } from 'react';
import type { StatusEntry } from './api';
import { adminApi } from './api';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  state:  { label: 'Состояние',  color: 'bg-slate-700 text-slate-300' },
  law:    { label: 'Закон',      color: 'bg-blue-900/50 text-blue-300' },
  tech:   { label: 'Технология', color: 'bg-cyan-900/50 text-cyan-300' },
  regime: { label: 'Режим',      color: 'bg-red-900/50 text-red-300' },
  wonder: { label: 'Чудо',       color: 'bg-amber-900/50 text-amber-300' },
};

const TYPE_ORDER = ['law', 'tech', 'regime', 'wonder', 'state'];

type RawStatus = Record<string, unknown>;

function StatusRow({ status, onUpdate }: { status: StatusEntry; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [msg, setMsg] = useState('');
  const [mediaIsLiberal, setMediaIsLiberal] = useState<boolean>(
    Boolean((status as unknown as RawStatus).mediaIsLiberal),
  );
  const [savingMedia, setSavingMedia] = useState(false);

  const typeMeta = TYPE_LABELS[status.type] ?? { label: status.type, color: 'bg-slate-700 text-slate-300' };
  const raw = status as unknown as RawStatus;

  const handleSaveMedia = async () => {
    setSavingMedia(true);
    try {
      await adminApi.updateStatus(status.id, { mediaIsLiberal } as Partial<StatusEntry>);
      setMsg('Сохранено');
      onUpdate();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSavingMedia(false);
    }
  };

  const handleEdit = () => {
    setEditJson(JSON.stringify(status, null, 2));
    setExpanded(true);
  };

  const handleSave = async () => {
    try {
      const data = JSON.parse(editJson) as Record<string, unknown>;
      await adminApi.updateStatus(status.id, data);
      setMsg('Сохранено');
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
            {!!raw.auto && (
              <span className="rounded bg-emerald-900/40 px-1 py-0.5 text-xs text-emerald-400">авто</span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-semibold">{status.name}</div>
          {!!status.description && (
            <div className="mt-0.5 truncate text-xs text-slate-400">{status.description}</div>
          )}
        </div>
        <span className="text-slate-500 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-3 flex flex-col gap-3">
          {/* mediaIsLiberal for regime statuses */}
          {status.type === 'regime' && (
            <div className="flex items-center gap-3 rounded-lg border border-purple-700/40 bg-purple-950/20 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mediaIsLiberal}
                  onChange={(e) => setMediaIsLiberal(e.target.checked)}
                  className="h-4 w-4 accent-sky-500"
                />
                <span className="font-semibold">Свободные СМИ</span>
                <span className="text-xs text-slate-400">(либеральные медиа при этом режиме)</span>
              </label>
              <button
                onClick={() => void handleSaveMedia()}
                disabled={savingMedia}
                className="rounded bg-purple-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
              >
                {savingMedia ? '…' : 'Сохранить'}
              </button>
            </div>
          )}

          {!!raw.effects && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Эффекты</div>
              <pre className="overflow-x-auto rounded bg-slate-800 p-2 text-xs text-slate-300">
                {JSON.stringify(raw.effects, null, 2)}
              </pre>
            </div>
          )}

          {!!raw.requires && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Условие получения</div>
              <pre className="overflow-x-auto rounded bg-slate-800 p-2 text-xs text-slate-300">
                {JSON.stringify(raw.requires, null, 2)}
              </pre>
            </div>
          )}

          {!!raw.cost && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Стоимость</div>
              <pre className="overflow-x-auto rounded bg-slate-800 p-2 text-xs text-slate-300">
                {JSON.stringify(raw.cost, null, 2)}
              </pre>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Редактировать JSON</div>
            <button
              onClick={handleEdit}
              className="mb-1 rounded border border-slate-700 px-2 py-1 text-xs hover:border-amber-400"
            >
              Загрузить в редактор
            </button>
            {editJson && (
              <>
                <textarea
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  className="w-full rounded bg-slate-800 p-2 font-mono text-xs text-slate-300 focus:outline-none"
                  rows={12}
                />
                <button
                  onClick={() => void handleSave()}
                  className="mt-1 rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white"
                >
                  Сохранить
                </button>
              </>
            )}
          </div>

          {msg && <div className="text-xs text-amber-400">{msg}</div>}
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
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
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

  const textFiltered = statuses.filter(
    (s) =>
      !filter ||
      s.id.includes(filter) ||
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      (s.description ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  const displayed = typeFilter ? textFiltered.filter((s) => s.type === typeFilter) : textFiltered;

  const knownTypes = TYPE_ORDER.filter((t) => statuses.some((s) => s.type === t));
  const extraTypes = Array.from(
    new Set(statuses.filter((s) => !TYPE_ORDER.includes(s.type)).map((s) => s.type)),
  );
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

      <div className="text-xs text-slate-500">{displayed.length} статусов</div>

      {typeFilter !== null ? (
        <div className="flex flex-col gap-2">
          {displayed.map((s) => (
            <StatusRow key={s.id} status={s} onUpdate={onRefresh} />
          ))}
        </div>
      ) : (
        groups.map((g) => (
          <TypeSection key={g.type} typeKey={g.type} statuses={g.items} onUpdate={onRefresh} />
        ))
      )}
    </div>
  );
}
