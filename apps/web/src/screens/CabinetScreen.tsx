import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../lib/useGame';
import { SocketEvents } from '@leaders/shared';
import type { YearReport, PrivateCountryView, PublicCountryView } from '@leaders/shared';
import { Timer } from '../ui/Timer';
import { BottomDrawer } from '../ui/BottomDrawer';
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
import type { AdvisorCard } from '@leaders/shared';

type Tab = 'advisor' | 'country' | 'laws' | 'diplomacy';

interface PendingResult {
  card: AdvisorCard;
  choiceIndex: number;
  wonderFallback: string | null;
}

// ── Year report banner ──────────────────────────────────────────────────
function YearReportBanner({ report }: { report: YearReport }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 15000);
    return () => clearTimeout(t);
  }, []);

  const delta = (b: number, a: number) => {
    const d = a - b;
    if (d === 0) return null;
    return <span className={d > 0 ? 'text-emerald-400' : 'text-red-400'}>{d > 0 ? '+' : ''}{d}</span>;
  };

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-amber-800/40 bg-amber-950/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-amber-400">📊 Итоги {report.endedYear} года</span>
        <motion.span
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ duration: 0.2 }}
          className="text-[10px] text-slate-500"
        >
          ▲
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 pt-1 flex flex-col gap-2 text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {(Object.entries(report.resources) as [string, { before: number; after: number }][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">
                      {({ money: '💰 Деньги', gold: '🥇 Золото', food: '🌾 Еда', influence: '🗳 Влияние' } as Record<string, string>)[k] ?? k}
                    </span>
                    <span>{delta(v.before, v.after) ?? <span className="text-slate-600">без изм.</span>}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t border-amber-900/40 pt-1">
                <span className="font-semibold text-amber-400">Форбс</span>
                <span>
                  {delta(report.forbes.before, report.forbes.after) ?? '—'}{' '}
                  <span className="text-slate-500 text-[10px]">({report.forbes.after})</span>
                </span>
              </div>
              {report.globalEvents.map((e, i) => <div key={i} className="text-slate-400">• {e}</div>)}
              {report.statusChanges.map((e, i) => <div key={i} className="text-slate-400">• {e}</div>)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Diplomacy tab: country grid + per-country drawers ───────────────────
type DiploMode = 'trade' | 'spy' | null;

function DiplomacyTab({ you, others }: { you: PrivateCountryView; others: PublicCountryView[] }) {
  const { snapshot, emitRaw } = useGame();
  const [selectedCountry, setSelectedCountry] = useState<PublicCountryView | null>(null);
  const [mode, setMode] = useState<DiploMode>(null);

  const openDrawer = (country: PublicCountryView, m: DiploMode) => {
    setSelectedCountry(country);
    setMode(m);
  };
  const closeDrawer = () => { setSelectedCountry(null); setMode(null); };

  const callsLeft = you.callsLeft;
  const outgoingCall = you.outgoingCall;
  const playerByCountry = new Map(
    (snapshot?.players ?? []).filter(p => p.countryId).map(p => [p.countryId!, p])
  );

  const incomingPendingFrom = new Set(
    (snapshot?.offers ?? [])
      .filter(o => o.status === 'pending' && o.toCountryId === you.countryId)
      .map(o => o.fromCountryId)
  );

  const activeWarCountries = new Set(
    (snapshot?.wars ?? [])
      .filter(w => w.yourSide && w.status === 'active')
      .flatMap(w => [...w.attacker.countryIds, ...w.defender.countryIds])
  );

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {/* Country grid */}
        {others.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Нет других стран</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2">
            {others.map((o) => {
              const player = playerByCountry.get(o.countryId);
              const isOnline = player?.connected ?? false;
              const hasTrade = incomingPendingFrom.has(o.countryId);
              const isAtWar = activeWarCountries.has(o.countryId);

              return (
                <motion.div
                  key={o.countryId}
                  layout
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
                >
                  <div className="flex items-start gap-2">
                    <div className="relative shrink-0 pt-0.5">
                      <span className="text-3xl leading-none">🌍</span>
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold leading-tight">{o.countryName}</div>
                      <div className="truncate text-xs leading-tight text-slate-400">{o.playerName}</div>
                    </div>
                  </div>
                  {(isAtWar || hasTrade || o.sanctions > 0) && (
                    <div className="flex flex-wrap gap-1">
                      {isAtWar && <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-xs text-red-400">⚔️ война</span>}
                      {hasTrade && <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-400">📨 сделка</span>}
                      {o.sanctions > 0 && <span className="rounded bg-rose-900/40 px-1.5 py-0.5 text-xs text-rose-400">🚫 {o.sanctions}</span>}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => void emitRaw(SocketEvents.CallInvite, { toCountryId: o.countryId })}
                      disabled={callsLeft <= 0 || !!outgoingCall}
                      className="flex-1 rounded-lg bg-slate-800 py-2.5 text-base transition-colors hover:bg-slate-700 disabled:opacity-40"
                      title={`Позвонить (осталось ${callsLeft})`}
                    >
                      📞
                    </button>
                    <button
                      onClick={() => openDrawer(o, 'trade')}
                      className="relative flex-1 rounded-lg bg-slate-800 py-2.5 text-base transition-colors hover:bg-slate-700"
                      title="Торговля"
                    >
                      💰
                      {hasTrade && (
                        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openDrawer(o, 'spy')}
                      className="flex-1 rounded-lg bg-slate-800 py-2.5 text-base transition-colors hover:bg-slate-700"
                      title="Разведка"
                    >
                      🕵️
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* War panel */}
        <WarPanel others={others} />
      </div>

      {/* Trade drawer */}
      <BottomDrawer
        open={!!selectedCountry && mode === 'trade'}
        onClose={closeDrawer}
        title={`💰 Сделка с ${selectedCountry?.countryName ?? ''}`}
      >
        {selectedCountry && (
          <TradePanel
            you={you}
            others={others}
            defaultTargetCountryId={selectedCountry.countryId}
            forceOpen
          />
        )}
      </BottomDrawer>

      {/* Spy drawer */}
      <BottomDrawer
        open={!!selectedCountry && mode === 'spy'}
        onClose={closeDrawer}
        title={`🕵️ Операция против ${selectedCountry?.countryName ?? ''}`}
      >
        {selectedCountry && (
          <SpyPanel
            others={others}
            myCountryId={you.countryId}
            defaultTargetId={selectedCountry.countryId}
          />
        )}
      </BottomDrawer>
    </>
  );
}

// ── Ready button ────────────────────────────────────────────────────────
function ReadyButton({
  readyClicked,
  onReady,
}: {
  readyClicked: boolean;
  onReady: () => void;
}) {
  return (
    <motion.button
      onClick={onReady}
      disabled={readyClicked}
      whileTap={readyClicked ? {} : { scale: 0.97 }}
      className={`w-full rounded-xl py-4 text-base font-bold transition-colors ${
        readyClicked
          ? 'cursor-default bg-slate-700 text-slate-500'
          : 'bg-emerald-600 text-white hover:bg-emerald-500'
      }`}
    >
      {readyClicked ? '✓ Готов (жду остальных)' : '✓ Готов'}
    </motion.button>
  );
}

// ── Tab bar ─────────────────────────────────────────────────────────────
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'advisor', icon: '🃏', label: 'Советник' },
  { id: 'country', icon: '🌍', label: 'Страна' },
  { id: 'laws', icon: '⚖️', label: 'Законы' },
  { id: 'diplomacy', icon: '🤝', label: 'Дипломатия' },
];

function TabBar({
  tab,
  setTab,
  readyCount,
  readyTotal,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  readyCount: number;
  readyTotal: number;
}) {
  return (
    <nav className="flex shrink-0 border-t border-slate-800 bg-slate-950">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
            tab === t.id ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span className="text-xl leading-none">{t.icon}</span>
          <span className="text-[10px] font-medium leading-none">{t.label}</span>
          {t.id === 'diplomacy' && readyCount < readyTotal && (
            <span className="text-[9px] text-slate-600">{readyCount}/{readyTotal} ✓</span>
          )}
        </button>
      ))}
    </nav>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────
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
    setPendingResult({ card, choiceIndex, wonderFallback: result?.wonderFallback ?? null });
  };

  const handleReady = async () => {
    setShowReadyConfirm(false);
    setReadyClicked(true);
    await markReady();
  };

  // Tab content with animation
  const tabContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="h-full"
      >
        {tab === 'advisor' && (
          <div className="flex h-full flex-col overflow-y-auto px-4 py-3">
            {/* Cards counter as progress-like info row */}
            <div className="mb-3 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm">
              <span className="text-slate-400">Карточки советника</span>
              <span className="font-mono font-bold text-amber-400">
                {you.cardsLeft} {you.cardsLeft === 1 ? 'осталась' : 'осталось'}
              </span>
            </div>

            {pendingResult ? (
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <CardResultModal
                  card={pendingResult.card}
                  choiceIndex={pendingResult.choiceIndex}
                  wonderFallback={pendingResult.wonderFallback}
                  onDone={() => setPendingResult(null)}
                />
              </motion.div>
            ) : you.currentCard && you.cardsLeft > 0 ? (
              <SwipeCard
                key={you.currentCard.id}
                card={you.currentCard}
                onChoose={(i) => void handleChoose(i)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-1 flex-col items-center justify-center gap-3 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                  className="text-5xl"
                >
                  ✅
                </motion.div>
                <div className="font-semibold text-slate-300">Советники выдохлись</div>
                <div className="text-sm text-slate-500">Нажмите «Готов» когда закончите дела</div>
              </motion.div>
            )}
          </div>
        )}

        {tab === 'country' && (
          <div className="flex h-full flex-col overflow-y-auto p-3">
            {/* ResourcePanel only on mobile (hidden on md+ — sidebar has it) */}
            <div className="md:hidden">
              <ResourcePanel you={you} />
              <div className="my-3 border-t border-slate-800" />
            </div>
            <BudgetPanel you={you} />
          </div>
        )}

        {tab === 'laws' && (
          <div className="h-full overflow-y-auto p-3">
            <LawsPanel you={you} />
          </div>
        )}

        {tab === 'diplomacy' && (
          <div className="h-full">
            <DiplomacyTab you={you} others={snapshot.others} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 md:flex-row">
      {/* Always-mounted: handles active/incoming call overlays */}
      <WiretapListener />
      <CallPanel you={you} others={snapshot.others} hideList />

      {/* ── MD+ Left sidebar ── */}
      <aside className="hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col overflow-hidden border-r border-slate-800">
        <div className="shrink-0 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase text-slate-500">Год {snapshot.year}/{snapshot.totalYears} · Кабинет</div>
              <div className="font-bold text-amber-400">{you.countryName}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl">
                <Timer endsAt={snapshot.phaseEndsAt} />
              </div>
              <div className="text-xs text-slate-500">✓ {snapshot.readyCount}/{snapshot.readyTotal}</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {snapshot.yearReport && <YearReportBanner report={snapshot.yearReport} />}
          <ResourcePanel you={you} />
          <div className="mt-3">
            <BudgetPanel you={you} />
          </div>
          <div className="mt-3">
            <LawsPanel you={you} />
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-800 px-4 py-3">
          <ReadyButton
            readyClicked={readyClicked}
            onReady={() => setShowReadyConfirm(true)}
          />
          <div className="mt-1.5 text-center text-xs text-slate-600">
            ✓ {snapshot.readyCount}/{snapshot.readyTotal} готовы
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="shrink-0 flex items-center justify-between border-b border-slate-800 px-4 py-2.5 md:hidden">
          <div>
            <div className="text-xs uppercase text-slate-500">Год {snapshot.year}/{snapshot.totalYears}</div>
            <div className="font-bold text-amber-400">{you.countryName}</div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-xl font-mono">
              <Timer endsAt={snapshot.phaseEndsAt} />
            </div>
            <div className="text-xs text-slate-500">✓ {snapshot.readyCount}/{snapshot.readyTotal}</div>
          </div>
        </header>

        {/* Mobile year report */}
        {snapshot.yearReport && (
          <div className="shrink-0 px-4 pt-2 md:hidden">
            <YearReportBanner report={snapshot.yearReport} />
          </div>
        )}

        {/* Tab content */}
        <div className="min-h-0 flex-1">{tabContent}</div>

        {/* Mobile ready button */}
        <div className="shrink-0 border-t border-slate-800 px-4 py-3 md:hidden">
          <ReadyButton
            readyClicked={readyClicked}
            onReady={() => setShowReadyConfirm(true)}
          />
        </div>

        {/* Tab bar */}
        <TabBar
          tab={tab}
          setTab={setTab}
          readyCount={snapshot.readyCount}
          readyTotal={snapshot.readyTotal}
        />
      </div>

      {/* ── LG+ Right panel: always-visible diplomacy ── */}
      <aside className="hidden lg:flex w-80 shrink-0 flex-col overflow-hidden border-l border-slate-800">
        <div className="shrink-0 border-b border-slate-800 px-4 py-2.5">
          <div className="font-semibold text-slate-300">🤝 Дипломатия</div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <DiplomacyTab you={you} others={snapshot.others} />
        </div>
      </aside>

      {/* Ready confirm modal */}
      {showReadyConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5"
          >
            <h2 className="mb-2 text-lg font-bold">Переходим к ООН?</h2>
            <p className="mb-3 text-sm text-slate-400">
              Пока ещё можете: звонить, вести разведку, торговать, брать карточки советника.
            </p>
            <p className="mb-4 text-sm text-slate-400">
              После «Готов» вы ждёте остальных — отменить нельзя.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReadyConfirm(false)}
                className="flex-1 rounded-xl border border-slate-700 py-3 text-sm font-semibold hover:border-slate-500"
              >
                Остаться
              </button>
              <button
                onClick={() => void handleReady()}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
              >
                Готов, переходим
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
