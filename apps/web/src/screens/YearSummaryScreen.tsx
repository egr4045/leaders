import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';
import type { YearReport } from '@leaders/shared';
import { ForbesLeaderboard } from './UnScreen';

const RES_LABELS: Record<string, string> = {
  money: '💰 Деньги',
  gold: '🥇 Золото',
  food: '🌾 Еда',
  influence: '🗳 Влияние',
};
const POP_LABELS: Record<string, string> = {
  rabotyagi: 'Работяги',
  umniki: 'Умники',
  siloviki: 'Силовики',
  mediyshchiki: 'Медийщики',
  ministry: 'Министры',
};
const SECTOR_LABELS: Record<string, string> = {
  economy: '🏭 Экономика',
  science: '🔬 Наука',
  army: '🪖 Армия',
  smi: '📺 СМИ',
  intel: '🕵️ Разведка',
};

function Delta({ before, after, invert = false }: { before: number; after: number; invert?: boolean }) {
  const d = after - before;
  if (d === 0) return <span className="text-slate-500">{after}</span>;
  const good = invert ? d < 0 : d > 0;
  return (
    <span>
      <span className="text-slate-300">{after}</span>{' '}
      <span className={good ? 'text-emerald-400' : 'text-red-400'}>
        ({d > 0 ? '+' : ''}{d})
      </span>
    </span>
  );
}

function DeltaTable({
  title,
  labels,
  rows,
}: {
  title: string;
  labels: Record<string, string>;
  rows: Record<string, { before: number; after: number }>;
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(rows).map(([k, v]) => (
            <tr key={k} className="border-b border-slate-800 last:border-0">
              <td className="py-1 text-slate-400">{labels[k] ?? k}</td>
              <td className="py-1 text-right text-slate-500">{v.before} →</td>
              <td className="w-24 py-1 text-right font-semibold">
                <Delta before={v.before} after={v.after} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LineSection({ title, lines, accent }: { title: string; lines: string[]; accent?: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <div className={`mb-1 text-xs font-semibold uppercase ${accent ?? 'text-slate-500'}`}>{title}</div>
      <ul className="list-inside list-disc text-sm text-slate-300">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportBody({ report }: { report: YearReport }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Ключевые показатели */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-900 p-3 text-center">
          <div className="text-xs text-slate-500">Довольство</div>
          <div className="text-xl font-bold">
            <Delta before={report.dovolstvo.before} after={report.dovolstvo.after} />
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-center">
          <div className="text-xs text-slate-500">Форбс</div>
          <div className="text-xl font-bold text-amber-400">
            <Delta before={report.forbes.before} after={report.forbes.after} />
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-center">
          <div className="text-xs text-slate-500">Инфляция</div>
          <div className={`text-xl font-bold ${report.inflationPct >= 10 ? 'text-red-400' : 'text-slate-200'}`}>
            {report.inflationPct}%
          </div>
        </div>
        <div className="rounded-xl bg-slate-900 p-3 text-center">
          <div className="text-xs text-slate-500">Курс валюты</div>
          <div className="text-xl font-bold">
            <Delta before={report.moneyRate.before} after={report.moneyRate.after} />
          </div>
        </div>
      </div>

      <LineSection title="⚔️ Война" lines={report.warEvents} accent="text-red-400" />
      <LineSection title="⏳ Что аукнулось (отложенные эффекты)" lines={report.delayedFired} accent="text-amber-400" />
      <LineSection title="📜 Статусы" lines={report.statusChanges} />
      {report.auras.length > 0 && (
        <LineSection
          title="🗿 Чужие чудеса влияют на вас"
          lines={report.auras.map((a) => `«${a.name}» (${a.ownerCountryName})`)}
          accent="text-sky-400"
        />
      )}
      <LineSection title="🌍 Мир и ООН" lines={report.globalEvents} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <DeltaTable title="Ресурсы" labels={RES_LABELS} rows={report.resources} />
        <DeltaTable title="Население" labels={POP_LABELS} rows={report.population} />
        <DeltaTable title="Сектора" labels={SECTOR_LABELS} rows={report.sectors} />
      </div>

      <ForbesLeaderboard />
    </div>
  );
}

/** Личная сводка прошедшего года: дельты, отложенные эффекты, ауры, война. */
export function YearSummaryScreen() {
  const { snapshot, markReady } = useGame();
  if (!snapshot) return null;

  const report = snapshot.yearReport;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-2">
        <div>
          <div className="text-xs uppercase text-slate-500">
            Год {report?.endedYear ?? Math.max(1, snapshot.year - 1)} завершён
          </div>
          <div className="font-bold text-amber-400">📊 Сводка для лидера</div>
        </div>
        <Timer endsAt={snapshot.phaseEndsAt} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {report ? (
          <ReportBody report={report} />
        ) : (
          <p className="text-slate-400">Сводка готовится…</p>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 px-4 py-3">
        <button
          onClick={() => void markReady()}
          className="w-full rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400"
        >
          В кабинет → ({snapshot.readyCount}/{snapshot.readyTotal} готовы)
        </button>
      </div>
    </div>
  );
}
