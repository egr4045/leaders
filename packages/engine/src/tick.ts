import type { GameContent } from './content/load.js';
import type { CountryState, WorldState } from './state.js';
import { totalPopulation } from './state.js';
import { aggregateModifiers, effectiveSector, type EffectiveModifiers } from './modifiers.js';
import { applyEffectsOnce, clamp01_100 } from './effects.js';
import { recomputeStatuses, type ComboEvent } from './combo.js';
import { recomputeAuras } from './auras.js';
import { expireTimedStatuses, resolveWarBattles } from './war.js';
import { makeRng, type Rng } from './rng.js';

/** Событие года для генерации новостей (Э6). */
export interface YearEvent {
  countryId: string;
  kind:
    | 'production'
    | 'golod'
    | 'inflation'
    | 'giperinflyaciya'
    | 'dovolstvo'
    | 'coup'
    | 'delayed'
    | 'status'
    | 'population'
    | 'war';
  text: string;
  /** скрытое событие не попадает в публичную сводку само по себе */
  hidden?: boolean;
}

export interface TickReport {
  year: number;
  events: YearEvent[];
  comboEvents: { countryId: string; event: ComboEvent }[];
}

/**
 * Годовой пересчёт (фаза Итогов, раздел 4.3). Порядок важен:
 * [0: ауры, истечение статусов, битвы войн] → производство → еда →
 * инфляция → довольство → население → отложенные эффекты →
 * комбо-статусы → переворот.
 */
export function tick(world: WorldState, content: GameContent, rng?: Rng): TickReport {
  const t = content.tunables;
  const report: TickReport = { year: world.year, events: [], comboEvents: [] };

  // --- 0. Мировые механики (Э10): ауры чудес, временные статусы, войны ---
  // битвы — до пер-странового цикла: усталость войны должна попасть
  // под шаг довольства/переворота этого же года
  recomputeAuras(world, content);
  report.events.push(...expireTimedStatuses(world));
  report.events.push(...resolveWarBattles(world, content, rng ?? makeRng(world.seed + world.year)));

  for (const s of world.countries.values()) {
    const eff = aggregateModifiers(s, content);
    const ev = (kind: YearEvent['kind'], text: string, hidden = false) =>
      report.events.push({ countryId: s.id, kind, text, hidden });

    // --- 1. Производство и содержание ---
    const scienceMult =
      effectiveSector(s, eff, 'science') * t.economy.scienceMultPerLevel + eff.scienceMult;
    const economyFactor = 1 + effectiveSector(s, eff, 'economy') * t.production.economyIncomePerLevel;

    const moneyIncome =
      s.population.rabotyagi *
      t.production.moneyPerRabotyaga *
      eff.outputMult.rabotyagi *
      (1 + scienceMult) *
      economyFactor;
    const foodIncome =
      s.population.rabotyagi *
      t.production.foodPerRabotyaga *
      eff.outputMult.rabotyagi *
      (1 + scienceMult) *
      economyFactor;
    const influenceIncome =
      s.population.mediyshchiki *
      t.production.influencePerMediyshchik *
      eff.outputMult.mediyshchiki *
      (1 + effectiveSector(s, eff, 'smi') * t.production.smiInfluencePerLevel);
    const scienceIncome =
      s.population.umniki * t.production.sciencePerUmnik * eff.outputMult.umniki * (1 + scienceMult);

    const upkeepMult = typeof eff.special.ministerUpkeepMult === 'number' ? eff.special.ministerUpkeepMult : 1;
    const ministerCost = s.population.ministry * t.economy.ministerUpkeep * upkeepMult;

    s.resources.money = Math.max(0, s.resources.money + moneyIncome - ministerCost);
    s.resources.food += foodIncome;
    s.resources.influence += influenceIncome;
    s.sciencePoints += scienceIncome;

    // наука конвертируется в уровни сектора
    while (s.sciencePoints >= t.production.sciencePerSectorLevel && s.sectors.science < 10) {
      s.sciencePoints -= t.production.sciencePerSectorLevel;
      s.sectors.science += 1;
      ev('status', `Наука выросла до уровня ${s.sectors.science}`);
    }

    ev(
      'production',
      `Доход: +${Math.round(moneyIncome)} денег, +${Math.round(foodIncome)} еды; министры съели ${Math.round(ministerCost)}`,
      true,
    );

    // --- 2. Еда ---
    const consumption = totalPopulation(s) * t.economy.foodPerCapita * eff.foodPerCapitaMult;
    s.lastFoodConsumption = consumption;
    s.lastFoodBalance = s.resources.food - consumption;
    s.resources.food = Math.max(0, s.resources.food - consumption);
    const golod = s.lastFoodBalance < 0;
    if (golod) ev('golod', 'В стране голод: запасы еды кончились');

    // --- 3. Инфляция и курс ---
    const immune = Boolean(eff.special.inflationImmunity);
    const inflation = Math.max(
      0,
      t.economy.inflationBase +
        (s.printedThisYear / 100) * t.economy.inflationPerPrinted100 +
        s.sanctions * t.economy.inflationPerSanction -
        effectiveSector(s, eff, 'economy') * t.economy.inflationEconomyRelief +
        eff.inflationDelta,
    );
    s.inflation = immune ? 0 : inflation;
    if (!immune) s.moneyRate *= 1 - s.inflation;
    if (s.inflation >= 0.2) ev('giperinflyaciya', 'Гиперинфляция: цены растут быстрее зарплат');
    else if (s.inflation > 0) ev('inflation', `Инфляция за год: ${(s.inflation * 100).toFixed(1)}%`, true);

    // --- 4. Довольство ---
    const surplusPct = consumption > 0 ? Math.max(0, s.lastFoodBalance) / consumption : 0;
    const wealthPerCapita = s.resources.money / Math.max(1, totalPopulation(s));
    const delta =
      surplusPct * 10 * t.dovolstvo.foodSurplusCoef +
      effectiveSector(s, eff, 'smi') * t.dovolstvo.smiCoef +
      wealthPerCapita * t.dovolstvo.wealthCoef -
      (golod ? t.dovolstvo.hungerPenalty : 0) -
      (s.inflation * 100 / 10) * t.dovolstvo.inflationPenalty -
      s.repressionsThisYear * t.dovolstvo.repressionPenalty -
      t.dovolstvo.baselineDecay +
      eff.dovolstvoDrift;
    s.dovolstvo = clamp01_100(s.dovolstvo + delta);
    ev('dovolstvo', `Довольство: ${Math.round(s.dovolstvo)}/100`, true);

    // --- 5. Население ---
    applyPopulationChanges(s, eff, golod, content, ev);

    // --- 6. Отложенные эффекты ---
    const due = s.delayed.filter((d) => d.dueYear <= world.year);
    s.delayed = s.delayed.filter((d) => d.dueYear > world.year);
    for (const d of due) {
      applyEffectsOnce(s, d.effects);
      ev('delayed', d.description ?? 'Старое решение аукнулось');
    }

    // --- 7. Комбо-статусы ---
    for (const event of recomputeStatuses(s, content)) {
      report.comboEvents.push({ countryId: s.id, event });
      const st = content.statuses.get(event.statusId)!;
      ev('status', event.kind === 'activated' ? `Теперь: «${st.name}»` : `Больше не: «${st.name}»`);
    }

    // --- 8. Переворот ---
    const silovikiShare = s.population.siloviki / Math.max(1, totalPopulation(s));
    const coupImmune = Boolean(aggregateModifiers(s, content).special.coupImmunity);
    if (
      s.dovolstvo < t.coup.dovolstvoThreshold &&
      silovikiShare < t.coup.silovikiMinShare &&
      !coupImmune
    ) {
      s.resources.money *= 1 - t.coup.moneyPenalty;
      s.resources.influence *= 0.5;
      s.dovolstvo = 50;
      s.coups += 1;
      s.yearsInPower = 0;
      // режим сметают: все статусы exclusiveGroup="regime" снимаются
      s.activeStatuses = s.activeStatuses.filter(
        (id) => content.statuses.get(id)?.exclusiveGroup !== 'regime',
      );
      ev('coup', 'ПЕРЕВОРОТ! Дворец взят, казна «эвакуирована», режим сменился');
    } else {
      s.yearsInPower += 1;
    }

    // --- 9. Сброс годовых счётчиков ---
    s.printedThisYear = 0;
    s.repressionsThisYear = 0;
    s.usedCards = [];
  }

  world.year += 1;
  return report;
}

