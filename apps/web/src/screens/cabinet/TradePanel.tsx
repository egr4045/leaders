import { useState } from 'react';
import type { PrivateCountryView, PublicCountryView, TradeOfferView, TradeSidePayload } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

const RES: { key: string; label: string; short: string }[] = [
  { key: 'money', label: '💰 Деньги', short: 'ден.' },
  { key: 'gold', label: '🥇 Золото', short: 'зол.' },
  { key: 'food', label: '🌾 Еда', short: 'ед.' },
  { key: 'influence', label: '🗳 Влияние', short: 'влин.' },
];
const POPS: { key: string; label: string }[] = [
  { key: 'rabotyagi', label: 'Работяги' },
  { key: 'umniki', label: 'Умники' },
  { key: 'siloviki', label: 'Силовики' },
  { key: 'mediyshchiki', label: 'Медийщики' },
  { key: 'ministry', label: 'Министры' },
];

function SideEditor({
  title,
  value,
  onChange,
}: {
  title: string;
  value: TradeSidePayload;
  onChange: (v: TradeSidePayload) => void;
}) {
  const setRes = (key: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    const resources = { ...(value.resources ?? {}) } as Record<string, number>;
    if (n > 0) resources[key] = n;
    else delete resources[key];
    onChange({ ...value, resources: Object.keys(resources).length ? resources : undefined });
  };
  const setPop = (key: string, raw: string) => {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    const population = { ...(value.population ?? {}) } as Record<string, number>;
    if (n > 0) population[key] = n;
    else delete population[key];
    onChange({ ...value, population: Object.keys(population).length ? population : undefined });
  };

  return (
    <div className="rounded-lg border border-slate-800 p-2">
      <div className="mb-1 text-xs font-semibold uppercase text-slate-500">{title}</div>
      <div className="grid grid-cols-2 gap-1">
        {RES.map((r) => (
          <label key={r.key} className="flex items-center gap-1 text-xs">
            <span className="w-20 shrink-0">{r.label}</span>
            <input
              type="number"
              min={0}
              value={(value.resources as Record<string, number> | undefined)?.[r.key] ?? ''}
              onChange={(e) => setRes(r.key, e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-1 py-0.5"
            />
          </label>
        ))}
        {POPS.map((p) => (
          <label key={p.key} className="flex items-center gap-1 text-xs">
            <span className="w-20 shrink-0">{p.label}</span>
            <input
              type="number"
              min={0}
              value={(value.population as Record<string, number> | undefined)?.[p.key] ?? ''}
              onChange={(e) => setPop(p.key, e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-950 px-1 py-0.5"
            />
          </label>
        ))}
      </div>
      <input
        value={value.promise ?? ''}
        onChange={(e) => onChange({ ...value, promise: e.target.value || undefined })}
        placeholder="+ обещание (можно нарушить)"
        maxLength={200}
        className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
      />
      {value.promise && (
        <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={Boolean(value.promisePublic)}
            onChange={(e) => onChange({ ...value, promisePublic: e.target.checked || undefined })}
          />
          <span>📢 публичное — попадёт в общий список и огласится в ООН (иначе видят только стороны)</span>
        </label>
      )}
    </div>
  );
}

function sideText(s: TradeSidePayload): string {
  const parts: string[] = [];
  for (const r of RES) {
    const v = (s.resources as Record<string, number> | undefined)?.[r.key];
    if (v) parts.push(`${v} ${r.short}`);
  }
  for (const p of POPS) {
    const v = (s.population as Record<string, number> | undefined)?.[p.key];
    if (v) parts.push(`${p.label} ×${v}`);
  }
  if (s.statuses?.length) parts.push(`техи: ${s.statuses.join(', ')}`);
  if (s.promise) parts.push(`«${s.promise}»`);
  return parts.length ? parts.join(', ') : 'ничего';
}

const STATUS_LABELS: Record<TradeOfferView['status'], string> = {
  pending: '⏳ ждёт',
  accepted: '✅ сделка',
  declined: '🚫 отказ',
  cancelled: '↩️ отозвано',
  failed: '💥 сорвалась',
};

export function TradePanel({
  you,
  others,
  defaultTargetCountryId,
  forceOpen,
}: {
  you: PrivateCountryView;
  others: PublicCountryView[];
  defaultTargetCountryId?: string;
  forceOpen?: boolean;
}) {
  const { snapshot, emitRaw } = useGame();
  const [open, setOpen] = useState(forceOpen ?? false);
  const [target, setTarget] = useState(defaultTargetCountryId ?? '');
  const [give, setGive] = useState<TradeSidePayload>({});
  const [take, setTake] = useState<TradeSidePayload>({});
  const [withPeace, setWithPeace] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const offers = snapshot?.offers ?? [];
  const incoming = offers.filter((o) => o.toCountryId === you.countryId && o.status === 'pending');
  const recent = [...offers].reverse().slice(0, 6);
  const promises = snapshot?.promises ?? [];

  // активная война между мной и выбранным контрагентом (для мирного предложения)
  const warWithTarget = (snapshot?.wars ?? []).find(
    (w) =>
      w.status === 'active' &&
      w.yourSide &&
      target &&
      (w.yourSide === 'attacker' ? w.defender : w.attacker).countryIds.includes(target),
  );

  const send = async () => {
    setMsg(null);
    const res = await emitRaw<{ offerId: string }>('trade:offer', {
      toCountryId: target,
      give,
      take,
      ...(withPeace && warWithTarget ? { peaceWarId: warWithTarget.id } : {}),
    });
    if (res.ok) {
      setMsg(withPeace && warWithTarget ? '🕊 Мирное предложение отправлено' : '📨 Предложение отправлено');
      setGive({});
      setTake({});
      setWithPeace(false);
    } else setMsg(res.error ?? 'Ошибка');
  };

  const respond = async (offerId: string, accept: boolean) => {
    const res = await emitRaw<{ status: string; failReason?: string }>('trade:respond', { offerId, accept });
    if (res.ok && res.data?.status === 'failed') setMsg(`Сделка сорвалась: ${res.data.failReason}`);
  };

  return (
    <div className="w-full max-w-sm">
      {!forceOpen && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"
        >
          🤝 Дипломатия и торговля
          {incoming.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 text-xs font-bold text-slate-950">
              {incoming.length}
            </span>
          )}{' '}
          {open ? '▲' : '▼'}
        </button>
      )}

      {(open || forceOpen) && (
        <div className={`mt-2 flex flex-col gap-3 rounded-xl bg-slate-900 p-3 text-sm ${forceOpen ? 'border border-slate-700' : ''}`}>
          {incoming.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-amber-400">Вам предлагают</div>
              {incoming.map((o) => (
                <div key={o.id} className="mb-2 rounded-lg border border-amber-700/40 p-2 text-xs">
                  <div className="mb-1 font-semibold text-amber-300">{o.fromName}</div>
                  {o.peaceWarId && (
                    <div className="mb-1 font-semibold text-emerald-300">🕊 Мирное предложение — принятие завершит войну</div>
                  )}
                  <div>Предлагает: <span className="text-emerald-300">{sideText(o.give)}</span></div>
                  <div>Хочет взамен: <span className="text-red-300">{sideText(o.take)}</span></div>
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => void respond(o.id, true)} className="rounded bg-emerald-600 px-3 py-1 font-semibold">
                      Принять
                    </button>
                    <button onClick={() => void respond(o.id, false)} className="rounded bg-slate-700 px-3 py-1">
                      Отказать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Новое предложение</div>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
            >
              <option value="">— кому —</option>
              {others.map((o) => (
                <option key={o.countryId} value={o.countryId}>
                  {o.countryName} ({o.playerName})
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-2">
              <SideEditor title="Я отдаю" value={give} onChange={setGive} />
              <SideEditor title="Хочу взамен" value={take} onChange={setTake} />
            </div>
            {warWithTarget && (
              <label className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-2 py-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={withPeace}
                  onChange={(e) => setWithPeace(e.target.checked)}
                />
                <span>🕊 <b>Завершить войну этой сделкой</b> — принятие = мирный договор</span>
              </label>
            )}
            <button
              disabled={!target}
              onClick={() => void send()}
              className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-2 font-semibold disabled:opacity-40"
            >
              Отправить в ящик предложений
            </button>
            {msg && <div className="mt-1 text-center text-xs">{msg}</div>}
          </div>

          {promises.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Обещания
                <span className="ml-1 font-normal normal-case text-slate-600">(не enforced — можно нарушить)</span>
              </div>
              <div className="flex flex-col gap-1">
                {[...promises].reverse().map((p) => (
                  <div key={p.id} className="rounded border border-slate-800 bg-slate-950/50 px-2 py-1 text-xs">
                    <span className={p.public ? 'text-emerald-300' : 'text-slate-400'}>
                      {p.public ? '📢' : '🔒'} {p.fromName} → {p.toName}
                    </span>
                    <span className="text-slate-500"> (год {p.year}):</span> «{p.text}»
                  </div>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-slate-500">История</div>
              {recent.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 border-b border-slate-800 py-1 text-xs">
                  <span className="truncate">
                    {o.fromName} → {o.toName}: {sideText(o.give)} ⇄ {sideText(o.take)}
                  </span>
                  <span className="shrink-0">
                    {STATUS_LABELS[o.status]}
                    {o.status === 'pending' && o.fromCountryId === you.countryId && (
                      <button
                        onClick={() => void emitRaw('trade:cancel', { offerId: o.id })}
                        className="ml-1 underline"
                      >
                        отозвать
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
