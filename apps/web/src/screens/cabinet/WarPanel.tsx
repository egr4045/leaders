import { useState } from 'react';
import type { PublicCountryView, WarView } from '@leaders/shared';
import { SocketEvents } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

function sideLabel(w: WarView, side: 'attacker' | 'defender'): string {
  return w[side].countryNames.join(' + ');
}

function ChanceBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded bg-slate-800">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-semibold">{pct}%</span>
    </div>
  );
}

function WarCard({ war }: { war: WarView }) {
  const { emitRaw } = useGame();
  const [invest, setInvest] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const iAmIn = !!war.yourSide;
  const act = async (event: string, body: unknown, okMsg?: string) => {
    const res = await emitRaw<{ description?: string }>(event, body);
    setMsg(res.ok ? (res.data?.description ?? okMsg ?? '✓') : (res.error ?? 'Ошибка'));
    if (res.ok) setInvest('');
  };

  return (
    <div className={`rounded-lg border p-2 text-xs ${war.status === 'active' ? 'border-red-800/60' : 'border-slate-700'}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-bold text-red-300">
          ⚔️ {sideLabel(war, 'attacker')} <span className="text-slate-500">vs</span> {sideLabel(war, 'defender')}
        </span>
        <span className="shrink-0 font-mono text-slate-400">{war.attacker.score}:{war.defender.score}</span>
      </div>
      <div className="mb-1 text-slate-400">Обоснование: «{war.casusBelli}»</div>
      <div className="mb-1 text-slate-500">
        С {war.startedYear} г. ·{' '}
        {war.unVerdict === 'pending' ? 'ООН ещё судит' : war.unVerdict === 'just' ? 'ООН: справедлива' : 'ООН: НЕсправедлива'}
        {war.status === 'ended' && (war.winnerSide ? ' · окончена победой' : ' · окончена миром')}
      </div>

      {war.status === 'active' && iAmIn && war.estimatedWinChancePct !== undefined && (
        <div className="mb-2">
          <div className="mb-0.5 text-slate-500">Ваши шансы (без учёта скрытых козырей врага):</div>
          <ChanceBar pct={war.estimatedWinChancePct} />
        </div>
      )}

      {war.status === 'active' && iAmIn && (
        <div className="mb-1 flex items-center gap-1">
          <input
            type="number"
            min={1}
            value={invest}
            onChange={(e) => setInvest(e.target.value)}
            placeholder="💰 в кампанию"
            className="w-28 rounded border border-slate-700 bg-slate-950 px-1 py-0.5"
          />
          <button
            disabled={!invest}
            onClick={() => void act(SocketEvents.WarInvest, { warId: war.id, amount: Number(invest) }, '💰 Вложено (секретно)')}
            className="rounded bg-red-800 px-2 py-0.5 font-semibold disabled:opacity-40"
          >
            Вложить
          </button>
          {war.yourInvestedThisYear ? (
            <span className="text-slate-500">в этом году: {war.yourInvestedThisYear}</span>
          ) : null}
        </div>
      )}

      {war.status === 'active' && !iAmIn && (
        <div className="mb-1 flex gap-1">
          <button
            onClick={() => void act(SocketEvents.WarJoin, { warId: war.id, side: 'attacker' }, '🤝 Вы в коалиции')}
            className="rounded border border-red-800 px-2 py-0.5 text-red-300 hover:bg-red-950/40"
          >
            За {sideLabel(war, 'attacker')}
          </button>
          <button
            onClick={() => void act(SocketEvents.WarJoin, { warId: war.id, side: 'defender' }, '🤝 Вы в коалиции')}
            className="rounded border border-sky-800 px-2 py-0.5 text-sky-300 hover:bg-sky-950/40"
          >
            За {sideLabel(war, 'defender')}
          </button>
        </div>
      )}

      {war.victorPointsRemaining !== undefined && war.victorPointsRemaining > 0 && (
        <div className="mt-1 rounded border border-amber-700/60 bg-amber-950/30 p-2">
          <div className="mb-1 font-semibold text-amber-300">
            🏆 Очки победителя: {war.victorPointsRemaining}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => void act(SocketEvents.WarSpendPoints, { warId: war.id, reward: 'loot' })}
              className="rounded bg-amber-700 px-2 py-1 font-semibold hover:bg-amber-600"
            >
              💰 Грабёж ресурсов
            </button>
            <button
              onClick={() => void act(SocketEvents.WarSpendPoints, { warId: war.id, reward: 'kontributsiya' })}
              className="rounded bg-amber-700 px-2 py-1 font-semibold hover:bg-amber-600"
            >
              📜 Контрибуция
            </button>
          </div>
        </div>
      )}

      {war.status === 'active' && iAmIn && (
        <div className="mt-1 text-slate-600">
          🕊 Мир — через сделку с противником (галка в «Дипломатии»). Война ежегодно ест деньги, силовиков и довольство.
        </div>
      )}
      {msg && <div className="mt-1 text-amber-300">{msg}</div>}
    </div>
  );
}

export function WarPanel({ others }: { others: PublicCountryView[] }) {
  const { snapshot, emitRaw } = useGame();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [casus, setCasus] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const wars = snapshot?.wars ?? [];
  const active = wars.filter((w) => w.status === 'active');
  const myActive = active.filter((w) => w.yourSide);
  const withPoints = wars.filter((w) => (w.victorPointsRemaining ?? 0) > 0);
  // воевать можно с теми, с кем ещё не воюем
  const atWarWith = new Set(
    myActive.flatMap((w) => [...w.attacker.countryIds, ...w.defender.countryIds]),
  );
  const targets = others.filter((o) => !atWarWith.has(o.countryId));

  const declare = async () => {
    setMsg(null);
    const res = await emitRaw(SocketEvents.WarDeclare, { targetCountryId: target, casusBelli: casus });
    if (res.ok) {
      setMsg('⚔️ Война объявлена. ООН рассмотрит обоснование.');
      setTarget('');
      setCasus('');
    } else setMsg(res.error ?? 'Ошибка');
  };

  const badge = myActive.length + withPoints.length;

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-red-900/60 px-3 py-2 text-sm text-slate-300"
      >
        ⚔️ Война
        {badge > 0 && (
          <span className="ml-2 rounded-full bg-red-600 px-2 text-xs font-bold">{badge}</span>
        )}{' '}
        {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-900 p-3 text-sm">
          {wars.length > 0 && (
            <div className="flex flex-col gap-2">
              {[...wars]
                .sort((a, b) => (a.status === 'active' ? -1 : 1) - (b.status === 'active' ? -1 : 1))
                .slice(0, 6)
                .map((w) => (
                  <WarCard key={w.id} war={w} />
                ))}
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Объявить войну</div>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mb-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
            >
              <option value="">— кому —</option>
              {targets.map((o) => (
                <option key={o.countryId} value={o.countryId}>
                  {o.countryName} ({o.playerName})
                </option>
              ))}
            </select>
            <textarea
              value={casus}
              onChange={(e) => setCasus(e.target.value)}
              placeholder="Обоснование (casus belli) — его огласят в ООН и будут судить"
              maxLength={300}
              rows={2}
              className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
            />
            <button
              disabled={!target || !casus.trim()}
              onClick={() => void declare()}
              className="w-full rounded-lg bg-red-700 px-3 py-2 font-semibold hover:bg-red-600 disabled:opacity-40"
            >
              ⚔️ Объявить войну
            </button>
            <div className="mt-1 text-xs text-slate-600">
              Битва — при пересчёте года: армия + силовики + вложения + удача. Война идёт, пока кто-то не победит решающе или не подпишут мир.
            </div>
            {msg && <div className="mt-1 text-center text-xs text-amber-300">{msg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
