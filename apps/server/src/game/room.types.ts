import type { AdvisorCard, GamePhase, PromiseRecord, TradeOfferView, UnLayout, YearReport } from '@leaders/shared';
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
  /** тест-режим: ботом управляет сервер, socketId всегда null, connected всегда true */
  isBot?: boolean;
}

export interface SpyOrderRec {
  year: number;
  attackerCountryId: string;
  targetCountryId: string;
  kind: SpyActionKind;
  outcome?: SpyOutcome;
}

/** Разведдонесение для конкретного игрока (результат успешного reveal / reveal_calls). */
export interface IntelReport {
  year: number;
  targetCountryId: string;
  kind: 'reveal' | 'reveal_calls';
  /** для reveal */
  data?: {
    resources: Record<string, number>;
    sectors: Record<string, number>;
    dovolstvo: number;
    forbesTotal: number;
    declaredForbes: number | null;
  };
  /** для reveal_calls: журнал звонков цели (с кем и сколько секунд) */
  calls?: { withCountryId: string; year: number; durationSec: number; ongoing: boolean }[];
}

/** Запись журнала звонков (для шпионской прослушки, фича 10). */
export interface CallLogEntry {
  callId: string;
  fromCountryId: string;
  toCountryId: string;
  year: number;
  startedAt: number;
  endedAt: number | null;
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
  /** решения карт за текущий год (для сводки новостей) */
  choicesThisYear: Record<string, { speaker: string; label: string; newsLines?: { liberal: string; state: string } }[]>;
  /** голоса ООН текущего года */
  votes: { voterCountryId: string; targetCountryId: string; kind: 'sanction' | 'support' }[];
  /** сводка новостей текущего года (с искажениями), по странам */
  news: Record<string, string[]> | null;
  /** сгенерированные ассеты сводки: countryId → URL */
  newsAssets: Record<string, { audioUrl?: string; imageUrl?: string }>;
  /** приватные звонки 1-на-1 (фаза Кабинета) */
  calls: { id: string; fromCountryId: string; toCountryId: string; status: 'ringing' | 'active' | 'ended' }[];
  /** журнал состоявшихся звонков (для шпионской прослушки, фича 10) */
  callLog: CallLogEntry[];
  /** реестр обещаний из сделок (фича 11) */
  promises: PromiseRecord[];
  /** публичные события последнего tick — для фазы Итогов */
  lastTickEvents: Record<string, string[]> | null;
  /** порядок выступающих в ООН (playerId) и текущий индекс */
  speakerOrder: string[];
  speakerIdx: number;
  /** инкрементный счётчик для детерминированного rng */
  rngNonce: number;
  createdAt: number;
  /** таймер истёк, ждём нажатия хоста «Продолжить» (un_summary / un_debate / results) */
  waitingContinue: boolean;
  /** сколько карточек каждый игрок взял в этом раунде кабинета */
  cardsChosenThisYear: Record<string, number>;
  /** игроки (не боты), нажавшие «Готов» в фазе кабинета */
  readyPlayerIds: string[];
  /** распределение бюджета по секторам (% дохода), per countryId */
  sectorBudget: Record<string, Partial<Record<string, number>>>;
  /** ручная пауза председателя (без дедлайна авто-возобновления) */
  manualPause: boolean;
  /** раскладка видео ООН, принудительно выбранная председателем */
  unLayout: UnLayout;
  /** голоса суда ООН по войнам (фаза un_vote, по войнам с вердиктом pending) */
  warVotes: { warId: string; voterCountryId: string; verdict: 'just' | 'unjust' }[];
  /** личные сводки прошедшего года (фаза year_summary), per countryId */
  yearReports: Record<string, YearReport>;
}

/** Транзиентные таймеры (не сериализуются в Redis). */
export interface RoomTimers {
  phaseTimer?: NodeJS.Timeout;
  pauseTimer?: NodeJS.Timeout;
  /** таймеры действий ботов; чистятся при каждой смене фазы */
  botTimers: NodeJS.Timeout[];
}
