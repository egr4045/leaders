import type { GameContent } from './content/load.js';
import type { CountryState, WarSide, WarState, WorldState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import type { Rng } from './rng.js';
import type { YearEvent } from './tick.js';

export class WarError extends Error {}

export type WarRewardKind = 'loot' | 'kontributsiya';

/** id статуса-контрибуции (контент: content/statuses/status_pobezhdyonny.json) */
export const DEFEATED_STATUS_ID = 'status_pobezhdyonny';

function mustCountry(world: WorldState, id: string): CountryState {
  const s = world.countries.get(id);
  if (!s) throw new WarError(`Неизвестная страна: ${id}`);
  return s;
}

function newSide(leaderId: string): WarSide {
  return { countryIds: [leaderId], investedThisYear: {}, score: 0 };
}

export function activeWars(world: WorldState): WarState[] {
  return world.wars.filter((w) => w.status === 'active');
}

export function warParticipants(war: WarState): string[] {
  return [...war.attacker.countryIds, ...war.defender.countryIds];
}

export function sideOf(war: WarState, countryId: string): 'attacker' | 'defender' | null {
  if (war.attacker.countryIds.includes(countryId)) return 'attacker';
  if (war.defender.countryIds.includes(countryId)) return 'defender';
  return null;
}

/** Объявление войны: атакующий против цели, война активна сразу, ООН судит постфактум. */
export function declareWar(
  world: WorldState,
  attackerId: string,
  defenderId: string,
  casusBelli: string,
  content: GameContent,
): WarState {
  if (attackerId === defenderId) throw new WarError('Нельзя воевать с собой');
  mustCountry(world, defenderId);
  const attacker = mustCountry(world, attackerId);
  // уже воюют друг с другом?
  for (const w of activeWars(world)) {
    const a = sideOf(w, attackerId);
    const d = sideOf(w, defenderId);
    if (a && d && a !== d) throw new WarError('Вы уже воюете с этой страной');
  }
  const cost = content.tunables.war.declareCostInfluence;
  if (attacker.resources.influence < cost) {
    throw new WarError(`Нужно ${cost} влияния, чтобы объявить войну`);
  }
  attacker.resources.influence -= cost;

  const war: WarState = {
    id: `war_${world.year}_${attackerId}_${defenderId}_${world.wars.length}`,
    startedYear: world.year,
    casusBelli,
    attacker: newSide(attackerId),
    defender: newSide(defenderId),
    status: 'active',
    unVerdict: 'pending',
    victorPointsRemaining: 0,
  };
  world.wars.push(war);
  return war;
}

/** Вступление третьей страны в коалицию на выбранной стороне. */
export function joinWar(
  world: WorldState,
  war: WarState,
  countryId: string,
  side: 'attacker' | 'defender',
): void {
  if (war.status !== 'active') throw new WarError('Война уже окончена');
  mustCountry(world, countryId);
  if (sideOf(war, countryId)) throw new WarError('Вы уже участвуете в этой войне');
  war[side].countryIds.push(countryId);
}

/** Вложение денег в военную кампанию (секретно, действует на ближайшую битву). */
export function investInWar(
  world: WorldState,
  war: WarState,
  countryId: string,
  amount: number,
): void {
  if (war.status !== 'active') throw new WarError('Война уже окончена');
  const side = sideOf(war, countryId);
  if (!side) throw new WarError('Вы не участвуете в этой войне');
  const s = mustCountry(world, countryId);
  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt <= 0) throw new WarError('Сумма должна быть больше нуля');
  if (s.resources.money < amt) throw new WarError('Не хватает денег');
  s.resources.money -= amt;
  const inv = war[side].investedThisYear;
  inv[countryId] = (inv[countryId] ?? 0) + amt;
}

/**
 * Сила стороны. opts.hidden=true — полная (скрытые статусы через aggregateModifiers,
 * включая special.warStrength); false — публичная оценка по базовым секторам.
 * opts.invest=true — учитывать вложения этого года (секрет).
 */
export function sideStrength(
  world: WorldState,
  side: WarSide,
  content: GameContent,
  opts: { hidden: boolean; invest: boolean },
): number {
  const t = content.tunables.war;
  let total = 0;
  for (const id of side.countryIds) {
    const s = world.countries.get(id);
    if (!s) continue;
    if (opts.hidden) {
      const eff = aggregateModifiers(s, content);
      total += effectiveSector(s, eff, 'army') * t.armyWeightPerLevel;
      const ws = eff.special.warStrength;
      if (typeof ws === 'number') total += ws;
    } else {
      // публичная оценка: базовый уровень армии без временных добавок статусов
      total += Math.max(0, Math.min(12, s.sectors.army)) * t.armyWeightPerLevel;
    }
    total += s.population.siloviki * t.silovikiWeight;
    if (opts.invest) {
      total += ((side.investedThisYear[id] ?? 0) / 100) * t.investStrengthPer100;
    }
  }
  return total;
}

