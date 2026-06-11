import {
  POPULATION_KEYS,
  RESOURCE_KEYS,
  SECTOR_KEYS,
  type Effects,
} from '@leaders/shared';
import type { CountryState } from './state.js';

/**
 * Однократное применение эффекта (выбор карты, итог голосования и т.п.):
 * — дельты ресурсов/населения/секторов/довольства применяются сразу;
 * — modifiers становятся перманентными модификаторами страны,
 *   кроме событийных special-ключей (printedMoney, repression),
 *   которые конвертируются в счётчики года.
 */
export function applyEffectsOnce(s: CountryState, effects: Effects): void {
  if (effects.resources) {
    for (const k of RESOURCE_KEYS) {
      if (effects.resources[k] !== undefined) {
        s.resources[k] = Math.max(0, s.resources[k] + effects.resources[k]!);
      }
    }
  }
  if (effects.population) {
    for (const k of POPULATION_KEYS) {
      if (effects.population[k] !== undefined) {
        s.population[k] = Math.max(0, s.population[k] + effects.population[k]!);
      }
    }
  }
  if (effects.sectors) {
    for (const k of SECTOR_KEYS) {
      if (effects.sectors[k] !== undefined) {
        s.sectors[k] = Math.max(0, Math.min(10, s.sectors[k] + effects.sectors[k]!));
      }
    }
  }
  if (effects.dovolstvo !== undefined) {
    s.dovolstvo = clamp01_100(s.dovolstvo + effects.dovolstvo);
  }
  if (effects.modifiers) {
    const { special, ...rest } = effects.modifiers;
    const keptSpecial: Record<string, number | boolean | string> = {};
    if (special) {
      for (const [k, v] of Object.entries(special)) {
        if (k === 'printedMoney' && typeof v === 'number') {
          s.printedThisYear += v;
        } else if (k === 'repression' && typeof v === 'number') {
          s.repressionsThisYear += v;
        } else {
          keptSpecial[k] = v;
        }
      }
    }
    const kept = { ...rest, ...(Object.keys(keptSpecial).length ? { special: keptSpecial } : {}) };
    if (Object.keys(kept).length > 0) s.permanentModifiers.push(kept);
  }
}

export function clamp01_100(v: number): number {
  return Math.max(0, Math.min(100, v));
}
