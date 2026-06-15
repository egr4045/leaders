import { useState } from 'react';
import type { PublicCountryView, WarView } from '@leaders/shared';
import { SocketEvents } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

function sideLabel(w: WarView, side: 'attacker' | 'defender'): string {
  return w[side].countryNames.join(' + ');
}

function ChanceBar({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold">{pct}%</span>
    </div>
  );
}

function WarCard({ war, onGoDiplomacy }: { war: WarView; onGoDiplomacy?: () => void }) {
  const { emitRaw } = useGame();
  const [invest, setInvest] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const iAmIn = !!war.yourSide;
  const act = async (event: string, body: unknown, okMsg?: string) => {
    const res = await emitRaw<{ description?: string }>(event, body);
    setMsg(res.ok ? (res.data?.description ?? okMsg ?? '✓') : (res.error ?? 'Ошибка'));
    if (res.ok) setInvest('');
  };

  const statusColor = war.status === 'active' ? 'border-red-800/60 bg-red-950/10' : 'border-slate-700 bg-slate-950/30';

  return (
    <div className={`rounded-lg border p-3 text-xs ${statusColor}`}>
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <span className="font-bold text-red-300">⚔️ {sideLabel(war, 'attacker')}</span>
          <span className="mx-1 text-slate-500">vs</span>
          <span className="font-bold text-sky-300">{sideLabel(war, 'defender')}</span>
        </div>
        <span className="shrink-0 font-mono text-slate-400 tabular-nums">
          {war.attacker.score} : {war.defender.score}
        </span>
      </div>

      {/* Meta */}
      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
        <span>С {war.startedYear} г.</span>
        <span>
          {war.unVerdict === 'pending'
            ? '🏛 ООН рассматривает'
            : war.unVerdict === 'just'
            ? '🏛 ООН: справедлива'
            : '🏛 ООН: несправедлива'}
        </span>
        {war.status === 'ended' && (
          <span className="text-slate-500">
            {war.winnerSide ? '🏆 окончена победой' : '🕊 окончена миром'}
          </span>
        )}
      </div>

      {/* Casus belli */}
      <div className="mb-2 italic text-slate-500">«{war.casusBelli}»</div>

      {/* Win chance (only active + participant) */}
      {war.status === 'active' && iAmIn && war.estimatedWinChancePct !== undefined && (
        <div className="mb-2">
          <div className="mb-1 text-slate-500">Ваши шансы (без скрытых козырей врага):</div>
          <ChanceBar pct={war.estimatedWinChancePct} />
        </div>
      )}

      {/* Annual cost hint (active + participant) */}
      {war.status === 'active' && iAmIn && (
        <div className="mb-2 text-[11px] text-slate-600">
          💸 Каждый год войны: −5% денег, −3…6% силовиков, −3 довольства. Точные потери — в сводке года.
        </div>
      )}

      {/* Secret investment (active + participant) */}
      {war.status === 'active' && iAmIn && (
        <div className="mb-2 flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={invest}
            onChange={(e) => setInvest(e.target.value)}
            placeholder="💰 вложить в кампанию"
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1"
          />
          <button
            disabled={!invest}
            onClick={() =>
              void act(SocketEvents.WarInvest, { warId: war.id, amount: Number(invest) }, '💰 Вложено (секретно)')
            }
            className="shrink-0 rounded bg-red-800 px-2 py-1 font-semibold hover:bg-red-700 disabled:opacity-40"
          >
            Вложить
          </button>
          {war.yourInvestedThisYear ? (
            <span className="shrink-0 text-slate-500">вложено: {war.yourInvestedThisYear}</span>
          ) : null}
        </div>
      )}

      {/* Join coalition buttons (active + not in) */}
      {war.status === 'active' && !iAmIn && (
        <div className="mb-2 flex gap-1.5">
          <button
            onClick={() =>
              void act(SocketEvents.WarJoin, { warId: war.id, side: 'attacker' }, '🤝 Вы в коалиции')
            }
            className="flex-1 rounded border border-red-800 px-2 py-1 text-red-300 hover:bg-red-950/40"
          >
            За {sideLabel(war, 'attacker')}
          </button>
          <button
            onClick={() =>
              void act(SocketEvents.WarJoin, { warId: war.id, side: 'defender' }, '🤝 Вы в коалиции')
            }
            className="flex-1 rounded border border-sky-800 px-2 py-1 text-sky-300 hover:bg-sky-950/40"
          >
            За {sideLabel(war, 'defender')}
          </button>
        </div>
      )}

      {/* Victory points */}
      {(war.victorPointsRemaining ?? 0) > 0 && (
        <div className="mb-2 rounded border border-amber-700/60 bg-amber-950/30 p-2">
          <div className="mb-1.5 font-semibold text-amber-300">
            🏆 Очки победителя: {war.victorPointsRemaining}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() =>
                void act(SocketEvents.WarSpendPoints, { warId: war.id, reward: 'loot' })
              }
              className="flex-1 rounded bg-amber-700 px-2 py-1.5 font-semibold hover:bg-amber-600"
            >
              💰 Грабёж ресурсов
            </button>
            <button
              onClick={() =>
                void act(SocketEvents.WarSpendPoints, { warId: war.id, reward: 'kontributsiya' })
              }
              className="flex-1 rounded bg-amber-700 px-2 py-1.5 font-semibold hover:bg-amber-600"
            >
              📜 Контрибуция
            </button>
          </div>
        </div>
      )}

      {/* Peace button (active + participant) */}
      {war.status === 'active' && iAmIn && onGoDiplomacy && (
        <button
          onClick={onGoDiplomacy}
          className="mt-1 w-full rounded-lg border border-slate-700 py-1.5 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-300"
        >
          🕊 Запросить мир — через сделку в Дипломатии
        </button>
      )}

      {msg && <div className="mt-1.5 text-amber-300">{msg}</div>}
    </div>
  );
}

