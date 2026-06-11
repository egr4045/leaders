import type { GameContent } from './content/load.js';
import type { CountryState, WorldState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import type { Rng } from './rng.js';

/**
 * Шпионаж (раздел 9). Действия заказываются в Кабинете, влияют на ООН/чужие статы.
 * conceal — умолчать о своём факте в сводке;
 * insert_lie — вставить ложь от имени другой страны;
 * reveal — вскрыть скрытые статы/реальный Форбс соседа;
 * steal_science / wreck_wonder — саботаж.
 */
export type SpyActionKind = 'conceal' | 'insert_lie' | 'reveal' | 'steal_science' | 'wreck_wonder';

export interface SpyOutcome {
  success: boolean;
  /** шанс, с которым кидали кубик (для дебага/баланса) */
  chance: number;
}

/** Шанс успеха: Разведка атакующего vs защита цели (Разведка + взвешенные СМИ). */
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
  // conceal — действие над собственной сводкой, всегда успешно (своё СМИ молчит само)
  if (kind === 'conceal' && attacker.id === target.id) return { success: true, chance: 1 };

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
      // срываем последнее построенное чудо цели: чудо «освобождается» в мир
      const wonderId = target.wondersBuilt.pop();
      if (wonderId) {
        target.activeStatuses = target.activeStatuses.filter((id) => id !== wonderId);
        world.wondersTaken.delete(wonderId);
      }
      break;
    }
    // conceal/insert_lie/reveal меняют только информацию — их полезную нагрузку
    // (текст лжи, раскрытые статы) обрабатывает сервер по факту success
    default:
      break;
  }
  return { success, chance };
}
