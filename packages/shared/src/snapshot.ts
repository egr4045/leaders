import type { AdvisorCard } from './schemas/advisor.js';
import type { PopulationKey, ResourceKey, SectorKey } from './schemas/common.js';

/**
 * Фазы партии. Сервер-авторитарный автомат:
 * lobby → (cabinet → un_* → results → year_summary)×N → final.
 * year_summary — личная сводка изменений за год, пропускается перед первым годом.
 */
export type GamePhase =
  | 'lobby'
  | 'cabinet'
  | 'un_summary'
  | 'un_comments'
  | 'un_debate'
  | 'un_vote'
  | 'results'
  | 'year_summary'
  | 'final';

export interface PlayerInfo {
  playerId: string;
  name: string;
  countryId: string | null;
  countryName: string | null;
  connected: boolean;
  isHost: boolean;
  isBot?: boolean;
}

/** Что страна показывает всем (раздел 3: скрытое НИКОГДА не уходит чужим клиентам). */
export interface PublicCountryView {
  countryId: string;
  countryName: string;
  playerId: string;
  playerName: string;
  /** публично видимые статусы: законы, режимы, технологии, чудеса */
  publicStatuses: { id: string; name: string; type: string; description?: string }[];
  /** заявленный (возможно лживый) Форбс; null = не заявлял */
  declaredForbes: number | null;
  /** активные санкции ООН — публичный факт */
  sanctions: number;
  wonders: string[];
  /** шанс успеха шпионской операции против этой страны (для текущего игрока, %) */
  spyChance?: number;
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
  statuses: { id: string; name: string; type: string; description?: string }[];
  quest: { id: string; name: string; description?: string; completed: boolean } | null;
  forbes: { moneyReal: number; goldValue: number; questBonus: number; legacy: number; total: number };
  declaredForbes: number | null;
  /** текущая карта советника (фаза Кабинета) */
  currentCard: AdvisorCard | null;
  /** сколько звонков-инициаций осталось в этом году */
  callsLeft: number;
  /** сколько карточек осталось взять в этом раунде */
  cardsLeft: number;
  /** сколько шпионских операций осталось в этом году */
  spyOrdersLeft: number;
  /** true = активный режим имеет независимые (частные) СМИ */
  smiIsLiberal: boolean;
  /** чужие глобальные ауры (чудеса), действующие на вашу страну */
  auras: { statusId: string; name: string; ownerCountryName: string; description?: string }[];
  /** прогноз на следующий тик (без ООН-эффектов) */
  projection: YearProjection;
  /** Законы, доступные для принятия (не принятые и не отклонённые) */
  availableLaws?: {
    id: string;
    name: string;
    description?: string;
    cost?: { money?: number; influence?: number };
    effectsSummary?: string[];
    level?: number;
    maxLevel?: number;
    upgradedThisYear?: boolean;
    isAdopted?: boolean;
    minMinistry?: number;
  }[];
  /** Установленный бюджет */
  budget?: Record<string, number>;
  /** Очередь входящих звонков */
  incomingCalls?: { callId: string; fromCountryId: string; fromCountryName: string; queuePosition: number }[];
  /** Текущий исходящий звонок */
  outgoingCall?: { callId: string; toCountryId: string; toCountryName: string; isBusy: boolean; queuePosition: number } | null;
}

export interface YearProjection {
  moneyIncome: number;
  foodBalance: number;
  inflationPct: number;
  dovolstvoDelta: number;
  scienceGain: number;
  coupRisk: boolean;
}

export interface PauseInfo {
  paused: boolean;
  /** кто переподключается (имена) */
  waitingFor: string[];
  /** unix ms, когда пауза закончится принудительно */
  resumeDeadline: number | null;
  /** true = перерыв объявлен председателем (не блокирует экран, нет дедлайна) */
  manual: boolean;
}

/** Раскладка видео на экране ООН: auto = по фазе, иначе принудительно председателем. */
export type UnLayout = 'auto' | 'spotlight' | 'grid';

// ---------- Война (Э10) ----------

export type WarVerdict = 'pending' | 'just' | 'unjust';

/** Публичная сторона войны. */
export interface WarSideView {
  /** [0] = лидер стороны */
  countryIds: string[];
  countryNames: string[];
  /** счёт стороны (публичен — пропаганда трубит о победах) */
  score: number;
}

/**
 * Война глазами конкретного игрока. Публичные факты — всем;
 * поля your…/estimated… заполнены только участникам.
 */
export interface WarView {
  id: string;
  startedYear: number;
  casusBelli: string;
  attacker: WarSideView;
  defender: WarSideView;
  status: 'active' | 'ended';
  unVerdict: WarVerdict;
  endedYear?: number;
  /** null = мирный договор */
  winnerSide?: 'attacker' | 'defender' | null;
  /** ваша сторона (если участвуете) */
  yourSide?: 'attacker' | 'defender';
  /** ваши вложения в этом году (секрет от других) */
  yourInvestedThisYear?: number;
  /** оценка шанса победы вашей стороны, % (без скрытых козырей врага), кратно 5 */
  estimatedWinChancePct?: number;
  /** очки победителя, доступные вам для трат (только лидеру победившей стороны) */
  victorPointsRemaining?: number;
}

