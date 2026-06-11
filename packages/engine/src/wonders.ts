import type { GameContent } from './content/load.js';
import type { CountryState, WorldState } from './state.js';

export class WonderError extends Error {}

/**
 * Гонка чудес: одно чудо — один владелец на весь мир.
 * Эксклюзивные чудеса страны может взять только она.
 */
export function buildWonder(
  world: WorldState,
  builder: CountryState,
  wonderId: string,
  content: GameContent,
): void {
  const wonder = content.statuses.get(wonderId);
  if (!wonder || wonder.type !== 'wonder') throw new WonderError(`Не чудо: ${wonderId}`);
  if (world.wondersTaken.has(wonderId)) {
    throw new WonderError(`«${wonder.name}» уже построено (${world.wondersTaken.get(wonderId)})`);
  }
  for (const [countryId, def] of content.countries) {
    if (countryId !== builder.id && def.exclusiveWonders.includes(wonderId)) {
      throw new WonderError(`«${wonder.name}» доступно только стране ${def.name}`);
    }
  }
  world.wondersTaken.set(wonderId, builder.id);
  builder.wondersBuilt.push(wonderId);
  if (!builder.activeStatuses.includes(wonderId)) builder.activeStatuses.push(wonderId);
}
