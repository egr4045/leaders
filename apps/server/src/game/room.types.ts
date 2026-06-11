import type { AdvisorCard, GamePhase, TradeOfferView } from '@leaders/shared';
import type { SpyActionKind, SpyOutcome, WorldState } from '@leaders/engine';

export interface RoomPlayer {
  playerId: string;
  /** секрет для реконнекта (хранится в localStorage клиента) */
  token: string;
  name: string;
  countryId: string | null;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
}

export interface SpyOrderRec {
  year: number;
  attackerCountryId: string;
  targetCountryId: string;
  kind: SpyActionKind;
  /** текст лжи для insert_lie / суть умолчания для conceal */
  payload?: string;
  outcome?: SpyOutcome;
}

/** Разведдонесение для конкретного игрока (результат успешного reveal). */
export interface IntelReport {
  year: number;
  targetCountryId: string;
  data: {
    resources: Record<string, number>;
    sectors: Record<string, number>;
    dovolstvo: number;
    forbesTotal: number;
    declaredForbes: number | null;
  };
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  players: RoomPlayer[];
  world: WorldState | null;
  /** unix ms конца текущей фазы */
  phaseEndsAt: number | null;
  /** остаток таймера при паузе */
  remainingMs: number | null;
  paused: boolean;
  resumeDeadline: number | null;
  /** текущая карта по странам */
  currentCards: Record<string, AdvisorCard | null>;
  callsLeft: Record<string, number>;
  spyOrdersLeft: Record<string, number>;
  spyOrders: SpyOrderRec[];
  /** разведдонесения по playerId */
  intel: Record<string, IntelReport[]>;
  /** ящик предложений: все сделки партии */
  tradeOffers: TradeOfferView[];
  /** порядок выступающих в ООН (playerId) и текущий индекс */
  speakerOrder: string[];
  speakerIdx: number;
  /** инкрементный счётчик для детерминированного rng */
  rngNonce: number;
  createdAt: number;
}

/** Транзиентные таймеры (не сериализуются в Redis). */
export interface RoomTimers {
  phaseTimer?: NodeJS.Timeout;
  pauseTimer?: NodeJS.Timeout;
}
