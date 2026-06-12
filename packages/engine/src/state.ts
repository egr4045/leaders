import type {
  Country,
  Effects,
  Modifiers,
  PopulationKey,
  ResourceKey,
  SectorKey,
} from '@leaders/shared';
import type { GameContent } from './content/load.js';

export interface DelayedEntry {
  dueYear: number;
  effects: Effects;
  description?: string;
}

/** Чужая глобальная аура (чудо), действующая на эту страну. */
export interface ExternalAura {
  statusId: string;
  ownerCountryId: string;
  effects: {
    modifiers?: Modifiers;
    sectors?: Partial<Record<SectorKey, number>>;
  };
}

/** Статус с истечением (контрибуция «Побеждённый», «причина войны» и т.п.). */
export interface TimedStatus {
  statusId: string;
  /** статус снимается, когда world.year достигает untilYear */
  untilYear: number;
}

// ---------- Война ----------

export interface WarSide {
  /** [0] = лидер стороны (объявивший / цель) */
  countryIds: string[];
  /** СЕКРЕТ: вложения денег за текущий год по странам; сбрасывается каждый тик */
  investedThisYear: Record<string, number>;
  /** публичный счёт выигранных годовых битв */
  score: number;
}

export interface WarState {
  id: string;
  startedYear: number;
  /** текст-обоснование агрессора (публичен) */
  casusBelli: string;
  attacker: WarSide;
  defender: WarSide;
  status: 'active' | 'ended';
  /** вердикт суда ООН (постфактум) */
  unVerdict: 'pending' | 'just' | 'unjust';
  endedYear?: number;
  /** null = мирный договор без победителя */
  winnerSide?: 'attacker' | 'defender' | null;
  /** нерастраченные очки победителя (тратит лидер победившей стороны) */
  victorPointsRemaining: number;
}

/** Полное (скрытое) состояние одной страны. Никогда не уходит клиенту целиком. */
export interface CountryState {
  id: string;
  /** казна = личное состояние лидера (непотраченное идёт в Форбс) */
  resources: Record<ResourceKey, number>;
  population: Record<PopulationKey, number>;
  /** базовые уровни секторов (перманентные изменения от карт) */
  sectors: Record<SectorKey, number>;
  dovolstvo: number;
  sciencePoints: number;
  /** курс валюты страны к «мировой» (старт 1, съедается инфляцией) */
  moneyRate: number;
  /** инфляция прошлого года (доля) */
  inflation: number;
  activeStatuses: string[];
  /** перманентные модификаторы от выборов карт */
  permanentModifiers: Modifiers[];
  delayed: DelayedEntry[];
  /** напечатано денег в этом году (разгоняет инфляцию) */
  printedThisYear: number;
  /** репрессивных действий в этом году (роняет довольство, гонит умников) */
  repressionsThisYear: number;
  /** активные санкции ООН (штук) */
  sanctions: number;
  /** всего санкций получено за партию (для квестов) */
  sanctionsReceivedTotal: number;
  wondersBuilt: string[];
  coups: number;
  yearsInPower: number;
  usedCards: string[];
  /** баланс еды прошлого пересчёта: запас − потребление */
  lastFoodBalance: number;
  /** потребление еды прошлого пересчёта */
  lastFoodConsumption: number;
  /** id личного квеста лидера */
  questId: string | null;
  /** публично заявленный Форбс (блеф); null = ещё не заявлял */
  declaredForbes: number | null;
  /** накопленные инвестиции по секторам (бюджетный механик) */
  sectorInvestment: Partial<Record<SectorKey, number>>;
  /** чужие глобальные ауры; пересобирается recomputeAuras(), не редактировать руками */
  externalAuras: ExternalAura[];
  /** статусы с истечением (untilYear); чистятся в начале тика */
  timedStatuses: TimedStatus[];
}

export interface WorldState {
  year: number;
  /** страны по id */
  countries: Map<string, CountryState>;
  /** какие чудеса уже заняты: wonderId → countryId */
  wondersTaken: Map<string, string>;
  seed: number;
  /** войны мира (активные и завершённые) */
  wars: WarState[];
}

export function createCountryState(country: Country, questId: string | null = null): CountryState {
  return {
    id: country.id,
    resources: { ...country.startResources },
    population: { ...country.startPopulation },
    sectors: { ...country.startSectors },
    dovolstvo: 60,
    sciencePoints: 0,
    moneyRate: 1,
    inflation: 0,
    activeStatuses: [
      ...new Set([...country.startStatuses, ...country.uniquePerks, ...country.uniqueWeaknesses]),
    ],
    permanentModifiers: [],
    delayed: [],
    printedThisYear: 0,
    repressionsThisYear: 0,
    sanctions: 0,
    sanctionsReceivedTotal: 0,
    wondersBuilt: [],
    coups: 0,
    yearsInPower: 0,
    usedCards: [],
    lastFoodBalance: 0,
    lastFoodConsumption: 0,
    questId,
    declaredForbes: null,
    sectorInvestment: {},
    externalAuras: [],
    timedStatuses: [],
  };
}

export function createWorld(
  content: GameContent,
  countryIds: string[],
  seed: number,
  questByCountry: Record<string, string | null> = {},
): WorldState {
  const countries = new Map<string, CountryState>();
  for (const id of countryIds) {
    const def = content.countries.get(id);
    if (!def) throw new Error(`Неизвестная страна: ${id}`);
    const state = createCountryState(def, questByCountry[id] ?? null);
    state.dovolstvo = content.tunables.dovolstvo.start;
    countries.set(id, state);
  }
  return { year: 1, countries, wondersTaken: new Map(), seed, wars: [] };
}

export function totalPopulation(s: CountryState): number {
  return Object.values(s.population).reduce((a, b) => a + b, 0);
}

/** JSON-представление мира для Redis/БД. */
export interface WorldStateJson {
  year: number;
  countries: Record<string, CountryState>;
  wondersTaken: Record<string, string>;
  seed: number;
  wars?: WarState[];
}

export function serializeWorld(w: WorldState): WorldStateJson {
  return {
    year: w.year,
    countries: Object.fromEntries(w.countries),
    wondersTaken: Object.fromEntries(w.wondersTaken),
    seed: w.seed,
    wars: w.wars,
  };
}

export function deserializeWorld(j: WorldStateJson): WorldState {
  const countries = new Map(Object.entries(j.countries));
  // дефолты для миров, сохранённых до Э10 (живые комнаты в Redis)
  for (const s of countries.values()) {
    s.externalAuras ??= [];
    s.timedStatuses ??= [];
  }
  return {
    year: j.year,
    countries,
    wondersTaken: new Map(Object.entries(j.wondersTaken)),
    seed: j.seed,
    wars: j.wars ?? [],
  };
}
