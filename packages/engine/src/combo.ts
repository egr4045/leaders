import type { GameContent } from './content/load.js';
import type { CountryState } from './state.js';
import { aggregateModifiers, effectiveSector } from './modifiers.js';
import { totalPopulation } from './state.js';

/**
 * Встроенные предикаты для requires.conditions и auto-состояний.
 * Имена — контракт с контентом (раздел 7 спеки).
 */
export type ConditionFn = (s: CountryState, content: GameContent) => boolean;

export const CONDITIONS: Record<string, ConditionFn> = {
  // нет «богачей»: в стране не запущена олигархия приватизацией
  no_rich: (s, c) => !truthySpecial(s, c, 'oligarchy'),
  rich_exist: (s, c) => truthySpecial(s, c, 'oligarchy'),
  siloviki_dominate: (s) => s.population.siloviki / Math.max(1, totalPopulation(s)) >= 0.2,
  smi_strong: (s, c) => {
    const eff = aggregateModifiers(s, c);
    return effectiveSector(s, eff, 'smi') >= 7;
  },
  // авто-состояния из чисел
  food_surplus: (s) => s.lastFoodConsumption > 0 && s.lastFoodBalance >= s.lastFoodConsumption * 0.2,
  golod: (s) => s.lastFoodBalance < 0,
  giperinflyaciya: (s) => s.inflation >= 0.2,
};

function truthySpecial(s: CountryState, content: GameContent, key: string): boolean {
  const eff = aggregateModifiers(s, content);
  return Boolean(eff.special[key]);
}

function conditionHolds(name: string, s: CountryState, content: GameContent): boolean {
  const fn = CONDITIONS[name];
  if (!fn) return false; // неизвестное условие = не выполнено (контент-валидатор предупредит позже)
  return fn(s, content);
}

function requiresHold(statusId: string, s: CountryState, content: GameContent): boolean {
  const st = content.statuses.get(statusId)!;
  for (const reqId of st.requires?.statuses ?? []) {
    if (!s.activeStatuses.includes(reqId)) return false;
  }
  for (const cond of st.requires?.conditions ?? []) {
    if (!conditionHolds(cond, s, content)) return false;
  }
  return true;
}

/** Активен ли статус, блокирующий statusId. */
function isLockedBy(statusId: string, s: CountryState, content: GameContent): boolean {
  for (const activeId of s.activeStatuses) {
    const active = content.statuses.get(activeId);
    if (active?.locks?.statuses?.includes(statusId)) return true;
  }
  return false;
}

export interface ComboEvent {
  kind: 'activated' | 'deactivated';
  statusId: string;
}

/**
 * Комбо-движок (раздел 7): на каждом пересчёте
 * 1) переключает авто-состояния (type=state с полем auto) по числовым предикатам;
 * 2) авто-активирует режимы (type=regime), у которых сошлись requires;
 * 3) снимает режимы, у которых requires развалились;
 * 4) соблюдает exclusiveGroup (один режим за раз) и locks.
 * Возвращает список событий для новостей.
 */
export function recomputeStatuses(s: CountryState, content: GameContent): ComboEvent[] {
  // каскады: снятие одного режима может открыть другой — гоняем до неподвижной точки
  const all: ComboEvent[] = [];
  for (let i = 0; i < 5; i++) {
    const events = recomputeOnce(s, content);
    all.push(...events);
    if (events.length === 0) break;
  }
  return all;
}

function recomputeOnce(s: CountryState, content: GameContent): ComboEvent[] {
  const events: ComboEvent[] = [];
  const active = new Set(s.activeStatuses);

  const activate = (id: string) => {
    const st = content.statuses.get(id)!;
    if (st.exclusiveGroup) {
      for (const otherId of [...active]) {
        const other = content.statuses.get(otherId);
        if (other?.exclusiveGroup === st.exclusiveGroup && otherId !== id) {
          active.delete(otherId);
          events.push({ kind: 'deactivated', statusId: otherId });
        }
      }
    }
    active.add(id);
    events.push({ kind: 'activated', statusId: id });
  };

  // 1+2: проход по реестру; порядок: состояния, потом режимы (режимы могут зависеть от состояний)
  const ordered = [...content.statuses.values()].sort((a, b) => {
    const rank = (t: string) => (t === 'state' ? 0 : t === 'regime' ? 2 : 1);
    return rank(a.type) - rank(b.type);
  });

  for (const st of ordered) {
    if (st.type === 'state' && st.auto) {
      const should = conditionHolds(st.auto, s, content);
      if (should && !active.has(st.id) && !isLockedBy(st.id, s, content)) activate(st.id);
      if (!should && active.has(st.id)) {
        active.delete(st.id);
        events.push({ kind: 'deactivated', statusId: st.id });
      }
    }
    if (st.type === 'regime') {
      const holds = (st.requires?.statuses?.length || st.requires?.conditions?.length)
        ? requiresHold(st.id, { ...s, activeStatuses: [...active] }, content)
        : false; // режим без requires сам не включается
      if (holds && !active.has(st.id) && !isLockedBy(st.id, s, content)) activate(st.id);
      if (!holds && active.has(st.id)) {
        active.delete(st.id);
        events.push({ kind: 'deactivated', statusId: st.id });
      }
    }
  }

  s.activeStatuses = [...active];
  return events;
}
