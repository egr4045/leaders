import { useState } from 'react';
import type { CardEntry } from './api';
import { adminApi } from './api';

const COUNTRY_NAMES: Record<string, string> = {
  amerika: 'Америка',
  bananovaya_respublika: 'Банановая Республика',
  drakoniya: 'Дракония',
  evrosad: 'Евросад',
  gornaya_derzhava: 'Горная Держава',
  imperiya: 'Империя',
  neftyanoe_khanstvo: 'Нефтяное Ханство',
  ostrov_kreditov: 'Остров Кредитов',
  severnaya_tverdynia: 'Северная Твердыня',
  velikiy_bazar: 'Великий Базар',
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

function CardRow({ card, onUpdate }: { card: CardEntry; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editJson, setEditJson] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [newsEditorIdx, setNewsEditorIdx] = useState<number | null>(null);

  const handleEdit = () => {
    setEditJson(JSON.stringify({
      weight: card.weight,
      once: card.once,
      speaker: card.speaker,
      situation: card.situation,
    }, null, 2));
    setExpanded(true);
  };

  const handleSave = async () => {
    try {
      const data = JSON.parse(editJson) as Record<string, unknown>;
      await adminApi.updateCard(card.cardId, data);
      setMsg('Сохранено');
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
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 p-3 text-left hover:bg-slate-800/50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{card.cardId}</span>
            {card.once && <span className="rounded bg-purple-900/50 px-1 py-0.5 text-xs text-purple-300">однораз.</span>}
            <span className="text-xs text-slate-600">вес:{card.weight}</span>
            <ScoreBadge score={card.maxScore} />
          </div>
          <div className="mt-0.5 truncate text-sm">{card.speaker}: {card.situation.slice(0, 80)}…</div>
        </div>
        {card.imageUrl && <img src={card.imageUrl} alt="" className="h-12 w-16 rounded object-cover shrink-0" />}
        <span className="text-slate-500 shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-3 flex flex-col gap-3">
          {/* Choices */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Варианты</div>
            {card.choices.map((c, i) => (
              <div key={i} className="mb-2 rounded bg-slate-800 px-2 py-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    <span className="mr-2 text-slate-500">{i === 0 ? '←' : i === 1 ? '→' : '↑'}</span>
                    <span>{c.label}</span>
                    <span className="ml-2"><ScoreBadge score={c.score} /></span>
                  </span>
                  <button
                    onClick={() => setNewsEditorIdx(newsEditorIdx === i ? null : i)}
                    className="ml-2 rounded border border-slate-600 px-1.5 py-0.5 text-xs text-slate-400 hover:border-amber-400"
                  >
                    {c.newsLines ? '✏ новости' : '+ новости'}
                  </button>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {c.tags.map((t, j) => <EffectTag key={j} tag={t} />)}
                  {c.newsLines && <span className="rounded bg-sky-900/40 px-1 py-0.5 text-[10px] text-sky-300">СМИ ✓</span>}
                  {c.wonderFallbackName && <span className="rounded bg-purple-900/40 px-1 py-0.5 text-[10px] text-purple-300">fallback: {c.wonderFallbackName}</span>}
                </div>
                {newsEditorIdx === i && (
                  <ChoiceNewsEditor card={card} choiceIdx={i} choice={c} onSaved={onUpdate} />
                )}
              </div>
            ))}
          </div>

          {/* Requires */}
          {card.requires && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Условие появления
                <span className="ml-1 font-normal normal-case text-slate-400">(карточка выпадет только при выполнении)</span>
              </div>
              <pre className="rounded bg-slate-800 p-2 text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(card.requires, null, 2)}
              </pre>
            </div>
          )}

          {/* Edit JSON */}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Редактировать</div>
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
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <span className="font-bold text-amber-400">{title}</span>
        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">{cards.length} карт</span>
        <span className="ml-auto text-slate-500 text-xs">{collapsed ? '▼ развернуть' : '▲ свернуть'}</span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {cards.map((c) => (
            <CardRow key={c.cardId} card={c} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CardEditor({ cards, onRefresh }: { cards: CardEntry[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const textFiltered = cards.filter(
    (c) =>
      !filter ||
      c.cardId.includes(filter) ||
      c.speaker.toLowerCase().includes(filter.toLowerCase()) ||
      c.situation.toLowerCase().includes(filter.toLowerCase()),
  );

  const displayed = countryFilter === null
    ? textFiltered
    : countryFilter === '__common__'
    ? textFiltered.filter((c) => c.deckCountry === null)
    : textFiltered.filter((c) => c.deckCountry === countryFilter);

  // Collect unique countries present in full card list
  const countries = Array.from(new Set(cards.filter((c) => c.deckCountry).map((c) => c.deckCountry as string))).sort();

  // Group displayed cards
  const common = displayed.filter((c) => c.deckCountry === null);
  const byCountry = countries
    .map((id) => ({ id, name: COUNTRY_NAMES[id] ?? id, cards: displayed.filter((c) => c.deckCountry === id) }))
    .filter((g) => g.cards.length > 0);

  return (
    <div className="flex flex-col gap-3">
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

      <div className="text-xs text-slate-500">
        {displayed.length} карточек · красный балл = сильные, синий = слабые · наводи на тег для подсказки
      </div>

      {/* Grouped output */}
      {countryFilter !== null ? (
        // Flat list when a specific country is selected
        <div className="flex flex-col gap-2">
          {displayed.map((c) => (
            <CardRow key={c.cardId} card={c} onUpdate={onRefresh} />
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
