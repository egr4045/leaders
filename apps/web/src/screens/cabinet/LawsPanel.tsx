import { useState } from 'react';
import type { PrivateCountryView } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

export function LawsPanel({ you }: { you: PrivateCountryView }) {
  const { adoptLaw, rejectLaw } = useGame();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const available = you.availableLaws ?? [];

  const handleAdopt = async (lawId: string) => {
    setBusy(true);
    setMsg(null);
    const res = await adoptLaw(lawId);
    if (!res.ok) setMsg(res.error ?? 'Ошибка');
    setBusy(false);
  };

  const handleReject = async (lawId: string) => {
    setBusy(true);
    setMsg(null);
    const res = await rejectLaw(lawId);
    if (!res.ok) setMsg(res.error ?? 'Ошибка');
    setBusy(false);
  };

  const handleCancel = async (lawId: string) => {
    if (!confirm('Вы уверены, что хотите отменить этот закон?')) return;
    setBusy(true);
    setMsg(null);
    const res = await cancelLaw(lawId);
    if (!res.ok) setMsg(res.error ?? 'Ошибка');
    setBusy(false);
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500 flex justify-between"
      >
        <span>⚖️ Законы {open ? '▲' : '▼'}</span>
        {available.length > 0 && (
          <span className="rounded-full bg-indigo-500 px-2 text-xs font-bold text-white">
            {available.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-900 p-3">
          {msg && <div className="text-center text-xs text-rose-400">{msg}</div>}

          {available.length === 0 ? (
            <div className="text-center text-sm text-slate-500 py-4">Нет доступных законов для принятия</div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-400 mb-1">
                Принятие закона стоит денег и влияния, а также может требовать определенного числа министров в аппарате.
              </div>
              {available.map((law) => {
                const canAffordMoney = !law.cost?.money || you.resources.money >= law.cost.money;
                const canAffordInfluence = !law.cost?.influence || you.resources.influence >= law.cost.influence;
                const canAfford = canAffordMoney && canAffordInfluence;
                
                const isLevelLaw = law.maxLevel && law.maxLevel > 1;
                const adoptBtnText = law.isAdopted ? 'Улучшить' : 'Принять';
                const showLevel = isLevelLaw ? `(Уровень ${law.level} из ${law.maxLevel})` : '';

                return (
                  <div key={law.id} className={`rounded-lg border p-3 text-sm ${law.isAdopted ? 'border-amber-900/50 bg-amber-950/20' : 'border-indigo-900/50 bg-indigo-950/20'}`}>
                    <div className="flex justify-between items-start">
                      <div className={`font-bold ${law.isAdopted ? 'text-amber-300' : 'text-indigo-300'}`}>
                        {law.name} <span className="text-xs opacity-75">{showLevel}</span>
                      </div>
                      {law.isAdopted && (
                        <button
                          disabled={busy}
                          onClick={() => void handleCancel(law.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 underline"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                    {law.description && <div className="mt-1 text-xs text-slate-300">{law.description}</div>}
                    
                    {law.upgradedThisYear && (
                      <div className="mt-1 text-[10px] text-amber-400 font-bold uppercase">Уже улучшалось в этом году</div>
                    )}
                    
                    {law.minMinistry && law.minMinistry > 0 && (
                      <div className={`mt-1 text-xs ${you.population.ministry >= law.minMinistry ? 'text-slate-400' : 'text-rose-400 font-bold'}`}>
                        Требуется министров: {law.minMinistry} (у вас {you.population.ministry})
                      </div>
                    )}

                    {law.effectsSummary && law.effectsSummary.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {law.effectsSummary.map((line, i) => (
                          <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] ${law.isAdopted ? 'bg-amber-900/40 text-amber-300' : 'bg-indigo-900/40 text-indigo-300'}`}>
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs items-center">
                      <span className="text-slate-500 mr-1">Стоимость:</span>
                      {law.cost?.money ? (
                        <span className={canAffordMoney ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                          💰 {law.cost.money}
                        </span>
                      ) : null}
                      {law.cost?.influence ? (
                        <span className={canAffordInfluence ? 'text-slate-400' : 'text-rose-400 font-bold'}>
                          🗳 {law.cost.influence}
                        </span>
                      ) : null}
                      {!law.cost?.money && !law.cost?.influence && <span className="text-slate-500">Бесплатно</span>}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busy || !canAfford || law.upgradedThisYear || (law.minMinistry ? you.population.ministry < law.minMinistry : false)}
                        onClick={() => void handleAdopt(law.id)}
                        className={`flex-1 rounded-lg py-1.5 font-semibold text-white disabled:opacity-40 ${law.isAdopted ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                      >
                        {adoptBtnText}
                      </button>
                      {!law.isAdopted && (
                        <button
                          disabled={busy}
                          onClick={() => void handleReject(law.id)}
                          className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-400 hover:bg-slate-700 disabled:opacity-40"
                          title="Больше не предлагать"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
