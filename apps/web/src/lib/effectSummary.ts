import type { AdvisorChoice } from '@leaders/shared';

const RES_LABELS: Record<string, string> = {
  money: 'ден.',
  gold: 'зол.',
  food: 'ед.',
  influence: 'влин.',
};

const POP_LABELS: Record<string, string> = {
  rabotyagi: 'работяги',
  umniki: 'умники',
  siloviki: 'силовики',
  mediyshchiki: 'медийщики',
  ministry: 'министры',
};

export function effectSummary(choice: AdvisorChoice): string[] {
  const parts: string[] = [];
  const e = choice.effects;

  if (e) {
    const r = (e.resources ?? {}) as Record<string, number>;
    const p = (e.population ?? {}) as Record<string, number>;
    const s = (e.sectors ?? {}) as Record<string, number>;
    const dov = (e.dovolstvo as number) ?? 0;

    for (const [k, v] of Object.entries(r)) {
      if (v) parts.push(`${v > 0 ? '+' : ''}${Math.round(v)} ${RES_LABELS[k] ?? k}`);
    }
    if (dov) parts.push(`${dov > 0 ? '+' : ''}${dov} дов.`);
    for (const [k, v] of Object.entries(s)) {
      if (v) parts.push(`${v > 0 ? '+' : ''}${v} ${k}`);
    }
    const pops = Object.entries(p).filter(([, v]) => v);
    if (pops.length) {
      for (const [k, v] of pops) {
        parts.push(`${v > 0 ? '+' : ''}${Math.round(v)} ${POP_LABELS[k] ?? k}`);
      }
    }
  }

  if (e?.modifiers) {
    const m = e.modifiers as Record<string, unknown>;
    if (typeof m.inflationDelta === 'number' && m.inflationDelta !== 0)
      parts.push(`${m.inflationDelta > 0 ? '+' : ''}${(m.inflationDelta * 100).toFixed(0)}% инф.`);
    if (typeof m.dovolstvoDrift === 'number' && m.dovolstvoDrift !== 0)
      parts.push(`${m.dovolstvoDrift > 0 ? '+' : ''}${m.dovolstvoDrift} дов./год`);
    if (typeof m.populationMult === 'number' && m.populationMult !== 0)
      parts.push(`${m.populationMult > 0 ? '+' : ''}${(m.populationMult * 100).toFixed(0)}% нас.`);
    if (typeof m.foodPerCapitaMult === 'number' && m.foodPerCapitaMult !== 0)
      parts.push(`×${m.foodPerCapitaMult} еда/чел`);
    const sp = m.special as Record<string, unknown> | undefined;
    if (sp?.buildWonder) parts.push(`🏆 чудо`);
  }

  const addSt = (choice as Record<string, unknown>).addStatuses as string[] | undefined;
  if (addSt?.length) parts.push(`+статус×${addSt.length}`);
  if ((choice as Record<string, unknown>).delayed) parts.push('откл.эфф');

  return parts;
}
