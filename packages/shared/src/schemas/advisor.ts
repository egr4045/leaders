import { z } from 'zod';
import { zId, EffectsSchema } from './common.js';

/** Отложенный эффект решения: сработает через years лет в фазе Итогов. */
export const DelayedEffectSchema = z
  .object({
    years: z.number().int().min(1).max(5),
    effects: EffectsSchema,
    /** строка для новостей, когда эффект сработает */
    description: z.string().optional(),
  })
  .strict();

export const AdvisorChoiceSchema = z
  .object({
    label: z.string().min(1),
    effects: EffectsSchema.optional(),
    addStatuses: z.array(zId).optional(),
    removeStatuses: z.array(zId).optional(),
    delayed: DelayedEffectSchema.optional(),
  })
  .strict();
export type AdvisorChoice = z.infer<typeof AdvisorChoiceSchema>;

export const AdvisorCardSchema = z
  .object({
    id: zId,
    /** кто говорит: «Министр финансов», «Жена», «Воспоминание из детства»... */
    speaker: z.string().min(1),
    situation: z.string().min(1),
    requires: z
      .object({
        statuses: z.array(zId),
        minSectors: z
          .object({
            economy: z.number().int(),
            science: z.number().int(),
            army: z.number().int(),
            smi: z.number().int(),
            intel: z.number().int(),
          })
          .partial()
          .strict(),
      })
      .partial()
      .strict()
      .optional(),
    choices: z.array(AdvisorChoiceSchema).min(2).max(3),
    /** относительная частота выпадения (по умолчанию 1) */
    weight: z.number().positive().optional(),
    /** карта одноразовая: выпадает не больше одного раза за партию */
    once: z.boolean().optional(),
  })
  .strict();
export type AdvisorCard = z.infer<typeof AdvisorCardSchema>;

/** Файл колоды: country = null/отсутствует — общая колода для стран-заглушек. */
export const AdvisorFileSchema = z
  .object({
    country: zId.nullable().optional(),
    cards: z.array(AdvisorCardSchema).min(1),
  })
  .strict();
export type AdvisorFile = z.infer<typeof AdvisorFileSchema>;
