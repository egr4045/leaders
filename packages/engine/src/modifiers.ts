import {
  POPULATION_KEYS,
  SECTOR_KEYS,
  type Modifiers,
  type PopulationKey,
  type SectorKey,
} from '@leaders/shared';
import type { GameContent } from './content/load.js';
import type { CountryState } from './state.js';

/** Свёртка всех активных модификаторов страны (статусы + перманентные от карт). */
export interface EffectiveModifiers {
  scienceMult: number; // сумма бонусов
  inflationDelta: number; // сумма
  dovolstvoDrift: number; // сумма
  outputMult: Record<PopulationKey, number>; // произведение
  emigration: Record<PopulationKey, number>; // сумма долей
  foodPerCapitaMult: number; // произведение
  populationMult: number; // сумма долей (-0.05 = −5%/год ко всем классам)
  forbesLegacy: number; // сумма
  special: Record<string, number | boolean | string>;
  /** временные добавки к секторам от активных статусов */
  sectorAdds: Record<SectorKey, number>;
}

function emptyEffective(): EffectiveModifiers {
  return {
    scienceMult: 0,
    inflationDelta: 0,
    dovolstvoDrift: 0,
    outputMult: { rabotyagi: 1, umniki: 1, siloviki: 1, mediyshchiki: 1, ministry: 1 },
    emigration: { rabotyagi: 0, umniki: 0, siloviki: 0, mediyshchiki: 0, ministry: 0 },
    foodPerCapitaMult: 1,
    populationMult: 0,
    forbesLegacy: 0,
    special: {},
    sectorAdds: { economy: 0, science: 0, army: 0, smi: 0, intel: 0 },
  };
}

function foldModifiers(into: EffectiveModifiers, m: Modifiers): void {
  into.scienceMult += m.scienceMult ?? 0;
  into.inflationDelta += m.inflationDelta ?? 0;
  into.dovolstvoDrift += m.dovolstvoDrift ?? 0;
  into.foodPerCapitaMult *= m.foodPerCapitaMult ?? 1;
  into.populationMult += m.populationMult ?? 0;
  into.forbesLegacy += m.forbesLegacy ?? 0;
  for (const k of POPULATION_KEYS) {
    if (m.outputMult?.[k] !== undefined) into.outputMult[k] *= m.outputMult[k]!;
    if (m.emigration?.[k] !== undefined) into.emigration[k] += m.emigration[k]!;
  }
  if (m.special) {
    for (const [k, v] of Object.entries(m.special)) {
      const prev = into.special[k];
      // числа складываем (ministerUpkeepMult — перемножаем), остальное затирается последним
      if (typeof v === 'number' && typeof prev === 'number') {
        into.special[k] = k.endsWith('Mult') ? prev * v : prev + v;
      } else {
        into.special[k] = v;
      }
    }
  }
}

export function aggregateModifiers(state: CountryState, content: GameContent): EffectiveModifiers {
  const eff = emptyEffective();
  for (const id of state.activeStatuses) {
    const st = content.statuses.get(id);
    if (!st) continue;
    
    let activeEffects = st.effects;
    if (st.type === 'law' && st.levels && st.levels.length > 0) {
      const levelIdx = state.lawLevels?.[id] ?? 0;
      activeEffects = st.levels[levelIdx]?.effects ?? st.effects;
    }

    if (!activeEffects) continue;

    if (activeEffects.modifiers) foldModifiers(eff, activeEffects.modifiers);
    if (activeEffects.sectors) {
      for (const k of SECTOR_KEYS) {
        eff.sectorAdds[k] += activeEffects.sectors[k] ?? 0;
      }
    }
  }
  for (const m of state.permanentModifiers) foldModifiers(eff, m);
  // чужие глобальные ауры (чудеса, Э10) — материализованы recomputeAuras()
  for (const aura of state.externalAuras ?? []) {
    if (aura.effects.modifiers) foldModifiers(eff, aura.effects.modifiers);
    if (aura.effects.sectors) {
      for (const k of SECTOR_KEYS) {
        eff.sectorAdds[k] += aura.effects.sectors[k] ?? 0;
      }
    }
  }
  return eff;
}

/** Эффективный уровень сектора: база + временные добавки статусов, кламп 0..12. */
export function effectiveSector(
  state: CountryState,
  eff: EffectiveModifiers,
  key: SectorKey,
): number {
  return Math.max(0, Math.min(12, state.sectors[key] + eff.sectorAdds[key]));
}
