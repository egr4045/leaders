import {
  POPULATION_KEYS,
  RESOURCE_KEYS,
  SECTOR_KEYS,
  type PopulationKey,
  type ResourceKey,
  type SectorKey,
  type YearReport,
} from '@leaders/shared';
import {
  computeForbes,
  type GameContent,
  type TickReport,
  type WorldState,
} from '@leaders/engine';

/** Снимок показателей страны «до тика» для дельт сводки года. */
export interface CountryBefore {
  resources: Record<ResourceKey, number>;
  population: Record<PopulationKey, number>;
  sectors: Record<SectorKey, number>;
  dovolstvo: number;
  moneyRate: number;
  forbes: number;
}

export function captureBefore(
  world: WorldState,
  content: GameContent,
): Record<string, CountryBefore> {
  const out: Record<string, CountryBefore> = {};
  for (const [id, s] of world.countries) {
    out[id] = {
      resources: { ...s.resources },
      population: { ...s.population },
      sectors: { ...s.sectors },
      dovolstvo: s.dovolstvo,
      moneyRate: s.moneyRate,
      forbes: computeForbes(s, content).total,
    };
  }
  return out;
}

/**
 * Личные сводки года (Э10, фаза year_summary). Серверный хелпер:
 * нужны имена стран и итоги ООН, которых нет в движке.
 * unLines: публичные строки «ООН ввела санкции/поддержала» по странам.
 */
export function buildYearReports(
  world: WorldState,
  before: Record<string, CountryBefore>,
  tickReport: TickReport,
  unLines: Record<string, string[]>,
  content: GameContent,
): Record<string, YearReport> {
  const reports: Record<string, YearReport> = {};
  const countryName = (id: string) => content.countries.get(id)?.name ?? id;

  // публичные мировые события (перевороты, решающие победы) — всем
  const worldEvents: string[] = [];
  for (const ev of tickReport.events) {
    if (ev.kind === 'coup') {
      worldEvents.push(`Переворот в стране «${countryName(ev.countryId)}»`);
    }
  }

  for (const [id, s] of world.countries) {
    const b = before[id];
    if (!b) continue;
    const my = (kind?: string) =>
      tickReport.events.filter((e) => e.countryId === id && (!kind || e.kind === kind));

    const pair = (beforeV: number, afterV: number) => ({
      before: Math.round(beforeV),
      after: Math.round(afterV),
    });

    const statusChanges: string[] = [];
    for (const ce of tickReport.comboEvents.filter((c) => c.countryId === id)) {
      const st = content.statuses.get(ce.event.statusId);
      statusChanges.push(
        ce.event.kind === 'activated' ? `Теперь: «${st?.name ?? ce.event.statusId}»` : `Больше не: «${st?.name ?? ce.event.statusId}»`,
      );
    }
    statusChanges.push(...my('status').map((e) => e.text));

    reports[id] = {
      endedYear: tickReport.year,
      resources: Object.fromEntries(
        RESOURCE_KEYS.map((k) => [k, pair(b.resources[k], s.resources[k])]),
      ) as YearReport['resources'],
      population: Object.fromEntries(
        POPULATION_KEYS.map((k) => [k, pair(b.population[k], s.population[k])]),
      ) as YearReport['population'],
      sectors: Object.fromEntries(
        SECTOR_KEYS.map((k) => [k, pair(b.sectors[k], s.sectors[k])]),
      ) as YearReport['sectors'],
      dovolstvo: pair(b.dovolstvo, s.dovolstvo),
      moneyRate: {
        before: Math.round(b.moneyRate * 100) / 100,
        after: Math.round(s.moneyRate * 100) / 100,
      },
      inflationPct: Math.round(s.inflation * 1000) / 10,
      forbes: pair(b.forbes, computeForbes(s, content).total),
      delayedFired: my('delayed').map((e) => e.text),
      statusChanges,
      auras: (s.externalAuras ?? []).map((a) => ({
        name: content.statuses.get(a.statusId)?.name ?? a.statusId,
        ownerCountryName: countryName(a.ownerCountryId),
      })),
      globalEvents: [...worldEvents, ...(unLines[id] ?? [])],
      warEvents: my('war').map((e) => e.text),
    };
  }
  return reports;
}