function applyPopulationChanges(
  s: CountryState,
  eff: EffectiveModifiers,
  golod: boolean,
  content: GameContent,
  ev: (kind: YearEvent['kind'], text: string, hidden?: boolean) => void,
): void {
  const t = content.tunables;
  const before = totalPopulation(s);

  for (const key of Object.keys(s.population) as (keyof typeof s.population)[]) {
    let n = s.population[key];
    if (golod) {
      n *= 1 - t.population.hungerDecline;
    } else {
      // прирост зависит от состояния страны
      let growth = t.population.baseGrowth;
      if (key === 'rabotyagi' && s.sectors.economy >= 7) growth *= 1.5;
      if (key === 'umniki' && s.sectors.science >= 7 && s.dovolstvo >= 50) growth *= 1.5;
      if (key === 'umniki' && s.dovolstvo < 30) growth = 0; // умники не рожают в депрессии
      n *= 1 + growth;
    }
    // эмиграция от статусов/режимов
    n *= 1 - Math.min(0.9, eff.emigration[key]);
    // глобальный популяционный модификатор (голод, болезни и т.п.)
    if (eff.populationMult !== 0) n *= 1 + eff.populationMult;
    s.population[key] = Math.max(0, n);
  }

  // репрессии гонят умников отдельно
  if (s.repressionsThisYear > 0) {
    const flight = Math.min(0.9, s.repressionsThisYear * t.population.umnikiFlightPerRepression);
    s.population.umniki *= 1 - flight;
    ev('population', 'Умники пакуют чемоданы: репрессии', true);
  }

  const after = totalPopulation(s);
  if (after < before * 0.97) ev('population', 'Население заметно убыло');
}
