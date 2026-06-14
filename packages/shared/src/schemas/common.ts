import { z } from 'zod';

/** id в контенте: латиница в нижнем регистре, цифры, подчёркивания */
export const zId = z.string().regex(/^[a-z0-9_]+$/, 'id: только [a-z0-9_]');

export const RESOURCE_KEYS = ['money', 'gold', 'food', 'influence'] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const POPULATION_KEYS = [
  'rabotyagi',
  'umniki',
  'siloviki',
  'mediyshchiki',
  'ministry',
] as const;
export type PopulationKey = (typeof POPULATION_KEYS)[number];

export const SECTOR_KEYS = ['economy', 'science', 'army', 'smi', 'intel'] as const;
export type SectorKey = (typeof SECTOR_KEYS)[number];

export const ResourceDeltasSchema = z
  .object({
    money: z.number(),
    gold: z.number(),
    food: z.number(),
    influence: z.number(),
  })
  .partial()
  .strict();
export type ResourceDeltas = z.infer<typeof ResourceDeltasSchema>;

export const PopulationDeltasSchema = z
  .object({
    rabotyagi: z.number(),
    umniki: z.number(),
    siloviki: z.number(),
    mediyshchiki: z.number(),
    ministry: z.number(),
  })
  .partial()
  .strict();
export type PopulationDeltas = z.infer<typeof PopulationDeltasSchema>;

export const SectorDeltasSchema = z
  .object({
    economy: z.number(),
    science: z.number(),
    army: z.number(),
    smi: z.number(),
    intel: z.number(),
  })
  .partial()
  .strict();
export type SectorDeltas = z.infer<typeof SectorDeltasSchema>;

/**
 * Постоянные модификаторы, которые движок применяет каждый год,
 * пока эффект активен (через статус) или однократно (через выбор карты).
 */
export const ModifiersSchema = z
  .object({
    /** ± к множителю науки (доля, например 0.1 = +10%) */
    scienceMult: z.number(),
    /** ± к годовой инфляции (доля) */
    inflationDelta: z.number(),
    /** ежегодный дрейф довольства, ± пунктов в год */
    dovolstvoDrift: z.number(),
    /** множители выработки классов, например { "umniki": 1.2 } */
    outputMult: PopulationDeltasSchema,
    /** доли эмиграции классов в год, например { "umniki": 0.2 } */
    emigration: PopulationDeltasSchema,
    /** множитель потребления еды на душу */
    foodPerCapitaMult: z.number(),
    /** ± к годовому приросту всех классов населения (доля, -0.05 = −5%/год) */
    populationMult: z.number(),
    /** минорный «легаси»-вклад в Форбс (намеренно крошечный) */
    forbesLegacy: z.number(),
    /**
     * Именованные уникальные хуки, которые движок понимает адресно:
     * inflationImmunity, ministerUpkeepMult, moneyMode и т.п.
     */
    special: z.record(z.union([z.number(), z.boolean(), z.string()])),
  })
  .partial()
  .strict();
export type Modifiers = z.infer<typeof ModifiersSchema>;

/** Сводный эффект: разовые дельты и/или постоянные модификаторы. */
export const EffectsSchema = z
  .object({
    resources: ResourceDeltasSchema,
    population: PopulationDeltasSchema,
    sectors: SectorDeltasSchema,
    /** ± пунктов довольства (0..100) */
    dovolstvo: z.number(),
    sciencePoints: z.number(),
    modifiers: ModifiersSchema,
  })
  .partial()
  .strict();
export type Effects = z.infer<typeof EffectsSchema>;
