import type { GameContent } from './content/load.js';
import type { WorldState } from './state.js';

/**
 * Пересборка глобальных аур (Э10): для каждой страны собираем globalEffects
 * всех активных статусов ВСЕХ ОСТАЛЬНЫХ стран. Результат материализуется в
 * country.externalAuras и подхватывается aggregateModifiers().
 *
 * Вызывать после любого изменения состава статусов с globalEffects:
 * в начале tick(), после buildWonder, после успешного wreck_wonder.
 */
export function recomputeAuras(world: WorldState, content: GameContent): void {
  // сначала соберём всех излучателей: (statusId, ownerCountryId, effects)
  const emitters: { statusId: string; ownerCountryId: string; effects: NonNullable<ReturnType<typeof getGlobal>> }[] = [];
  for (const s of world.countries.values()) {
    for (const id of s.activeStatuses) {
      const ge = getGlobal(content, id);
      if (ge) emitters.push({ statusId: id, ownerCountryId: s.id, effects: ge });
    }
  }
  for (const s of world.countries.values()) {
    s.externalAuras = emitters
      .filter((e) => e.ownerCountryId !== s.id)
      .map((e) => ({ statusId: e.statusId, ownerCountryId: e.ownerCountryId, effects: e.effects }));
  }
}

function getGlobal(content: GameContent, statusId: string) {
  const st = content.statuses.get(statusId);
  return st?.globalEffects && (st.globalEffects.modifiers || st.globalEffects.sectors)
    ? st.globalEffects
    : null;
}