export function WarPanel({
  others,
  onGoDiplomacy,
}: {
  others: PublicCountryView[];
  onGoDiplomacy?: () => void;
}) {
  const { snapshot, emitRaw } = useGame();
  const [target, setTarget] = useState('');
  const [casus, setCasus] = useState('');
  const [declareOpen, setDeclareOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const wars = snapshot?.wars ?? [];
  const active = wars.filter((w) => w.status === 'active');
  const myActive = active.filter((w) => w.yourSide);
  const othersActive = active.filter((w) => !w.yourSide);
  const withPoints = wars.filter((w) => (w.victorPointsRemaining ?? 0) > 0);

  // Combine my active wars + ended wars with victory points (dedup)
  const myActiveIds = new Set(myActive.map((w) => w.id));
  const myWars = [...myActive, ...withPoints.filter((w) => !myActiveIds.has(w.id))];

  const atWarWith = new Set(
    myActive.flatMap((w) => [...w.attacker.countryIds, ...w.defender.countryIds]),
  );
  const targets = others.filter((o) => !atWarWith.has(o.countryId));

  const declare = async () => {
    setMsg(null);
    const res = await emitRaw(SocketEvents.WarDeclare, {
      targetCountryId: target,
      casusBelli: casus,
    });
    if (res.ok) {
      setMsg('⚔️ Война объявлена. ООН рассмотрит обоснование.');
      setTarget('');
      setCasus('');
      setDeclareOpen(false);
    } else {
      setMsg(res.error ?? 'Ошибка');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* My wars */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Мои войны</div>
        {myWars.length === 0 ? (
          <div className="rounded-lg border border-slate-800 py-4 text-center text-sm text-slate-600">
            Нет активных войн
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {myWars.map((w) => (
              <WarCard key={w.id} war={w} onGoDiplomacy={onGoDiplomacy} />
            ))}
          </div>
        )}
      </div>

      {/* Others' wars (not participating) */}
      {othersActive.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Другие войны</div>
          <div className="flex flex-col gap-2">
            {othersActive.map((w) => (
              <WarCard key={w.id} war={w} onGoDiplomacy={onGoDiplomacy} />
            ))}
          </div>
        </div>
      )}

      {/* Declare war (collapsible) */}
      <div>
        <button
          onClick={() => setDeclareOpen(!declareOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-red-900/50 px-3 py-2 text-sm text-slate-400 hover:border-red-700/70 hover:text-slate-300"
        >
          <span>⚔️ Объявить войну</span>
          <span className="text-xs">{declareOpen ? '▲' : '▼'}</span>
        </button>
        {declareOpen && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-950 p-3 text-sm">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2"
            >
              <option value="">— выберите противника —</option>
              {targets.map((o) => (
                <option key={o.countryId} value={o.countryId}>
                  {o.countryName} ({o.playerName})
                </option>
              ))}
            </select>
            <textarea
              value={casus}
              onChange={(e) => setCasus(e.target.value)}
              placeholder="Casus belli — обоснование зачитают в ООН и поставят на суд"
              maxLength={300}
              rows={2}
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
            />
            <button
              disabled={!target || !casus.trim()}
              onClick={() => void declare()}
              className="w-full rounded-lg bg-red-700 px-3 py-2 font-semibold hover:bg-red-600 disabled:opacity-40"
            >
              ⚔️ Объявить войну
            </button>
            <div className="text-xs text-slate-600">
              Битва при пересчёте года: армия + силовики + вложения + удача. Война ежегодно ест
              деньги, силовиков и довольство.
            </div>
            {msg && <div className="text-center text-xs text-amber-300">{msg}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
