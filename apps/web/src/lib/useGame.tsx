import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { SocketEvents, type RoomSnapshot } from '@leaders/shared';
import { socket } from '../socket';

interface Ack<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface Session {
  roomCode: string;
  playerId: string;
  playerToken: string;
  name: string;
}

const SESSION_KEY = 'leaders.session';

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export interface Announcement {
  id: number;
  title: string;
  text: string;
}

interface GameApi {
  connected: boolean;
  snapshot: RoomSnapshot | null;
  session: Session | null;
  error: string | null;
  announcements: Announcement[];
  dismissAnnouncement: () => void;
  clearError: () => void;
  createRoom: (name: string) => Promise<void>;
  joinRoom: (roomCode: string, name: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  pickCountry: (countryId: string) => Promise<void>;
  startGame: () => Promise<void>;
  chooseCard: (cardId: string, choiceIndex: number) => Promise<{ wonderFallback: string | null } | null>;
  markReady: () => Promise<void>;
  hostContinue: () => Promise<void>;
  spyOrder: (
    kind: string,
    targetCountryId: string,
  ) => Promise<{ success: boolean } | null>;
  declareForbes: (value: number) => Promise<void>;
  commentDone: () => Promise<void>;
  emitRaw: <T>(event: string, body?: unknown) => Promise<Ack<T>>;
}

const GameContext = createContext<GameApi | null>(null);

let announcementIdCounter = 0;

export function GameProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(socket.connected);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [session, setSession] = useState<Session | null>(loadSession);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const emitRaw = useCallback(<T,>(event: string, body: unknown = {}): Promise<Ack<T>> => {
    return new Promise((resolve) => {
      socket.timeout(7000).emit(event, body, (err: unknown, res: Ack<T>) => {
        if (err) resolve({ ok: false, error: 'Сервер не ответил' });
        else resolve(res);
      });
    });
  }, []);

  const saveSession = useCallback((s: Session | null) => {
    setSession(s);
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  // подписки на сокет + авто-реконнект в комнату
  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      const s = loadSession();
      if (s) {
        void emitRaw<{ roomCode: string; playerId: string; playerToken: string }>(
          SocketEvents.RoomJoin,
          { roomCode: s.roomCode, name: s.name, playerToken: s.playerToken },
        ).then((res) => {
          if (!res.ok) {
            saveSession(null);
            setSnapshot(null);
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (snap: RoomSnapshot) => setSnapshot(snap);
    // тест-режим: действия ботов — в консоль браузера
    const onBotLog = (d: { text: string; ts: number }) => {
      console.log(
        `%c🤖 ${new Date(d.ts).toLocaleTimeString()} %c${d.text}`,
        'color:#f59e0b;font-weight:bold',
        'color:#cbd5e1',
      );
    };
    const onAnnouncement = (d: { title: string; text: string }) => {
      setAnnouncements((prev) => [...prev, { id: ++announcementIdCounter, ...d }]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(SocketEvents.RoomState, onState);
    socket.on(SocketEvents.BotLog, onBotLog);
    socket.on(SocketEvents.GameAnnouncement, onAnnouncement);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SocketEvents.RoomState, onState);
      socket.off(SocketEvents.BotLog, onBotLog);
      socket.off(SocketEvents.GameAnnouncement, onAnnouncement);
    };
  }, [emitRaw, saveSession]);

  const guard = useCallback(async <T,>(p: Promise<Ack<T>>): Promise<Ack<T>> => {
    const res = await p;
    if (!res.ok) setError(res.error ?? 'Что-то пошло не так');
    return res;
  }, []);

  const api = useMemo<GameApi>(
    () => ({
      connected,
      snapshot,
      session,
      error,
      announcements,
      dismissAnnouncement: () => setAnnouncements((prev) => prev.slice(1)),
      clearError: () => setError(null),
      createRoom: async (name) => {
        const res = await guard<{ roomCode: string; playerId: string; playerToken: string }>(
          emitRaw(SocketEvents.RoomCreate, { name }),
        );
        if (res.ok && res.data) saveSession({ ...res.data, name });
      },
      joinRoom: async (roomCode, name) => {
        const res = await guard<{ roomCode: string; playerId: string; playerToken: string }>(
          emitRaw(SocketEvents.RoomJoin, { roomCode, name }),
        );
        if (res.ok && res.data) saveSession({ ...res.data, name });
      },
      leaveRoom: async () => {
        await emitRaw(SocketEvents.RoomLeave);
        saveSession(null);
        setSnapshot(null);
      },
      pickCountry: async (countryId) => void (await guard(emitRaw(SocketEvents.RoomPickCountry, { countryId }))),
      startGame: async () => void (await guard(emitRaw(SocketEvents.RoomStart))),
      chooseCard: async (cardId, choiceIndex) => {
        const res = await guard<{ wonderFallback: string | null }>(
          emitRaw(SocketEvents.CabinetChoose, { cardId, choiceIndex }),
        );
        return res.ok ? { wonderFallback: res.data?.wonderFallback ?? null } : null;
      },
      markReady: async () => void (await guard(emitRaw(SocketEvents.CabinetReady))),
      hostContinue: async () => void (await guard(emitRaw(SocketEvents.RoomHostContinue))),
      spyOrder: async (kind, targetCountryId) => {
        const res = await guard<{ success: boolean }>(
          emitRaw(SocketEvents.SpyOrder, { kind, targetCountryId }),
        );
        return res.ok ? (res.data ?? null) : null;
      },
      declareForbes: async (value) => void (await guard(emitRaw(SocketEvents.ForbesDeclare, { value }))),
      commentDone: async () => void (await guard(emitRaw(SocketEvents.UnCommentDone))),
      emitRaw,
    }),
    [connected, snapshot, session, error, announcements, emitRaw, guard, saveSession],
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame вне GameProvider');
  return ctx;
}
