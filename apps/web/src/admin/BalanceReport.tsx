import type { AnalysisReport } from './api';

export function BalanceReport({ report }: { report: AnalysisReport }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Notes */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
        <div className="mb-2 text-sm font-bold text-amber-400">Заметки по балансу</div>
        <ul className="flex flex-col gap-1">
          {report.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <span className="text-amber-500 shrink-0">•</span>
              {n}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Top cards */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="mb-2 text-sm font-bold text-red-400">ТОП-10 сильных карточек</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pb-1">ID</th>
                <th className="text-left pb-1">Страна</th>
                <th className="text-right pb-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {report.topCards.map((c) => (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="py-1 font-mono">{c.id}</td>
                  <td className="py-1 text-slate-400">{c.country}</td>
                  <td className="py-1 text-right font-bold text-red-400">+{c.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weak cards */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="mb-2 text-sm font-bold text-blue-400">ТОП-10 слабых карточек</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500">
                <th className="text-left pb-1">ID</th>
                <th className="text-left pb-1">Страна</th>
                <th className="text-right pb-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {report.weakCards.map((c) => (
                <tr key={c.id} className="border-t border-slate-800">
                  <td className="py-1 font-mono">{c.id}</td>
                  <td className="py-1 text-slate-400">{c.country}</td>
                  <td className="py-1 text-right font-bold text-blue-400">{c.maxScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By country */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
        <div className="mb-2 text-sm font-bold text-slate-300">Средний score по стране/деку</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(report.byCountry)
            .sort((a, b) => b[1].avgScore - a[1].avgScore)
            .map(([country, { count, avgScore }]) => (
              <div key={country} className="flex items-center justify-between rounded-lg bg-slate-800 px-2 py-1.5 text-xs">
                <span className="text-slate-300">{country}</span>
                <div className="text-right">
                  <span className="font-bold text-amber-400">{avgScore}</span>
                  <span className="ml-1 text-slate-500">({count} карт)</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Flags */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {report.heavyCards.length > 0 && (
          <div className="rounded-xl border border-orange-900/40 bg-orange-950/20 p-3">
            <div className="mb-1 text-xs font-bold text-orange-400">⚠ Слишком частые (weight&gt;5)</div>
            <div className="flex flex-wrap gap-1">
              {report.heavyCards.map((c) => (
                <span key={c.id} className="rounded bg-orange-900/30 px-1.5 py-0.5 text-xs text-orange-300">
                  {c.id} (w:{c.weight})
                </span>
              ))}
            </div>
          </div>
        )}

        {report.delayedCards.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <div className="mb-1 text-xs font-bold text-slate-400">⏳ С отложенными эффектами</div>
            <div className="flex flex-wrap gap-1">
              {report.delayedCards.map((id) => (
                <span key={id} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">{id}</span>
              ))}
            </div>
          </div>
        )}

        {report.onceCards.length > 0 && (
          <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3">
            <div className="mb-1 text-xs font-bold text-purple-400">1× Одноразовые карточки</div>
            <div className="flex flex-wrap gap-1">
              {report.onceCards.map((id) => (
                <span key={id} className="rounded bg-purple-900/30 px-1.5 py-0.5 text-xs text-purple-300">{id}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
