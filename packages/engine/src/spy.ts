import type { GameContent } from './content/load.js';
import type { CountryState, WorldState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import type { Rng } from './rng.js';

export type SpyActionKind =
  | 'reveal'
  | 'steal_science'
  | 'financial_sabotage'
  | 'provoke_riot'
  | 'assassinate_minister';

export interface SpyOutcome {
  success: boolean;
  chance: number;
}

const ACTION_BASE_CHANCES: Record<SpyActionKind, number> = {
  reveal: 0.70,
  steal_science: 0.50,
  financial_sabotage: 0.40,
  provoke_riot: 0.30,
  assassinate_minister: 0.20,
};

export function spySuccessChance(
  attacker: CountryState,
  target: CountryState,
  content: GameContent,
  kind?: SpyActionKind, // optional for backward compatibility in UI
): number {
  const t = content.tunables.spy;
  const aEff = aggregateModifiers(attacker, content);
  const dEff = aggregateModifiers(target, content);

  const getPopShare = (c: CountryState, key: keyof CountryState['population']) => {
    const sum = c.population.rabotyagi + c.population.umniki + c.population.siloviki + c.population.mediyshchiki + c.population.ministry;
    return sum > 0 ? c.population[key] / sum : 0;
  };

  const aUmnikiPts = getPopShare(attacker, 'umniki') * 10;
  const atk = effectiveSector(attacker, aEff, 'intel') + aUmnikiPts;

  let defSilovikiPts = getPopShare(target, 'siloviki') * 10;
  if (target.dovolstvo < 30) {
    defSilovikiPts -= 1; // народ сам сдает секреты
  }

  const def =
    effectiveSector(target, dEff, 'intel') +
    effectiveSector(target, dEff, 'smi') * t.defenseSmiWeight +
    defSilovikiPts;

  const base = kind ? (ACTION_BASE_CHANCES[kind] ?? 0.5) : 0.5;
  const chance = base + (atk - def) * 0.05; // 5% per level delta
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
  const chance = spySuccessChance(attacker, target, content, kind);
  const success = rng() < chance;
  if (!success) return { success, chance };

  switch (kind) {
    case 'steal_science': {
      const stolen = Math.min(target.sciencePoints, 50);
      target.sciencePoints -= stolen;
      attacker.sciencePoints += stolen;
      break;
    }
    case 'financial_sabotage': {
      const stolenMoney = Math.round(target.resources.money * 0.15);
      const stolenGold = Math.round(target.resources.gold * 0.10);
      target.resources.money -= stolenMoney;
      attacker.resources.money += stolenMoney;
      target.resources.gold -= stolenGold;
      attacker.resources.gold += stolenGold;
      
      target.delayed.push({
        dueYear: world.year + 1,
        effects: { resources: { money: 0 } } as unknown as import('@leaders/shared').Effects,
        description: `⚠️ Внимание! В результате финансовой диверсии из казны пропало ${stolenMoney} денег и ${stolenGold} золота.`,
      });
      break;
    }
    case 'provoke_riot': {
      target.dovolstvo = Math.max(0, target.dovolstvo - 20);
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
