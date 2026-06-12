import type { GameContent } from './content/load.js';
import type { CountryState, WorldState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import type { Rng } from './rng.js';

export type SpyActionKind =
  | 'reveal'
  | 'steal_science'
  | 'wreck_wonder'
  | 'steal_money'
  | 'steal_food'
  | 'steal_gold'
  | 'provoke_riot'
  | 'assassinate_minister';

export interface SpyOutcome {
  success: boolean;
  chance: number;
}

export function spySuccessChance(
  attacker: CountryState,
  target: CountryState,
  content: GameContent,
): number {
  const t = content.tunables.spy;
  const aEff = aggregateModifiers(attacker, content);
  const dEff = aggregateModifiers(target, content);
  const atk = effectiveSector(attacker, aEff, 'intel');
  const def =
    effectiveSector(target, dEff, 'intel') +
    effectiveSector(target, dEff, 'smi') * t.defenseSmiWeight;
  const chance = t.baseSuccess + (atk - def) * t.perLevelDelta;
  return Math.max(0.05, Math.min(0.95, chance));
}

export function resolveSpyAction(
  attacker: CountryState,
  target: CountryState,
  kind: SpyActionKind,
  world: WorldState,
  content: GameContent,
  rng: Rng,
): SpyOutcome {
  const chance = spySuccessChance(attacker, target, content);
  const success = rng() < chance;
  if (!success) return { success, chance };

  switch (kind) {
    case 'steal_science': {
      const stolen = Math.min(target.sciencePoints, 50);
      target.sciencePoints -= stolen;
      attacker.sciencePoints += stolen;
      break;
    }
    case 'wreck_wonder': {
      const wonderId = target.wondersBuilt.pop();
      if (wonderId) {
        target.activeStatuses = target.activeStatuses.filter((id) => id !== wonderId);
        world.wondersTaken.delete(wonderId);
      }
      break;
    }
    case 'steal_money': {
      const stolen = Math.round(target.resources.money * 0.15);
      target.resources.money -= stolen;
      attacker.resources.money += stolen;
      break;
    }
    case 'steal_food': {
      const stolen = Math.round(target.resources.food * 0.25);
      target.resources.food -= stolen;
      attacker.resources.food += stolen;
      break;
    }
    case 'steal_gold': {
      const stolen = Math.round(target.resources.gold * 0.1);
      target.resources.gold -= stolen;
      attacker.resources.gold += stolen;
      break;
    }
    case 'provoke_riot': {
      target.dovolstvo = Math.max(0, target.dovolstvo - 15);
      break;
    }
    case 'assassinate_minister': {
      target.population.ministry = Math.max(0, target.population.ministry - 1);
      target.delayed.push({
        dueYear: world.year + 1,
        effects: { modifiers: { ministerUpkeepMult: 2 } } as unknown as import('@leaders/shared').Effects,
        description: 'Убийство министра — аппарат в панике, расходы на лояльность выросли',
      });
      break;
    }
    // reveal — сервер обрабатывает раскрытие данных по факту success
    default:
      break;
  }
  return { success, chance };
}
