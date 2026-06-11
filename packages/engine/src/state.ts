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
}

export interface WorldState {
  year: number;
  /** страны по id */
  countries: Map<string, CountryState>;
  /** какие чудеса уже заняты: wonderId → countryId */
  wondersTaken: Map<string, string>;
  seed: number;
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
  return { year: 1, countries, wondersTaken: new Map(), seed };
}

export function totalPopulation(s: CountryState): number {
  return Object.values(s.population).reduce((a, b) => a + b, 0);
}
