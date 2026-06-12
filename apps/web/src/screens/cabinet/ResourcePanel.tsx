import type { PrivateCountryView } from '@leaders/shared';

const SECTOR_NAMES: Record<string, string> = {
  economy: 'Экономика',
  science: 'Наука',
  army: 'Армия',
  smi: 'СМИ',
  intel: 'Разведка',
};
const POP_NAMES: Record<string, string> = {
  rabotyagi: 'Работяги',
  umniki: 'Умники',
  siloviki: 'Силовики',
  mediyshchiki: 'Медийщики',
  ministry: 'Министры',
};

function SectorBar({ value }: { value: number }) {
  const filled = Math.min(10, Math.round(value));
  return (
    <span className="font-mono text-xs">
      <span className="text-amber-400">{'▰'.repeat(filled)}</span>
      <span className="text-slate-700">{'▱'.repeat(Math.max(0, 10 - filled))}</span>
      <span className="ml-1 text-slate-400">{value}</span>
    </span>
  );
}

export function ResourcePanel({ you }: { you: PrivateCountryView }) {
  const r = you.resources;
  const publicStatuses = you.statuses.filter((s) =>
    ['law', 'regime', 'tech', 'wonder'].includes(s.type),
  );
  const privateStatuses = you.statuses.filter((s) => s.type === 'state');

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 🔒 СЕКРЕТНАЯ секция */}
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-red-400">🔒 Секретно</span>
          <span className="text-xs text-slate-600">(видите только вы)</span>
        </div>

        {/* Ресурсы */}
        <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">💰 Деньги</span>
            <span className="font-mono font-bold">{r.money}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🥇 Золото</span>
            <span className="font-mono font-bold text-amber-400">{r.gold}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🌾 Еда</span>
            <span className={`font-mono font-bold ${r.food < 0 ? 'text-red-400' : 'text-lime-400'}`}>{r.food}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">🗳 Влияние</span>
            <span className="font-mono font-bold text-sky-400">{r.influence}</span>
          </div>
        </div>

        {/* Удовлетворённость */}
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="text-slate-400">😊 Довольство</span>
          <span
            className={`font-bold ${
              you.dovolstvo < 20 ? 'text-red-400' : you.dovolstvo < 40 ? 'text-yellow-400' : 'text-emerald-400'
            }`}
          >
            {you.dovolstvo}
          </span>
          {you.dovolstvo < 20 && <span className="text-xs text-red-400">⚠ риск переворота</span>}
        </div>

        {/* Сектора */}
        <div className="mb-2">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-600">Сектора</div>
          <div className="flex flex-col gap-1">
            {Object.entries(you.sectors).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  {SECTOR_NAMES[k] ?? k}
                  {k === 'smi' && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      you.smiIsLiberal
                        ? 'bg-sky-900/50 text-sky-300'
                        : 'bg-red-900/50 text-red-300'
                    }`}>
                      {you.smiIsLiberal ? 'Свободные СМИ' : 'Провластные СМИ'}
                    </span>
                  )}
                </span>
                <SectorBar value={v} />
              </div>
            ))}
          </div>
        </div>

        {/* Население */}
        <div className="mb-2">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-600">Население</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(you.population).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-slate-400">{POP_NAMES[k] ?? k}</span>
                <span className="font-mono text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Состояния (автоактивные) */}
        {privateStatuses.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-600">Состояния</div>
            <div className="flex flex-wrap gap-1">
              {privateStatuses.map((s) => (
                <span key={s.id} className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-300">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Прогноз */}
        {you.projection && (
          <div className="rounded-lg bg-slate-800/60 p-2">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Прогноз на год вперёд</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              <span>
                <span className="text-slate-400">Доход: </span>
                <span className={you.projection.moneyIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {you.projection.moneyIncome > 0 ? '+' : ''}{you.projection.moneyIncome} ден.
                </span>
              </span>
              <span>
                <span className="text-slate-400">Еда: </span>
                <span className={you.projection.foodBalance >= 0 ? 'text-lime-400' : 'text-red-400'}>
                  {you.projection.foodBalance > 0 ? '+' : ''}{you.projection.foodBalance}
                  {you.projection.foodBalance >= 0 ? ' (излишек)' : ' (голод)'}
                </span>
              </span>
              <span>
                <span className="text-slate-400">Инфляция: </span>
                <span className={you.projection.inflationPct > 10 ? 'text-red-400' : you.projection.inflationPct > 0 ? 'text-yellow-400' : 'text-emerald-400'}>
                  {you.projection.inflationPct.toFixed(1)}%
                </span>
              </span>
              <span>
                <span className="text-slate-400">Довольство: </span>
                <span className={you.projection.dovolstvoDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {you.projection.dovolstvoDelta > 0 ? '+' : ''}{you.projection.dovolstvoDelta}
                </span>
              </span>
              <span>
                <span className="text-slate-400">Наука: </span>
                <span className="text-cyan-400">+{you.projection.scienceGain}</span>
              </span>
              {you.projection.coupRisk && (
                <span className="rounded bg-red-900/60 px-1 py-0.5 text-red-300 font-semibold">
                  ⚠ риск переворота
                </span>
              )}
            </div>
          </div>
        )}

        {/* Экономика */}
        <div className="text-xs text-slate-600">
          Курс валюты: {you.moneyRate.toFixed(2)} · Инфляция: {(you.inflation * 100).toFixed(1)}%
          · Наука: {you.sciencePoints} очк.
        </div>

        {/* Форбс */}
        <div className="mt-1.5 rounded-lg bg-amber-950/40 p-2 text-sm">
          <span className="text-slate-400">Реальный Форбс: </span>
          <span className="font-bold text-amber-400">{Math.round(you.forbes.total)}</span>
          <span className="ml-2 text-xs text-slate-600">
            (деньги {Math.round(you.forbes.moneyReal)} + золото {Math.round(you.forbes.goldValue)}
            {you.forbes.questBonus > 0 && ` + квест ${Math.round(you.forbes.questBonus)}`})
          </span>
        </div>

        {/* Квест */}
        {you.quest && (
          <div className="mt-2 rounded-lg border border-purple-700/40 bg-purple-950/30 p-2">
            <div className="text-xs font-semibold uppercase text-purple-400">
              🎯 Тайный квест {you.quest.completed && '✓ выполнен'}
            </div>
            <div className="text-sm">{you.quest.name}</div>
            {you.quest.description && (
              <div className="text-xs text-slate-400">{you.quest.description}</div>
            )}
          </div>
        )}
      </div>

      {/* 👁️ ПУБЛИЧНАЯ секция */}
      <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-blue-400">👁️ Видно всем</span>
        </div>

        {/* Публичные статусы */}
        {publicStatuses.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {publicStatuses.map((s) => {
              const color =
                s.type === 'law'
                  ? 'bg-blue-900/40 text-blue-300'
                  : s.type === 'regime'
                  ? 'bg-purple-900/40 text-purple-300'
                  : s.type === 'tech'
                  ? 'bg-cyan-900/40 text-cyan-300'
                  : 'bg-amber-900/40 text-amber-300';
              return (
                <span key={s.id} className={`rounded px-2 py-0.5 text-xs ${color}`}>
                  {s.name}
                  <span className="ml-1 opacity-60 text-[10px]">
                    {s.type === 'law' ? 'закон' : s.type === 'regime' ? 'режим' : s.type === 'tech' ? 'техно' : 'чудо'}
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-slate-600">Нет публичных статусов</span>
        )}

        {/* Задекларированный Форбс */}
        <div className="mt-2 text-xs text-slate-500">
          Заявленный Форбс: <span className="font-semibold text-slate-300">{you.declaredForbes ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}
