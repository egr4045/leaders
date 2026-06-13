import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../lib/useGame';
import { VideoGrid } from '../video/VideoGrid';

type Tab = 'call' | 'countries' | 'host';

export function LobbyScreen() {
  const { snapshot, session, pickCountry, startGame, leaveRoom, emitRaw } = useGame();
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  if (!snapshot || !session) return null;

  const me = snapshot.players.find((p) => p.playerId === session.playerId);
  const myCountryId = me?.countryId ?? null;
  const isHost = me?.isHost ?? false;
  const gameRunning = snapshot.phase !== 'lobby';
  const needsCountry = gameRunning && !myCountryId;

  const [tab, setTab] = useState<Tab>(needsCountry ? 'countries' : 'call');

  const takenById = new Map(
    snapshot.players.filter((p) => p.countryId).map((p) => [p.countryId!, p]),
  );
  const allCountries: {
    id: string;
    name: string;
    description?: string;
    takenBy?: string;
    isMine?: boolean;
  }[] = [
    ...snapshot.availableCountries.map((c) => ({ ...c })),
    ...snapshot.players
      .filter((p) => p.countryId && p.countryName)
      .map((p) => ({
        id: p.countryId!,
        name: p.countryName!,
        description: undefined,
        takenBy: p.name,
        connected: p.connected,
        isBot: p.isBot,
        isMine: p.playerId === session.playerId,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const handlePick = async (countryId: string) => {
    if (pickingId) return;
    setPickingId(countryId);
    setPickError(null);
    try {
      await pickCountry(countryId);
    } catch {
      setPickError(countryId);
      setTimeout(() => setPickError(null), 1200);
    } finally {
      setPickingId(null);
    }
  };

  const TABS = [
    { id: 'call' as Tab, label: 'Созвон' },
    { id: 'countries' as Tab, label: 'Страны' },
    ...(isHost ? [{ id: 'host' as Tab, label: 'Хост' }] : []),
  ];

  const tabContent = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={tab}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.15 }}
      >
        {tab === 'call' && (
          <div className="p-3">
            {needsCountry && (
              <div className="mb-3 rounded-xl border border-amber-600 bg-amber-950/20 p-3">
                <div className="font-bold text-amber-400">Игра идёт — выберите страну</div>
                <div className="text-xs text-slate-400 mt-1">
                  Перейдите во вкладку «Страны» и займите слот отключившегося игрока
                </div>
              </div>
            )}
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Игроки ({snapshot.players.length})
            </div>
            <ul className="flex flex-col gap-1.5">
              {snapshot.players.map((p) => (
                <motion.li
                  key={p.playerId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    />
                    <span className="font-medium">{p.name}</span>
                    {p.isHost && <span className="text-xs text-amber-400">👑</span>}
                    {p.isBot && <span className="text-xs text-slate-500">AI</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{p.countryName ?? 'выбирает…'}</span>
                    {isHost && p.playerId !== session.playerId && (
                      <button
                        onClick={() => void emitRaw('room:kick', { targetPlayerId: p.playerId })}
                        title="Исключить"
                        className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-red-900/40 hover:text-red-400"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'countries' && (
          <div className="p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Все страны — выберите свою
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {allCountries.map((c) => {
                const taken =
                  takenById.get(c.id) ||
                  (c.takenBy
                    ? {
                        name: c.takenBy,
                        playerId: '',
                        connected: Boolean((c as any).connected),
                        isBot: Boolean((c as any).isBot),
                      }
                    : null);
                const isMine = c.isMine || myCountryId === c.id;
                const isPicking = pickingId === c.id;
                const isError = pickError === c.id;
                const isAvailable =
                  snapshot.phase === 'lobby'
                    ? !taken
                    : taken && (!taken.connected || taken.isBot);
                const showAsTaken = taken && (!isAvailable || snapshot.phase === 'lobby');

                return (
                  <div
                    key={c.id}
                    className={`relative rounded-xl border p-4 transition-colors ${
                      isMine
                        ? 'border-amber-500 bg-amber-950/30'
                        : isError
                        ? 'border-red-500 bg-red-950/20'
                        : isPicking
                        ? 'border-amber-400/60 bg-amber-950/20'
                        : showAsTaken
                        ? 'border-slate-700 bg-slate-800/50 opacity-60'
                        : 'border-slate-700 bg-slate-800 hover:border-amber-400/60'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">{c.name}</span>
                      {isMine && <span className="text-xs text-amber-400">Ваша</span>}
                      {taken && !isMine && (
                        <span
                          className={`text-xs ${!taken.connected || taken.isBot ? 'text-amber-400/80' : 'text-slate-500'}`}
                        >
                          {taken.name}
                          {!taken.connected && !taken.isBot && ' (отключен)'}
                          {taken.isBot && ' (бот)'}
                        </span>
                      )}
                    </div>
                    {c.description && (
                      <p className="mb-2 text-xs leading-snug text-slate-400">{c.description}</p>
                    )}
                    {isAvailable && !isMine && (
                      <button
                        onClick={() => void handlePick(c.id)}
                        disabled={!!pickingId}
                        className={`w-full rounded-lg py-2 text-sm font-bold transition-colors ${
                          isPicking
                            ? 'bg-amber-600/50 text-amber-200'
                            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50'
                        }`}
                      >
                        {isPicking ? 'Выбираю…' : 'Выбрать'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'host' && isHost && (
          <div className="flex flex-col gap-3 p-4">
            <button
              onClick={() => void emitRaw('room:add_bots', { count: 8 })}
              className="rounded-xl border border-dashed border-slate-600 px-4 py-3 text-sm text-slate-400 hover:border-amber-400"
            >
              🤖 Заполнить ботами (тест-режим)
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => void startGame()}
              className="rounded-xl bg-amber-500 px-4 py-4 text-base font-bold text-slate-950 hover:bg-amber-400"
            >
              ▶ Начать партию
            </motion.button>
            <button
              onClick={() => void leaveRoom()}
              className="text-sm text-slate-500 underline"
            >
              Выйти из комнаты
            </button>
          </div>
        )}

        {tab !== 'host' && (
          <div className="px-3 pb-3">
            <button
              onClick={() => void leaveRoom()}
              className="text-xs text-slate-600 underline"
            >
              Выйти из комнаты
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    // Mobile: flex-col (video top, tabs below)
    // md+: flex-row (video left 55%, content right 45%)
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 md:flex-row">
      {/* Video */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black md:flex-[55]">
        <VideoGrid kind="lobby" players={snapshot.players} layout="grid" showControls={true} />
        {/* Room code overlay */}
        <div className="absolute right-3 top-3 rounded-lg bg-slate-950/80 px-3 py-1 font-mono text-lg tracking-widest text-amber-400">
          {snapshot.roomCode}
        </div>
        {myCountryId && (
          <div className="absolute left-3 top-3 rounded-lg bg-slate-950/80 px-2 py-1 text-xs text-amber-300">
            {me?.countryName}
          </div>
        )}
      </div>

      {/* Tab panel */}
      <div className="flex shrink-0 flex-col border-t border-slate-800 bg-slate-950 md:flex-[45] md:border-l md:border-t-0">
        {/* Tab bar */}
        <div className="flex shrink-0 gap-0.5 border-b border-slate-800 bg-slate-950 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-lg px-5 py-2 text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-slate-900 text-amber-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable content with fade hint */}
        <div className="relative min-h-0 flex-1 overflow-y-auto bg-slate-900" style={{ maxHeight: '45dvh' }}>
          {tabContent}
          <div className="pointer-events-none sticky bottom-0 h-6 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>
      </div>
    </div>
  );
}
