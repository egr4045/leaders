import { z } from 'zod';
import { zId, EffectsSchema } from './common.js';

/**
 * Пять типов статусов (раздел 7 спеки):
 * - state: состояния — включаются/выключаются сами из чисел («Голод», «Гиперинфляция»),
 *   либо статичные флаги-перки страны, если поле auto не задано;
 * - law: законы — игрок принимает, липкие, стоят денег, требуют кап министров, отменяемы;
 * - tech: технологии — открываются Наукой, навсегда;
 * - regime: режимы/идеологии — авто-активация по requires, эксклюзивны в exclusiveGroup;
 * - wonder: чудеса — один экземпляр на весь мир, гонка за первенство.
 */
export const StatusTypeSchema = z.enum(['state', 'law', 'tech', 'regime', 'wonder']);
export type StatusType = z.infer<typeof StatusTypeSchema>;

export const StatusRequiresSchema = z
  .object({
    /** другие статусы, которые должны быть активны */
    statuses: z.array(zId),
    /** имена встроенных предикатов движка (например "no_rich") */
    conditions: z.array(z.string()),
  })
  .partial()
  .strict();

export const StatusSchema = z
  .object({
    id: zId,
    name: z.string().min(1),
    type: StatusTypeSchema,
    description: z.string().optional(),
    /** эффекты, пока статус активен */
    effects: EffectsSchema.optional(),
    unlocks: z
      .object({
        advisorCards: z.array(zId),
        statuses: z.array(zId),
      })
      .partial()
      .strict()
      .optional(),
    locks: z
      .object({
        advisorCards: z.array(zId),
        statuses: z.array(zId),
      })
      .partial()
      .strict()
      .optional(),
    /** пререквизиты для авто-активации (режимы и состояния) */
    requires: StatusRequiresSchema.optional(),
    /** группа взаимоисключения, например "regime" */
    exclusiveGroup: z.string().optional(),
    /** события, которые поднимает активация (для новостей/триггеров) */
    triggers: z.array(z.string()).optional(),
    /** имя встроенного числового предиката для состояний: "golod", "giperinflyaciya"... */
    auto: z.string().optional(),
    /** цена принятия (для законов) */
    cost: z
      .object({ money: z.number(), influence: z.number() })
      .partial()
      .strict()
      .optional(),
    /** минимум министров для принятия (для законов) */
    minMinistry: z.number().int().nonnegative().optional(),
    /** можно ли отменить (законы — да по умолчанию, технологии — нет) */
    revocable: z.boolean().optional(),
  })
  .strict();

export type Status = z.infer<typeof StatusSchema>;
