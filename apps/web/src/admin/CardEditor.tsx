import { useState } from 'react';
import type { CardEntry } from './api';
import { adminApi } from './api';

const COUNTRY_NAMES: Record<string, string> = {
  russia: 'Россия',
  usa: 'США',
  china: 'Китай',
  dprk: 'КНДР',
  uk: 'Великобритания',
  germany: 'Германия',
  india: 'Индия',
  japan: 'Япония',
  armenia: 'Армения',
  israel: 'Израиль',
};

const TAG_TIPS: Record<string, string> = {
  'зол.': 'Золото — главный актив, не обесценивается',
  'ден.': 'Деньги — текущий доход/расход',
  'ед.': 'Продовольствие — предотвращает голод',
  'влин.': 'Влияние — расходуется на голосовании ООН',
  'дов.': 'Довольство населения (риск переворота < 20)',
  'нас.': 'Население (рост / убыль)',
  '+статус×1': 'Карточка добавляет 1 статус стране',
  '+статус×2': 'Карточка добавляет 2 статуса стране',
  '+статус×3': 'Карточка добавляет 3 статуса стране',
  'откл.эфф': 'Отложенный эффект — срабатывает через несколько ходов, не сразу',
};

function tagTip(tag: string): string {
  if (TAG_TIPS[tag]) return TAG_TIPS[tag];
  if (tag.includes(' зол.')) return 'Золото';
  if (tag.includes(' ден.')) return 'Деньги';
  if (tag.includes(' ед.')) return 'Еда';
  if (tag.includes(' влин.')) return 'Влияние';
  if (tag.includes(' дов.')) return 'Довольство';
  if (tag.includes(' нас.')) return 'Население';
  if (tag.startsWith('+') && tag.includes(' ')) return 'Изменение показателя сектора';
  return '';
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 10
      ? 'bg-red-900/50 text-red-300'
      : score >= 5
      ? 'bg-amber-900/50 text-amber-300'
      : score <= -3
      ? 'bg-blue-900/50 text-blue-300'
      : 'bg-slate-800 text-slate-400';
  return <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${color}`}>{score > 0 ? '+' : ''}{score}</span>;
}

function EffectTag({ tag }: { tag: string }) {
  const tip = tagTip(tag);
  const isDelayed = tag === 'откл.эфф';
  const isStatus = tag.startsWith('+статус');
  const color = isDelayed
    ? 'bg-purple-900/50 text-purple-300'
    : isStatus
    ? 'bg-emerald-900/50 text-emerald-300'
    : tag.startsWith('+')
    ? 'bg-slate-700 text-slate-300'
    : 'bg-red-900/40 text-red-300';
  return (
    <span
      title={tip || undefined}
      className={`cursor-help rounded px-1 py-0.5 text-xs ${color} ${tip ? 'underline decoration-dotted underline-offset-2' : ''}`}
    >
      {tag}
    </span>
  );
}

function ChoiceNewsEditor({
  card,
  choiceIdx,
  choice,
  onSaved,
}: {
  card: CardEntry;
  choiceIdx: number;
  choice: import('./api').ChoiceEntry;
  onSaved: () => void;
}) {
  const [liberal, setLiberal] = useState(choice.newsLines?.liberal ?? '');
  const [state, setState] = useState(choice.newsLines?.state ?? '');
  const [fallback, setFallback] = useState(choice.wonderFallbackName ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      if (liberal || state) patch.newsLines = { liberal, state };
      if (choice.hasBuildWonder && fallback) patch.wonderFallbackName = fallback;
      await adminApi.updateCardChoice(card.cardId, choiceIdx, patch as Partial<import('./api').ChoiceEntry>);
      setMsg('Сохранено');
      onSaved();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 rounded bg-slate-850 border border-slate-700 p-2 text-xs flex flex-col gap-2">
      <div className="font-semibold text-slate-400">Новостная сводка</div>
      <label className="flex flex-col gap-0.5">
        <span className="text-sky-400">Свободные СМИ (либеральные)</span>
        <textarea
          value={liberal}
          onChange={(e) => setLiberal(e.target.value)}
          rows={2}
          placeholder="Как свободные СМИ освещают это решение…"
          className="rounded bg-slate-900 p-1.5 font-mono text-slate-300 focus:outline-none resize-none"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-red-400">Провластные СМИ</span>
        <textarea
          value={state}
          onChange={(e) => setState(e.target.value)}
          rows={2}
          placeholder="Как провластные СМИ освещают это решение…"
          className="rounded bg-slate-900 p-1.5 font-mono text-slate-300 focus:outline-none resize-none"
        />
      </label>
      {choice.hasBuildWonder && (
        <label className="flex flex-col gap-0.5">
          <span className="text-purple-400">Fallback если чудо занято</span>
          <input
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
            placeholder="Название альтернативы (напр. RuTube)"
            className="rounded bg-slate-900 p-1.5 font-mono text-slate-300 focus:outline-none"
          />
        </label>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded bg-amber-600 px-3 py-1 font-bold text-white disabled:opacity-40"
        >
          {saving ? 'Сохраняю…' : 'Сохранить'}
        </button>
        {msg && <span className="text-amber-400">{msg}</span>}
      </div>
    </div>
  );
}

const SECTORS: { key: string; label: string }[] = [
  { key: 'economy', label: 'Эконом.' },
  { key: 'science', label: 'Наука' },
  { key: 'army', label: 'Армия' },
  { key: 'smi', label: 'СМИ' },
  { key: 'intel', label: 'Разведка' },
];

/** Структурный редактор условия появления карточки (requires). */
function RequiresEditor({ card, onSaved }: { card: CardEntry; onSaved: () => void }) {
  const req = (card.raw.requires ?? {}) as {
    statuses?: string[];
    conditions?: string[];
    minSectors?: Record<string, number>;
  };
  const [statuses, setStatuses] = useState((req.statuses ?? []).join(', '));
  const [conditions, setConditions] = useState((req.conditions ?? []).join(', '));
  const [minSectors, setMinSectors] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SECTORS.map((s) => [s.key, req.minSectors?.[s.key] != null ? String(req.minSectors![s.key]) : '']),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const requires: Record<string, unknown> = {};
      const st = statuses.split(',').map((x) => x.trim()).filter(Boolean);
      if (st.length) requires.statuses = st;
      const cond = conditions.split(',').map((x) => x.trim()).filter(Boolean);
      if (cond.length) requires.conditions = cond;
      const ms: Record<string, number> = {};
      for (const s of SECTORS) {
        const v = minSectors[s.key];
        const n = Number(v);
        if (v !== '' && !Number.isNaN(n)) ms[s.key] = n;
      }
      if (Object.keys(ms).length) requires.minSectors = ms;
      const raw: Record<string, unknown> = { ...card.raw };
      if (Object.keys(requires).length) raw.requires = requires;
      else delete raw.requires;
      await adminApi.replaceCard(card.cardId, raw);
      setMsg('✓ сохранено');
      onSaved();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded bg-slate-800 p-2 text-xs">
      <label className="flex flex-col gap-0.5">
        <span className="text-slate-400">Нужны статусы (id через запятую)</span>
        <input
          value={statuses}
          onChange={(e) => setStatuses(e.target.value)}
          placeholder="напр. regime_kommunizm"
          className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-slate-400">Условия движка (id через запятую)</span>
        <input
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="напр. no_rich"
          className="rounded bg-slate-900 px-1.5 py-1 font-mono text-slate-200 focus:outline-none"
        />
      </label>
      <div>
        <div className="mb-1 text-slate-400">Минимальные уровни секторов (пусто = не важно)</div>
        <div className="grid grid-cols-5 gap-1">
          {SECTORS.map((s) => (
            <label key={s.key} className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-500">{s.label}</span>
              <input
                type="number"
                min={0}
                max={10}
                value={minSectors[s.key]}
                onChange={(e) => setMinSectors({ ...minSectors, [s.key]: e.target.value })}
                className="w-full rounded bg-slate-900 px-1 py-1 text-center text-slate-200 focus:outline-none"
              />
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="rounded bg-amber-600 px-3 py-1 font-bold text-white disabled:opacity-40"
        >
          {saving ? 'Сохраняю…' : 'Сохранить условие'}
        </button>
        {msg && <span className="text-amber-400">{msg}</span>}
      </div>
    </div>
  );
}

/** Форма создания карточки (в т.ч. персональной для любой страны). */
function CreateCardForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [deck, setDeck] = useState(''); // '' = общая колода
  const [speaker, setSpeaker] = useState('');
  const [situation, setSituation] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const create = async () => {
    if (!id.trim()) {
      setMsg('Нужен id');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await adminApi.createCard({
        id: id.trim(),
        deckCountry: deck || null,
        speaker: speaker || 'Советник',
        situation: situation || '…',
        weight: 1,
        choices: [
          { label: 'Вариант 1', effects: {} },
          { label: 'Вариант 2', effects: {} },
        ],
      });
      setMsg('✓ создано — раскрой карточку ниже, заполни эффекты и нажми «Применить» вверху');
      setId('');
      setSpeaker('');
      setSituation('');
      onCreated();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-3">
      <button onClick={() => setOpen(!open)} className="text-sm font-bold text-emerald-300">
        ➕ Создать карточку {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <div className="flex gap-2">
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="id (латиницей, уникальный)"
              className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 font-mono"
            />
            <select
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
            >
              <option value="">Общая (всем)</option>
              {Object.entries(COUNTRY_NAMES).map(([cid, name]) => (
                <option key={cid} value={cid}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <input
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="Советник (кто говорит)"
            className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
          />
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={2}
            placeholder="Ситуация / текст карточки"
            className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1.5"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => void create()}
              disabled={saving}
              className="rounded bg-emerald-600 px-3 py-1.5 font-bold text-white disabled:opacity-40"
            >
              {saving ? 'Создаю…' : 'Создать'}
            </button>
            {msg && <span className="text-xs text-emerald-300">{msg}</span>}
          </div>
          <p className="text-xs text-slate-600">
            Создаётся с 2 пустыми вариантами. Для страны без своей колоды она создастся и привяжется автоматически.
          </p>
        </div>
      )}
    </div>
  );
}

function CardRow({ card, onUpdate }: { card: CardEntry; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [newsEditorIdx, setNewsEditorIdx] = useState<number | null>(null);

  const handleEdit = () => {
    setEditJson(JSON.stringify(card.raw, null, 2));
  };

  const handleSave = async () => {
    try {
      const data = JSON.parse(editJson) as Record<string, unknown>;
      await adminApi.replaceCard(card.cardId, data);
      setMsg('Сохранено — нажми «Применить» вверху');
      onUpdate();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить карточку ${card.cardId}?`)) return;
    try {
      await adminApi.deleteCard(card.cardId);
      onUpdate();
    } catch (e) {
      setMsg('Ошибка: ' + (e as Error).message);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await adminApi.uploadImage(card.cardId, file);
      setMsg('Картинка загружена');
      onUpdate();
    } catch (err) {
      setMsg('Ошибка: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl relative group">
      {card.imageUrl && (
        <div className="h-32 w-full shrink-0">
          <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Шапка карточки */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-bold text-amber-500 text-sm">{card.speaker}</span>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1 rounded">{card.cardId}</span>
              {card.once && <span className="rounded bg-purple-900/50 px-1 py-0.5 text-[10px] text-purple-300">однораз.</span>}
              <span className="text-[10px] text-slate-500">вес: {card.weight}</span>
              <ScoreBadge score={card.maxScore} />
            </div>
          </div>
          <button 
            onClick={() => setEditing(!editing)}
            className="text-slate-400 hover:text-amber-400 transition-colors p-1"
            title="Настройки"
          >
            ⚙️
          </button>
        </div>

        {/* Текст ситуации */}
        <div className="text-sm text-slate-200 mt-1 italic border-l-2 border-slate-600 pl-2">
          «{card.situation}»
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {/* Choices (Always visible but compact) */}
          <div className="flex flex-col gap-1.5">
            {card.choices.map((c, i) => (
              <div key={i} className="rounded bg-slate-900/50 p-2 text-xs border border-slate-700/50">
                <div className="flex items-start justify-between gap-1">
                  <span className="font-semibold text-sky-200">
                    <span className="mr-1 text-slate-500">{i === 0 ? '①' : i === 1 ? '②' : '③'}</span>
                    {c.label}
                  </span>
                  <div className="shrink-0"><ScoreBadge score={c.score} /></div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.tags.map((t, j) => <EffectTag key={j} tag={t} />)}
                  {c.wonderFallbackName && <span className="rounded bg-purple-900/40 px-1 py-0.5 text-[9px] text-purple-300">fallback</span>}
                </div>
                {c.newsLines && (
                  <div className="mt-1.5 flex flex-col gap-1 border-t border-slate-700/50 pt-1.5">
                    {c.newsLines.liberal && (
                      <div className="text-[10px] text-sky-300 leading-tight">
                        <span className="opacity-60 mr-1">🗞 Либеральные:</span>
                        {c.newsLines.liberal}
                      </div>
                    )}
                    {c.newsLines.state && (
                      <div className="text-[10px] text-red-300 leading-tight">
                        <span className="opacity-60 mr-1">📺 Провластные:</span>
                        {c.newsLines.state}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {editing && (
        <div className="border-t border-slate-700 bg-slate-900/80 p-3 flex flex-col gap-3">
          {/* Choices editor */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Редактор СМИ вариантов</div>
            {card.choices.map((c, i) => (
              <div key={i} className="mb-1">
                <button
                  onClick={() => setNewsEditorIdx(newsEditorIdx === i ? null : i)}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-300 hover:border-amber-400 w-full text-left flex justify-between"
                >
                  <span>Вариант {i+1} СМИ</span>
                  <span>{c.newsLines ? '✏' : '+'}</span>
                </button>
                {newsEditorIdx === i && (
                  <ChoiceNewsEditor card={card} choiceIdx={i} choice={c} onSaved={onUpdate} />
                )}
              </div>
            ))}
          </div>

          {/* Requires — структурный редактор условия появления */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
              Условие появления
              <span className="ml-1 font-normal normal-case text-slate-400">(карточка выпадет только при выполнении)</span>
            </div>
            <RequiresEditor card={card} onSaved={onUpdate} />
          </div>

          {/* Edit JSON — вся карточка: эффекты, варианты, статусы, отложка */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
              Редактировать всю карточку (JSON)
              <span className="ml-1 font-normal normal-case text-slate-400">эффекты, варианты, addStatuses, delayed</span>
            </div>
            <button onClick={handleEdit} className="mb-1 rounded border border-slate-700 px-2 py-1 text-xs hover:border-amber-400">
              Загрузить в редактор
            </button>
            {editJson && (
              <>
                <textarea
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  className="w-full rounded bg-slate-800 p-2 font-mono text-xs text-slate-300 focus:outline-none"
                  rows={8}
                />
                <button onClick={() => void handleSave()} className="mt-1 rounded bg-amber-600 px-3 py-1 text-xs font-bold text-white">
                  Сохранить
                </button>
              </>
            )}
          </div>

          {/* Image upload */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Картинка карточки</div>
            {card.imageUrl && (
              <img src={card.imageUrl} alt="" className="mb-2 h-24 w-auto rounded object-cover" />
            )}
            <label className="cursor-pointer rounded border border-dashed border-slate-600 px-3 py-2 text-xs text-slate-400 hover:border-amber-400">
              {uploading ? 'Загружаю…' : 'Загрузить JPG/PNG'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageUpload(e)} />
            </label>
          </div>

          {/* Удаление */}
          <div className="border-t border-slate-800 pt-2">
            <button
              onClick={() => void handleDelete()}
              className="rounded border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950/40"
            >
              🗑 Удалить карточку
            </button>
          </div>

          {msg && <div className="text-xs text-amber-400">{msg}</div>}
        </div>
      )}
    </div>
  );
}

function CountrySection({
  title,
  cards,
  onUpdate,
}: {
  title: string;
  cards: CardEntry[];
  onUpdate: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-3 flex w-full items-center gap-2 text-left"
      >
        <span className="font-bold text-amber-400 text-lg uppercase tracking-wider">{title}</span>
        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">{cards.length}</span>
        <span className="ml-auto text-slate-500 text-xs">{collapsed ? '▼ развернуть' : '▲ свернуть'}</span>
      </button>
      {!collapsed && (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {cards.map((c) => (
            <div key={c.cardId} className="break-inside-avoid mb-4">
              <CardRow card={c} onUpdate={onUpdate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CardEditor({ cards, onRefresh }: { cards: CardEntry[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [effectFilter, setEffectFilter] = useState<string | null>(null);

  const textFiltered = cards.filter(
    (c) =>
      !filter ||
      c.cardId.includes(filter) ||
      c.speaker.toLowerCase().includes(filter.toLowerCase()) ||
      c.situation.toLowerCase().includes(filter.toLowerCase()),
  );

  const effectFiltered = effectFilter === null 
    ? textFiltered 
    : textFiltered.filter((c) => {
        if (effectFilter === 'money') return c.choices.some(ch => ch.tags.includes('ден.'));
        if (effectFilter === 'food') return c.choices.some(ch => ch.tags.includes('ед.'));
        if (effectFilter === 'status') return c.choices.some(ch => ch.tags.some(t => t.includes('статус')));
        if (effectFilter === 'influence') return c.choices.some(ch => ch.tags.includes('влин.'));
        if (effectFilter === 'delayed') return c.choices.some(ch => ch.tags.includes('откл.эфф'));
        return true;
      });

  const displayed = countryFilter === null
    ? effectFiltered
    : countryFilter === '__common__'
    ? effectFiltered.filter((c) => c.deckCountry === null)
    : effectFiltered.filter((c) => c.deckCountry === countryFilter);

  // Collect unique countries present in full card list
  const countries = Array.from(new Set(cards.filter((c) => c.deckCountry).map((c) => c.deckCountry as string))).sort();

  // Group displayed cards
  const common = displayed.filter((c) => c.deckCountry === null);
  const byCountry = countries
    .map((id) => ({ id, name: COUNTRY_NAMES[id] ?? id, cards: displayed.filter((c) => c.deckCountry === id) }))
    .filter((g) => g.cards.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <CreateCardForm onCreated={onRefresh} />

      {/* Text filter */}
      <input
        type="text"
        placeholder="Поиск по id, тексту, советнику…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />

      {/* Country filter buttons */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setCountryFilter(null)}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            countryFilter === null ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Все ({cards.length})
        </button>
        <button
          onClick={() => setCountryFilter('__common__')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            countryFilter === '__common__' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Общие ({cards.filter((c) => !c.deckCountry).length})
        </button>
        {countries.map((id) => (
          <button
            key={id}
            onClick={() => setCountryFilter(id)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
              countryFilter === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {COUNTRY_NAMES[id] ?? id} ({cards.filter((c) => c.deckCountry === id).length})
          </button>
        ))}
      </div>

      {/* Effect filters */}
      <div className="flex flex-wrap gap-1 mt-1">
        <span className="text-xs text-slate-500 py-1 mr-2">Эффекты:</span>
        {[
          { key: null, label: 'Все' },
          { key: 'money', label: '💰 Деньги' },
          { key: 'food', label: '🌾 Еда' },
          { key: 'influence', label: '🤝 Влияние' },
          { key: 'status', label: '✨ Дает статус' },
          { key: 'delayed', label: '⏳ Отложенный' },
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

      <div className="text-xs text-slate-500">
        {displayed.length} карточек · красный балл = сильные, синий = слабые
      </div>

      {/* Grouped output */}
      {countryFilter !== null ? (
        // Flat list when a specific country is selected
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
          {displayed.map((c) => (
            <div key={c.cardId} className="break-inside-avoid mb-4">
              <CardRow card={c} onUpdate={onRefresh} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {common.length > 0 && (
            <CountrySection title="Общие карточки" cards={common} onUpdate={onRefresh} />
          )}
          {byCountry.map((g) => (
            <CountrySection key={g.id} title={g.name} cards={g.cards} onUpdate={onRefresh} />
          ))}
        </>
      )}
    </div>
  );
}
