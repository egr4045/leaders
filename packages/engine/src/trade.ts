import {
  POPULATION_KEYS,
  RESOURCE_KEYS,
  type PopulationKey,
  type ResourceKey,
} from '@leaders/shared';
import type { GameContent } from './content/load.js';
import type { CountryState } from './state.js';

/** Что одна сторона отдаёт другой. Обещания не enforced — это фича. */
export interface TradeSide {
  resources?: Partial<Record<ResourceKey, number>>; // только положительные числа
  population?: Partial<Record<PopulationKey, number>>; // «обмен опытом» — навсегда
  statuses?: string[]; // передаваемые технологии (type=tech)
  promise?: string; // свободный текст, движком не контролируется
}

export interface TradeDeal {
  from: string;
  to: string;
  give: TradeSide; // от from к to
  take: TradeSide; // от to к from
}

export class TradeError extends Error {}

function validateSide(giver: CountryState, side: TradeSide, content: GameContent): void {
  for (const k of RESOURCE_KEYS) {
    const amount = side.resources?.[k];
    if (amount === undefined) continue;
    if (amount <= 0) throw new TradeError(`Количество ${k} должно быть > 0`);
    if (giver.resources[k] < amount) throw new TradeError(`У ${giver.id} не хватает ${k}`);
  }
  for (const k of POPULATION_KEYS) {
    const amount = side.population?.[k];
    if (amount === undefined) continue;
    if (amount <= 0) throw new TradeError(`Количество ${k} должно быть > 0`);
    if (giver.population[k] < amount) throw new TradeError(`У ${giver.id} не хватает класса ${k}`);
  }
  for (const id of side.statuses ?? []) {
    const st = content.statuses.get(id);
    if (!st) throw new TradeError(`Статус ${id} не существует`);
    if (st.type !== 'tech') throw new TradeError(`Передавать можно только технологии (${id}: ${st.type})`);
    if (!giver.activeStatuses.includes(id)) throw new TradeError(`У ${giver.id} нет технологии ${id}`);
  }
}

function transfer(giver: CountryState, taker: CountryState, side: TradeSide): void {
  for (const k of RESOURCE_KEYS) {
    const amount = side.resources?.[k];
    if (amount === undefined) continue;
    giver.resources[k] -= amount;
    taker.resources[k] += amount;
  }
  for (const k of POPULATION_KEYS) {
    const amount = side.population?.[k];
    if (amount === undefined) continue;
    giver.population[k] -= amount;
    taker.population[k] += amount;
  }
  for (const id of side.statuses ?? []) {
    // технологию копируем (знания не отнимешь), у получателя активируется
    if (!taker.activeStatuses.includes(id)) taker.activeStatuses.push(id);
  }
}

/**
 * Валидирует и атомарно применяет согласованную сделку (раздел 9).
 * Бросает TradeError, ничего не меняя, если сделка невалидна.
 */
export function applyTrade(
  a: CountryState,
  b: CountryState,
  deal: TradeDeal,
  content: GameContent,
): void {
  if (deal.from !== a.id || deal.to !== b.id) throw new TradeError('Сделка не для этих стран');
  validateSide(a, deal.give, content);
  validateSide(b, deal.take, content);
  // обе стороны валидны — применяем
  transfer(a, b, deal.give);
  transfer(b, a, deal.take);
}