/** Шанс победы стороны A в битве (формула в духе spySuccessChance, кламп 5–95%). */
export function battleWinChance(
  myStrength: number,
  theirStrength: number,
  content: GameContent,
): number {
  const chance = 0.5 + (myStrength - theirStrength) * content.tunables.war.battlePerPointDelta;
  return Math.max(0.05, Math.min(0.95, chance));
}

/**
 * Годовые битвы всех активных войн (шаг 0 tick).
 * Победитель года: score += 1. Все участники платят содержание (деньги, силовики,
 * довольство — ДО шага довольства, чтобы переворот видел усталость).
 * Разрыв ≥ decisiveScoreGap → решающая победа, очки победителя = разрыв × коэф.
 */
export function resolveWarBattles(world: WorldState, content: GameContent, rng: Rng): YearEvent[] {
  const t = content.tunables.war;
  const events: YearEvent[] = [];

  for (const war of activeWars(world)) {
    const atkStr = sideStrength(world, war.attacker, content, { hidden: true, invest: true });
    const defStr = sideStrength(world, war.defender, content, { hidden: true, invest: true });
    const atkChance = battleWinChance(atkStr, defStr, content);
    const attackerWon = rng() < atkChance;
    const winnerSide = attackerWon ? war.attacker : war.defender;
    const loserSide = attackerWon ? war.defender : war.attacker;
    winnerSide.score += 1;

    const leaderName = (id: string) => content.countries.get(id)?.name ?? id;
    const sideName = (sd: WarSide) => sd.countryIds.map(leaderName).join(' + ');
    const matchup = `${sideName(war.attacker)} ⚔ ${sideName(war.defender)}`;
    const winnerName = leaderName(winnerSide.countryIds[0]!);
    const battleLine = `«${matchup}» — победа в битве года за «${winnerName}» (счёт ${war.attacker.score}:${war.defender.score})`;

    // содержание войны и потери — каждому участнику, с явным отчётом о цене
    for (const id of warParticipants(war)) {
      const s = world.countries.get(id);
      if (!s) continue;
      const won = winnerSide.countryIds.includes(id);
      const moneyBefore = s.resources.money;
      const silovikiBefore = s.population.siloviki;
      s.resources.money = Math.max(0, s.resources.money * (1 - t.upkeepMoneyPct));
      s.population.siloviki = Math.max(
        0,
        s.population.siloviki * (1 - (won ? t.attritionWinnerPct : t.attritionLoserPct)),
      );
      s.dovolstvo = Math.max(0, s.dovolstvo - t.warWearinessDovolstvo);
      const moneyLost = Math.round(moneyBefore - s.resources.money);
      const silovikiLost = Math.round(silovikiBefore - s.population.siloviki);
      // счёт — публичная пропаганда; цена войны — личная (скрыта от чужих сводок)
      events.push({ countryId: id, kind: 'war', text: battleLine });
      events.push({
        countryId: id,
        kind: 'war',
        text: `Цена войны «${matchup}»: −${moneyLost} денег, −${silovikiLost} силовиков, −${t.warWearinessDovolstvo} довольства`,
        hidden: true,
      });
    }

    // сброс годовых вложений
    war.attacker.investedThisYear = {};
    war.defender.investedThisYear = {};

    // решающая победа?
    const gap = Math.abs(war.attacker.score - war.defender.score);
    if (gap >= t.decisiveScoreGap) {
      war.status = 'ended';
      war.endedYear = world.year;
      war.winnerSide = war.attacker.score > war.defender.score ? 'attacker' : 'defender';
      war.victorPointsRemaining = gap * t.victorPointsPerScoreGap;

      // союзники проигравшей стороны платят влиянием
      const losers = war.winnerSide === 'attacker' ? war.defender : war.attacker;
      for (const id of losers.countryIds.slice(1)) {
        const ally = world.countries.get(id);
        if (ally) {
          ally.resources.influence = Math.max(
            0,
            ally.resources.influence - t.allyDefeatInfluencePenalty,
          );
          events.push({
            countryId: id,
            kind: 'war',
            text: `Поражение коалиции: −${t.allyDefeatInfluencePenalty} влияния`,
            hidden: true,
          });
        }
      }
      const winnerLeaderName = leaderName(war[war.winnerSide].countryIds[0]!);
      const line = `Война окончена решающей победой стороны «${winnerLeaderName}» (${war.attacker.score}:${war.defender.score})`;
      for (const id of warParticipants(war)) {
        events.push({ countryId: id, kind: 'war', text: line });
      }
    }
  }
  return events;
}

