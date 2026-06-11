import { z } from 'zod';
import { zId } from './common.js';

export const CountrySchema = z
  .object({
    id: zId,
    name: z.string().min(1),
    /** стартовые ресурсы */
    startResources: z
      .object({
        money: z.number().nonnegative(),
        gold: z.number().nonnegative(),
        food: z.number().nonnegative(),
        influence: z.number().nonnegative(),
      })
      .strict(),
    /** стартовое население по классам */
    startPopulation: z
      .object({
        rabotyagi: z.number().nonnegative(),
        umniki: z.number().nonnegative(),
        siloviki: z.number().nonnegative(),
        mediyshchiki: z.number().nonnegative(),
        ministry: z.number().nonnegative(),
      })
      .strict(),
    /** стартовые уровни секторов, 0..10 */
    startSectors: z
      .object({
        economy: z.number().int().min(0).max(10),
        science: z.number().int().min(0).max(10),
        army: z.number().int().min(0).max(10),
        smi: z.number().int().min(0).max(10),
        intel: z.number().int().min(0).max(10),
      })
      .strict(),
    /** активные с первого года статусы */
    startStatuses: z.array(zId).default([]),
    /** уникальные перки (id статусов) */
    uniquePerks: z.array(zId).default([]),
    /** уникальные слабости (id статусов) */
    uniqueWeaknesses: z.array(zId).default([]),
    /** чудеса, доступные только этой стране */
    exclusiveWonders: z.array(zId).default([]),
    /**
     * Уникальная колода страны, например "advisors/amerika.json" (опционально).
     * Колоды с country: null — общие, раздаются всем странам автоматически.
     */
    advisorsRef: z.string().min(1).optional(),
    notes: z.string().optional(),
  })
  .strict();

export type Country = z.infer<typeof CountrySchema>;
