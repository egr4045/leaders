import type { AdvisorCard } from './schemas/advisor.js';
import type { PopulationKey, ResourceKey, SectorKey } from './schemas/common.js';

/**
 * Фазы партии. Сервер-авторитарный автомат: lobby → (cabinet → un_* → results)×N → final.
 */
export type GamePhase =
  | 'lobby'
  | 'cabinet'
  | 'un_summary'
  | 'un_comments'
  | 'un_debate'
  | 'un_vote'
  | 'results'
  | 'final';

export interface PlayerInfo {
  playerId: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  connected: boolean;
  isHost: boolean;
}

/** Что страна показывает всем (раздел 3: скрытое НИКОГДА не уходит чужим клиентам). */
export interface PublicCountryView {
  countryId: string;
  countryName: string;
  playerId: string;
  playerName: string;
  /** публично видимые статусы: законы, режимы, технологии, чудеса */
  publicStatuses: { id: string; name: string; type: string }[];
  /** заявленный (возможно лживый) Форбс; null = не заявлял */
  declaredForbes: number | null;
  /** активные санкции ООН — публичный факт */
  sanctions: number;
  wonders: string[];
}

/** Полная картина своей страны (только владельцу). */
export interface PrivateCountryView {
  countryId: string;
  countryName: string;
  resources: Record<ResourceKey, number>;
  population: Record<PopulationKey, number>;
  /** эффективные уровни секторов (с временными добавками статусов) */
  sectors: Record<SectorKey, number>;
  dovolstvo: number;
  sciencePoints: number;
  moneyRate: number;
  inflation: number;
  statuses: { id: string; name: string; type: string }[];
  quest: { id: string; name: string; description?: string; completed: boolean } | null;
  forbes: { moneyReal: number; goldValue: number; questBonus: number; legacy: number; total: number };
  declaredForbes: number | null;
  /** текущая карта советника (фаза Кабинета) */
  currentCard: AdvisorCard | null;
  /** сколько звонков-инициаций осталось в этом году */
  callsLeft: number;
}

export interface PauseInfo {
  paused: boolean;
  /** кто переподключается (имена) */
  waitingFor: string[];
  /** unix ms, когда пауза закончится принудительно */
  resumeDeadline: number | null;
}

/** Снапшот комнаты, персональный для каждого игрока. */
export interface RoomSnapshot {
  roomCode: string;
  phase: GamePhase;
  /** unix ms конца фазы (для таймера на клиенте); null в лобби/финале */
  phaseEndsAt: number | null;
  pause: PauseInfo;
  year: number;
  totalYears: number;
  players: PlayerInfo[];
  /** свободные страны (в лобби) */
  availableCountries: { id: string; name: string }[];
  you: PrivateCountryView | null;
  others: PublicCountryView[];
  /** кто сейчас говорит в круге комментариев ООН */
  currentSpeakerId: string | null;
  /** сделки с участием вашей страны (ящик предложений) */
  offers: TradeOfferView[];
  /** финальная таблица (только в фазе final) */
  finalForbes:
    | { playerId: string; playerName: string; countryName: string; declared: number | null; real: number; questName: string | null; questDone: boolean }[]
    | null;
}

/** Сторона сделки: что участник отдаёт (раздел 9). */
export interface TradeSidePayload {
  resources?: Partial<Record<ResourceKey, number>>;
  /** «обмен опытом» — передача людей навсегда */
  population?: Partial<Record<PopulationKey, number>>;
  /** передаваемые технологии (копируются — знания не отнимешь) */
  statuses?: string[];
  /** обещание: не enforced, нарушение — фича */
  promise?: string;
}

export type TradeOfferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'failed';

export interface TradeOfferView {
  id: string;
  year: number;
  fromCountryId: string;
  fromName: string;
  toCountryId: string;
  toName: string;
  /** что отдаёт from */
  give: TradeSidePayload;
  /** что from хочет взамен */
  take: TradeSidePayload;
  status: TradeOfferStatus;
  /** причина, если сделка сорвалась при принятии */
  failReason?: string;
}

/** ack-ответы лобби */
export interface RoomCreateAck {
  ok: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
  playerToken?: string;
}

export interface RoomJoinAck extends RoomCreateAck {}
