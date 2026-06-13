import type { PublicCountryView } from '@leaders/shared';
import { SpyPanel } from './SpyPanel';
import { useGame } from '../../lib/useGame';

export function OthersPanel({ others, myCountryId }: { others: PublicCountryView[]; myCountryId: string }) {
  const { snapshot } = useGame();
  const intel = snapshot?.spyIntel ?? [];

  return (
    <div className="flex flex-col gap-3">
      <SpyPanel others={others} myCountryId={myCountryId} />

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
        <h3 className="mb-3 text-sm font-bold text-slate-300">Публичные сведения</h3>
        <div className="flex flex-col gap-2">
          {others.length === 0 && <div className="text-xs text-slate-500">Нет других стран</div>}
          {others.map((o) => (
            <div key={o.countryId} className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-950/50 p-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{o.countryName}</span>
                <span className="text-xs text-slate-400">{o.playerName}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {o.publicStatuses.length === 0 && o.wonders.length === 0 && (
                  <span className="text-xs text-slate-600">Нет публичных статусов</span>
                )}
                {o.publicStatuses.map((st) => (
                  <span key={st.id} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {st.name}
                  </span>
                ))}
                {o.wonders.map((wId) => (
                  <span key={wId} className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] text-amber-300">
                    ✨ Чудо
                  </span>
                ))}
              </div>
              {o.declaredForbes != null && (
                <div className="mt-1 text-xs text-amber-400/80">
                  Заявленный Форбс: {o.declaredForbes}
                </div>
              )}
              {o.sanctions > 0 && (
                <div className="text-xs text-rose-400/80">
                  Санкции ООН: {o.sanctions}
                </div>
              )}

              {/* Разведданные */}
              {(() => {
                const latestReveal = intel.slice().reverse().find(r => r.kind === 'reveal' && r.targetCountryName === o.countryName);
                const latestCalls = intel.slice().reverse().find(r => r.kind === 'reveal_calls' && r.targetCountryName === o.countryName);
                
                if (!latestReveal && !latestCalls) return null;

                return (
                  <div className="mt-2 flex flex-col gap-1 rounded border border-sky-900/50 bg-sky-950/20 p-2 text-xs">
                    <div className="font-semibold text-sky-400/80 mb-1">Данные разведки</div>
                    
                    {latestReveal && latestReveal.data && (
                      <div className="text-slate-300">
                        <div className="text-[10px] text-slate-500 mb-0.5">Экономика (год {latestReveal.year}):</div>
                        <div>💰 {latestReveal.data.resources.money} · 🥇 {latestReveal.data.resources.gold} · 🌾 {latestReveal.data.resources.food} · 📢 {latestReveal.data.resources.influence}</div>
                        <div className="text-slate-400 mt-0.5">
                          Сектора: эк {latestReveal.data.sectors.economy}/нау {latestReveal.data.sectors.science}/арм {latestReveal.data.sectors.army}/сми {latestReveal.data.sectors.smi}/раз {latestReveal.data.sectors.intel}
                        </div>
                        <div className="text-slate-400">Довольство: {latestReveal.data.dovolstvo}</div>
                        <div className="text-amber-300/90 mt-0.5">
                          Реальный Форбс: {latestReveal.data.forbesTotal}
                        </div>
                      </div>
                    )}

                    {latestCalls && (
                      <div className="mt-1 text-slate-300 border-t border-sky-900/30 pt-1">
                        <div className="text-[10px] text-slate-500 mb-0.5">Связь (год {latestCalls.year}):</div>
                        {(!latestCalls.calls || latestCalls.calls.length === 0) && <span className="text-slate-500">звонков не зафиксировано</span>}
                        {latestCalls.calls?.map((c, j) => (
                          <div key={j}>
                            ↔ {c.withCountryName} — {c.durationSec}с {c.ongoing && <span className="text-emerald-400">(идёт сейчас)</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
