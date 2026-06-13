import type { PublicCountryView } from '@leaders/shared';
import { SpyPanel } from './SpyPanel';

export function OthersPanel({ others, myCountryId }: { others: PublicCountryView[]; myCountryId: string }) {
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
