import { SECTOR_KEYS, type AdvisorCard, type Country } from '@leaders/shared';
import type { GameContent } from './content/load.js';
import type { CountryState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import { applyEffectsOnce } from './effects.js';
import { recomputeStatuses, type ComboEvent } from './combo.js';
import { pick, type Rng } from './rng.js';

/** Карты, доступные стране прямо сейчас (requires, locks, once). */
export function availableCards(
  s: CountryState,
  country: Country,
  content: GameContent,
): AdvisorCard[] {
  const deck = content.advisorDecks.get(country.advisorsRef);
  if (!deck) return [];
  const eff = aggregateModifiers(s, content);

  const lockedCards = new Set<string>();
  for (const id of s.activeStatuses) {
    for (const cardId of content.statuses.get(id)?.locks?.advisorCards ?? []) {
      lockedCards.add(cardId);
    }
  }

  return deck.cards.filter((card) => {
    if (lockedCards.has(card.id)) return false;
    if (card.once && s.usedCards.includes(card.id)) return false;
    for (const reqStatus of card.requires?.statuses ?? []) {
      if (!s.activeStatuses.includes(reqStatus)) return false;
    }
    if (card.requires?.minSectors) {
      for (const k of SECTOR_KEYS) {
        const min = card.requires.minSectors[k];
        if (min !== undefined && effectiveSector(s, eff, k) < min) return false;
      }
    }
    return true;
  });
}

/** Тянем случайную карту с учётом веса. */
export function drawCard(
  s: CountryState,
  country: Country,
  content: GameContent,
  rng: Rng,
): AdvisorCard | null {
  const cards = availableCards(s, country, content);
  if (cards.length === 0) return null;
  const weighted: AdvisorCard[] = [];
  for (const c of cards) {
    const w = Math.max(1, Math.round(c.weight ?? 1));
    for (let i = 0; i < w; i++) weighted.push(c);
  }
  return pick(rng, weighted);
}

export interface ChoiceResult {
  comboEvents: ComboEvent[];
}

/** Применить выбор игрока по карте. Бросает, если выбор невалиден. */
export function applyChoice(
  s: CountryState,
  card: AdvisorCard,
  choiceIndex: number,
  currentYear: number,
  content: GameContent,
): ChoiceResult {
  const choice = card.choices[choiceIndex];
  if (!choice) throw new Error(`Карта ${card.id}: нет варианта №${choiceIndex}`);

  if (choice.effects) applyEffectsOnce(s, choice.effects);

  for (const id of choice.addStatuses ?? []) {
    if (!s.activeStatuses.includes(id)) s.activeStatuses.push(id);
  }
  if (choice.removeStatuses) {
    s.activeStatuses = s.activeStatuses.filter((id) => !choice.removeStatuses!.includes(id));
  }
  if (choice.delayed) {
    s.delayed.push({
      dueYear: currentYear + choice.delayed.years,
      effects: choice.delayed.effects,
      description: choice.delayed.description,
    });
  }
  s.usedCards.push(card.id);

  // комбо-движок мог получить новые пререквизиты (например, второй закон для режима)
  const comboEvents = recomputeStatuses(s, content);
  return { comboEvents };
}
