import { z } from 'zod';
import { zId } from './common.js';

/**
 * Личный тайный квест. check — карта «метрика → условие».
 * Метрики реализует движок: gold, money_real, wonders_built, years_in_power,
 * neighbor_golod и т.п. Условие — строка-компаратор: ">=1000", "==true".
 */
export const QuestSchema = z
  .object({
    id: zId,
    name: z.string().min(1),
    description: z.string().optional(),
    check: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    /** бонус к Форбсу при выполнении — главный свинг финала */
    forbesBonus: z.number(),
  })
  .strict();

export type Quest = z.infer<typeof QuestSchema>;