/** Личная сводка изменений за прошедший год (фаза year_summary). */
export interface YearReport {
  endedYear: number;
  resources: Record<ResourceKey, { before: number; after: number }>;
  population: Record<PopulationKey, { before: number; after: number }>;
  sectors: Record<SectorKey, { before: number; after: number }>;
  dovolstvo: { before: number; after: number };
  moneyRate: { before: number; after: number };
  inflationPct: number;
  forbes: { before: number; after: number };
  /** сработавшие отложенные эффекты (включая скрытые — отчёт личный) */
  delayedFired: string[];
  statusChanges: string[];
  /** чужие чудеса, влияющие на вас */
  auras: { name: string; ownerCountryName: string }[];
  /** мировые события: перевороты у соседей, санкции/поддержка против вас */
  globalEvents: string[];
  /** битвы ваших войн */
  warEvents: string[];
}

/** Снапшот комнаты, персональный для каждого игрока. */
export interface RoomSnapshot {
  roomCode: string;
  phase: GamePhase;
  /** unix ms конца фазы (для таймера на клиенте); null в лобби/финале */
  phaseEndsAt: number | null;
  pause: PauseInfo;
  /** таймер истёк, ждём нажатия хоста «Продолжить» */
  waitingContinue: boolean;
  /** сколько игроков нажали «Готов» в кабинете */
  readyCount: number;
  /** сколько игроков всего (без ботов) */
  readyTotal: number;
  year: number;
  totalYears: number;
  players: PlayerInfo[];
  /** свободные страны (в лобби) */
  availableCountries: { id: string; name: string; description?: string }[];
  you: PrivateCountryView | null;
  others: PublicCountryView[];
  /** кто сейчас говорит в круге комментариев ООН */
  currentSpeakerId: string | null;
  /** раскладка видео ООН, выбранная председателем ('auto' = по фазе) */
  unLayout: UnLayout;
  /** сделки с участием вашей страны (ящик предложений) */
  offers: TradeOfferView[];
  /** реестр обещаний: публичные — всем, приватные — только сторонам (фича 11) */
  promises: PromiseRecord[];
  /** ваши разведдонесения (reveal + прослушка звонков) */
  spyIntel: SpyIntelReport[];
  /** активная прослушка чужого созвона (фича 12): цель сейчас на связи — клиент скрыто подключается */
  wiretap: { callId: string; targetCountryName: string; withCountryName: string } | null;
  /** сводка новостей этого года по странам (уже с искажениями шпионажа) */
  news:
    | {
        countryId: string;
        countryName: string;
        lines: string[];
        /** озвучка диктора — per строке (null пока не сгенерировано) */
        lineAudioUrls: (string | null)[];
        /** картинка-вставка (когда сгенерирована) */
        imageUrl: string | null;
      }[]
    | null;
  /** публичный счёт голосов ООН в этом году */
  voteTally: Record<string, { sanction: number; support: number }>;
  /** войны мира (публичные факты + личные поля участника) */
  wars: WarView[];
  /** счёт суда ООН по войнам с вердиктом pending (фаза un_vote): warId → голоса */
  warVoteTally: Record<string, { just: number; unjust: number }>;
  /** личная сводка прошедшего года (только в фазе year_summary, только своя) */
  yearReport: YearReport | null;
  /** публичные события последнего пересчёта (фаза Итогов) */
  lastResults: { countryId: string; countryName: string; lines: string[] }[] | null;
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
  /** обещание публичное (true) — попадает в общий список и оглашается в ООН; иначе приватное */
  promisePublic?: boolean;
}

/** Запись в реестре обещаний (фича 11). Без механических последствий — только видимость. */
export interface PromiseRecord {
  id: string;
  year: number;
  fromCountryId: string;
  fromName: string;
  toCountryId: string;
  toName: string;
  text: string;
  /** публичное (видят все, оглашается в ООН) или приватное (только стороны) */
  public: boolean;
}

/** Разведдонесение для своего экрана (результат успешной операции «Разведка»/«Прослушка звонков»). */
export interface SpyCallEntry {
  withCountryName: string;
  year: number;
  durationSec: number;
  ongoing: boolean;
}
export interface SpyIntelReport {
  year: number;
  targetCountryName: string;
  kind: 'reveal' | 'reveal_calls';
  /** для reveal */
  data?: {
    resources: Record<string, number>;
    sectors: Record<string, number>;
    dovolstvo: number;
    forbesTotal: number;
    declaredForbes: number | null;
  };
  /** для reveal_calls: с кем и как долго цель созванивалась */
  calls?: SpyCallEntry[];
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
  /** 🕊 мирное предложение: принятие сделки завершает эту войну */
  peaceWarId?: string;
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
