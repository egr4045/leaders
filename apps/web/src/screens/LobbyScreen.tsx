import { useState } from 'react';
import { useGame } from '../lib/useGame';
import { VideoGrid } from '../video/VideoGrid';

type Tab = 'call' | 'countries' | 'host';

export function LobbyScreen() {
  const { snapshot, session, pickCountry, startGame, leaveRoom, emitRaw } = useGame();
  const [tab, setTab] = useState<Tab>('call');
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  if (!snapshot || !session) return null;

  const me = snapshot.players.find((p) => p.playerId === session.playerId);
  const myCountryId = me?.countryId ?? null;
  const isHost = me?.isHost ?? false;

  // All 10 countries: available + taken (taken by whom)
  const takenById = new Map(
    snapshot.players.filter((p) => p.countryId).map((p) => [p.countryId!, p]),
  );
  const allCountries: { id: string; name: string; description?: string; takenBy?: string; isMine?: boolean }[] = [
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

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      {/* Video area */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
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

      {/* Tabs */}
      <div className="flex shrink-0 gap-0.5 border-t border-slate-800 bg-slate-950 px-3 pt-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'bg-slate-900 text-amber-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="shrink-0 overflow-y-auto bg-slate-900" style={{ maxHeight: '45vh' }}>
        {tab === 'call' && (
          <div className="p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Игроки ({snapshot.players.length})
            </div>
            <ul className="flex flex-col gap-1">
              {snapshot.players.map((p) => (
                <li
                  key={p.playerId}
                  className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="font-medium">{p.name}</span>
                    {p.isHost && <span className="text-amber-400 text-xs">👑</span>}
                    {p.isBot && <span className="text-slate-500 text-xs">AI</span>}
                  </span>
                  <span className="text-xs text-slate-400">{p.countryName ?? 'выбирает…'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'countries' && (
          <div className="p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Все страны — выберите свою
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {allCountries.map((c) => {
                const taken = takenById.get(c.id) || (c.takenBy ? { name: c.takenBy, playerId: '', connected: Boolean(c.connected), isBot: Boolean(c.isBot) } : null);
                const isMine = c.isMine || myCountryId === c.id;
                const isPicking = pickingId === c.id;
                const isError = pickError === c.id;
                const isAvailable = snapshot.phase === 'lobby' ? !taken : (taken && (!taken.connected || taken.isBot));
                const showAsTaken = taken && (!isAvailable || snapshot.phase === 'lobby');

                return (
                  <div
                    key={c.id}
                    className={`relative rounded-xl border p-3 transition-colors ${
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
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="font-semibold">{c.name}</span>
                      {isMine && <span className="text-xs text-amber-400">Ваша</span>}
                      {taken && !isMine && (
                        <span className={`text-xs ${!taken.connected || taken.isBot ? 'text-amber-400/80' : 'text-slate-500'}`}>
                          {taken.name} {!taken.connected && !taken.isBot && '(отключен)'} {taken.isBot && '(бот)'}
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
                        className={`w-full rounded-lg py-1 text-xs font-bold transition-colors ${
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
          <div className="flex flex-col gap-2 p-3">
            <button
              onClick={() => void emitRaw('room:add_bots', { count: 8 })}
              className="rounded-xl border border-dashed border-slate-600 px-4 py-2.5 text-sm text-slate-400 hover:border-amber-400"
            >
              🤖 Заполнить ботами (тест-режим)
            </button>
            <button
              onClick={() => void startGame()}
              className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 hover:bg-amber-400"
            >
              Начать партию
            </button>
            <button onClick={() => void leaveRoom()} className="text-sm text-slate-500 underline">
              Выйти из комнаты
            </button>
          </div>
        )}

        {tab !== 'host' && (
          <div className="px-3 pb-3">
            <button onClick={() => void leaveRoom()} className="text-xs text-slate-600 underline">
              Выйти из комнаты
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
