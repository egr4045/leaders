import { useState, useEffect } from 'react';
import { useGame } from '../lib/useGame';
import type { YearReport } from '@leaders/shared';
import { Timer } from '../ui/Timer';
import { SwipeCard } from './cabinet/SwipeCard';
import { CardResultModal } from './cabinet/CardResultModal';
import { ResourcePanel } from './cabinet/ResourcePanel';
import { SpyPanel } from './cabinet/SpyPanel';
import { TradePanel } from './cabinet/TradePanel';
import { WarPanel } from './cabinet/WarPanel';
import { CallPanel } from '../video/CallPanel';
import { WiretapListener } from '../video/WiretapListener';
import { BudgetPanel } from './cabinet/BudgetPanel';
import { LawsPanel } from './cabinet/LawsPanel';
import { OthersPanel } from './cabinet/OthersPanel';
import type { AdvisorCard } from '@leaders/shared';

type Tab = 'advisor' | 'country' | 'diplomacy' | 'others';

interface PendingResult {
  card: AdvisorCard;
  choiceIndex: number;
  wonderFallback: string | null;
}

function YearReportBanner({ report }: { report: YearReport }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 15000);
    return () => clearTimeout(id);
  }, []);
  if (!report) return null;
  const delta = (b: number, a: number) => {
    const d = a - b;
    return d === 0 ? null : <span className={d > 0 ? 'text-emerald-400' : 'text-red-400'}>{d > 0 ? '+' : ''}{d}</span>;
  };
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="mb-3 rounded-xl border border-amber-800/40 bg-amber-950/20">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-amber-400 flex items-center justify-between">
        <span>📊 Итоги {report.endedYear} года</span>
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </summary>
      <div className="px-3 pb-3 pt-1 flex flex-col gap-2 text-xs">
        {/* Ресурсы */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          {(Object.entries(report.resources) as [string, {before:number;after:number}][]).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-400">{({ money:'💰 Деньги', gold:'🥇 Золото', food:'🌾 Еда', influence:'🗳 Влияние' } as Record<string,string>)[k] ?? k}</span>
              <span>{delta(v.before, v.after) ?? <span className="text-slate-600">без изм.</span>}</span>
            </div>
          ))}
        </div>
        {/* Форбс */}
        <div className="flex justify-between border-t border-amber-900/40 pt-1">
          <span className="text-amber-400 font-semibold">Форбс</span>
          <span>{delta(report.forbes.before, report.forbes.after) ?? '—'} <span className="text-slate-500 text-[10px]">({report.forbes.after})</span></span>
        </div>
        {/* Санкции / события */}
        {report.globalEvents.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {report.globalEvents.map((e, i) => <div key={i} className="text-slate-400">• {e}</div>)}
          </div>
        )}
        {report.statusChanges.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {report.statusChanges.map((e, i) => <div key={i} className="text-slate-400">• {e}</div>)}
          </div>
        )}
      </div>
    </details>
  );
}

export function CabinetScreen() {
  const { snapshot, chooseCard, markReady } = useGame();
  const [tab, setTab] = useState<Tab>('advisor');
  const [readyClicked, setReadyClicked] = useState(false);
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);

  if (!snapshot?.you) return null;
  const you = snapshot.you;

  const handleChoose = async (choiceIndex: number) => {
    const card = you.currentCard;
    if (!card) return;
    const result = await chooseCard(card.id, choiceIndex);
    setPendingResult({
      card,
      choiceIndex,
      wonderFallback: result?.wonderFallback ?? null,
    });
  };

  const handleReady = async () => {
    setShowReadyConfirm(false);
    setReadyClicked(true);
    await markReady();
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'advisor', label: '🃏 Совет' },
    { id: 'country', label: '🌍 Страна' },
    { id: 'diplomacy', label: '🤝 Дип' },
    { id: 'others', label: '🌐 Мир' },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
      <WiretapListener />
      {/* Шапка */}
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-slate-500">
            Год {snapshot.year}/{snapshot.totalYears} · Кабинет лидера
          </div>
          <div className="font-bold text-amber-400">{you.countryName}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-2xl">
            <Timer endsAt={snapshot.phaseEndsAt} />
          </div>
          <div className="text-xs text-slate-500">
            Готовы: {snapshot.readyCount}/{snapshot.readyTotal}
          </div>
        </div>
      </header>

      {/* Итоги прошлого года */}
      {snapshot.yearReport && <YearReportBanner report={snapshot.yearReport} />}

      {/* Вкладки */}
      <div className="mb-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'advisor' && (
          <div className="flex flex-col items-center gap-4">
            {/* Счётчик карточек */}
            <div className="flex w-full items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm">
              <span className="text-slate-400">Карточек в этом раунде:</span>
              <span className="font-mono font-bold text-amber-400">
                {you.cardsLeft} осталось
              </span>
            </div>

            {pendingResult ? (
              <CardResultModal
                card={pendingResult.card}
                choiceIndex={pendingResult.choiceIndex}
                wonderFallback={pendingResult.wonderFallback}
                onDone={() => setPendingResult(null)}
              />
            ) : you.currentCard && you.cardsLeft > 0 ? (
              <SwipeCard
                key={you.currentCard.id}
                card={you.currentCard}
                onChoose={(i) => void handleChoose(i)}
              />
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-slate-500">
                <div className="text-4xl">✓</div>
                <div>Советники выдохлись</div>
                <div className="text-xs">Нажмите «Готов» когда закончите дела</div>
              </div>
            )}
          </div>
        )}

        {tab === 'country' && (
          <div className="flex flex-col gap-3">
            <ResourcePanel you={you} />
            <BudgetPanel you={you} />
            <LawsPanel you={you} />
          </div>
        )}

        {tab === 'diplomacy' && (
          <div className="flex flex-col gap-2">
            <CallPanel you={you} others={snapshot.others} />
            <TradePanel you={you} others={snapshot.others} />
            <WarPanel others={snapshot.others} />
          </div>
        )}

        {tab === 'others' && (
          <div className="flex flex-col gap-2">
            <OthersPanel others={snapshot.others} myCountryId={you.countryId} />
          </div>
        )}
      </div>

      {/* Кнопка Готов */}
      <div className="mt-3 pb-4">
        <button
          onClick={() => setShowReadyConfirm(true)}
          disabled={readyClicked}
          className={`w-full rounded-xl py-3 font-bold transition-colors ${
            readyClicked
              ? 'cursor-default bg-slate-700 text-slate-500'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {readyClicked ? '✓ Готов (жду остальных)' : '✓ Готов'}
        </button>
      </div>

      {/* Подтверждение "Готов" */}
      {showReadyConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <h2 className="mb-2 text-lg font-bold">Переходим к ООН?</h2>
            <p className="mb-3 text-sm text-slate-400">
              Пока ещё можете: звонить, вести разведку, торговать, брать карточки советника.
            </p>
            <p className="mb-4 text-sm text-slate-400">
              После «Готов» вы ждёте остальных игроков — отменить нельзя.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReadyConfirm(false)}
                className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-semibold hover:border-slate-500"
              >
                Остаться
              </button>
              <button
                onClick={() => void handleReady()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Готов, переходим
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