/** Мирный договор (через принятый трейд-оффер): война окончена без победителя. */
export function endWarByPeace(world: WorldState, warId: string): WarState {
  const war = world.wars.find((w) => w.id === warId);
  if (!war) throw new WarError('Война не найдена');
  if (war.status !== 'active') throw new WarError('Война уже окончена');
  war.status = 'ended';
  war.endedYear = world.year;
  war.winnerSide = null;
  war.victorPointsRemaining = 0;
  return war;
}

/**
 * Трата очков победителя лидером победившей стороны.
 * loot: грабёж % ресурсов лидера проигравших.
 * kontributsiya: проигравший получает «Побеждённый» на N лет + разовая дань;
 * победитель — форбс-легаси и влияние.
 */
export function applyVictorReward(
  world: WorldState,
  war: WarState,
  winnerId: string,
  kind: WarRewardKind,
  content: GameContent,
): { description: string } {
  const t = content.tunables.war;
  if (war.status !== 'ended' || !war.winnerSide) throw new WarError('Нет решающей победы');
  const winnerSideObj = war[war.winnerSide];
  if (winnerSideObj.countryIds[0] !== winnerId) {
    throw new WarError('Награды распределяет лидер победившей стороны');
  }
  const loserLeaderId = (war.winnerSide === 'attacker' ? war.defender : war.attacker).countryIds[0]!;
  const winner = mustCountry(world, winnerId);
  const loser = mustCountry(world, loserLeaderId);

  const cost = kind === 'loot' ? t.lootCostPoints : t.kontributsiyaCostPoints;
  if (war.victorPointsRemaining < cost) {
    throw new WarError(`Нужно ${cost} очков победителя (осталось ${war.victorPointsRemaining})`);
  }
  war.victorPointsRemaining -= cost;

  if (kind === 'loot') {
    const money = Math.round(loser.resources.money * t.lootPct);
    const gold = Math.round(loser.resources.gold * t.lootPct);
    const food = Math.round(loser.resources.food * t.lootPct);
    loser.resources.money -= money;
    loser.resources.gold -= gold;
    loser.resources.food -= food;
    winner.resources.money += money;
    winner.resources.gold += gold;
    winner.resources.food += food;
    return { description: `Грабёж: +${money} денег, +${gold} золота, +${food} еды` };
  }

  // контрибуция
  const tribute = Math.round(loser.resources.money * t.kontributsiyaTributePct);
  loser.resources.money -= tribute;
  winner.resources.money += tribute;
  if (!loser.activeStatuses.includes(DEFEATED_STATUS_ID)) {
    loser.activeStatuses.push(DEFEATED_STATUS_ID);
  }
  // продлеваем срок, если статус уже висел
  loser.timedStatuses = loser.timedStatuses.filter((ts) => ts.statusId !== DEFEATED_STATUS_ID);
  loser.timedStatuses.push({
    statusId: DEFEATED_STATUS_ID,
    untilYear: world.year + t.kontributsiyaYears,
  });
  winner.permanentModifiers.push({ forbesLegacy: t.kontributsiyaWinnerForbes });
  return {
    description: `Контрибуция: дань ${tribute} денег, противник «Побеждённый» на ${t.kontributsiyaYears} лет`,
  };
}

/** Снятие просроченных временных статусов (вызывается в начале тика). */
export function expireTimedStatuses(world: WorldState): YearEvent[] {
  const events: YearEvent[] = [];
  for (const s of world.countries.values()) {
    const expired = (s.timedStatuses ?? []).filter((ts) => ts.untilYear <= world.year);
    if (expired.length === 0) continue;
    s.timedStatuses = s.timedStatuses.filter((ts) => ts.untilYear > world.year);
    for (const ts of expired) {
      s.activeStatuses = s.activeStatuses.filter((id) => id !== ts.statusId);
      events.push({
        countryId: s.id,
        kind: 'status',
        text: 'Срок контрибуции истёк — страна вновь свободна',
      });
    }
  }
  return events;
}
