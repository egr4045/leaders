import type { Quest } from '@leaders/shared';
import type { GameContent } from './content/load.js';
import type { CountryState } from './state.js';
import { aggregateModifiers } from './modifiers.js';

/**
 * «Список Форбс» (раздел 8): личное состояние лидера.
 * Сила государства напрямую ≈ 0 — она лишь крутила станок.
 */
export interface ForbesBreakdown {
  moneyReal: number; // деньги × курс (после инфляции)
  goldValue: number; // золото × вес
  questBonus: number; // выполненный тайный квест
  legacy: number; // минорный вклад статусов
  total: number;
}

export function computeForbes(s: CountryState, content: GameContent): ForbesBreakdown {
  const t = content.tunables;
  const eff = aggregateModifiers(s, content);

  const moneyReal = s.resources.money * s.moneyRate;
  const goldValue = s.resources.gold * t.forbes.goldWeight;
  const legacy = eff.forbesLegacy * t.forbes.legacyWeight;

  let questBonus = 0;
  if (s.questId) {
    const quest = content.quests.get(s.questId);
    if (quest && questCompleted(quest, s, content)) questBonus = quest.forbesBonus;
  }

  const total = moneyReal + goldValue + questBonus + legacy;
  return { moneyReal, goldValue, questBonus, legacy, total };
}

/** Метрики, доступные в check квестов. */
export function questMetric(name: string, s: CountryState, _content: GameContent): number | boolean | null {
  switch (name) {
    case 'gold':
      return s.resources.gold;
    case 'money':
      return s.resources.money;
    case 'money_real':
      return s.resources.money * s.moneyRate;
    case 'wonders_built':
      return s.wondersBuilt.length;
    case 'years_in_power':
      return s.yearsInPower;
    case 'sanctions_received':
      return s.sanctionsReceivedTotal;
    case 'coups':
      return s.coups;
    case 'dovolstvo':
      return s.dovolstvo;
    default:
      return null;
  }
}

const CMP_RE = /^(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?|true|false)$/;

export function questCompleted(quest: Quest, s: CountryState, content: GameContent): boolean {
  for (const [metricName, rawCond] of Object.entries(quest.check)) {
    const metric = questMetric(metricName, s, content);
    if (metric === null) return false;

    const cond = typeof rawCond === 'string' ? rawCond : `==${rawCond}`;
    const m = CMP_RE.exec(cond.trim());
    if (!m) return false;
    const [, op, rhsRaw] = m;
    const rhs: number | boolean = rhsRaw === 'true' ? true : rhsRaw === 'false' ? false : Number(rhsRaw);

    const lhs = typeof metric === 'boolean' ? Number(metric) : metric;
    const rhsNum = typeof rhs === 'boolean' ? Number(rhs) : rhs;
    const ok =
      op === '>=' ? lhs >= rhsNum :
      op === '<=' ? lhs <= rhsNum :
      op === '>' ? lhs > rhsNum :
      op === '<' ? lhs < rhsNum :
      lhs === rhsNum;
    if (!ok) return false;
  }
  return true;
}
