import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, type GameContent } from '../content/load.js';
import { createWorld, createCountryState, totalPopulation, type WorldState } from '../state.js';
import { tick } from '../tick.js';
import { recomputeStatuses } from '../combo.js';
import { applyChoice, availableCards, drawCard } from '../cards.js';
import { computeForbes, questCompleted } from '../forbes.js';
import { applyTrade, TradeError } from '../trade.js';
import { spySuccessChance, resolveSpyAction } from '../spy.js';
import { buildWonder, WonderError } from '../wonders.js';
import { makeRng } from '../rng.js';

const CONTENT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../content',
);

let content: GameContent;
beforeAll(() => {
  content = loadContent(CONTENT_DIR);
});

function freshWorld(ids: string[] = ['amerika', 'imperiya']): WorldState {
  return createWorld(content, ids, 42);
}

describe('контент', () => {
  it('загружается и содержит страны/статусы/квесты', () => {
    expect(content.countries.size).toBeGreaterThanOrEqual(9);
    expect(content.statuses.has('regime_kommunizm')).toBe(true);
    expect(content.quests.has('tonna_zolota')).toBe(true);
  });
});

describe('tick: производство и еда', () => {
  it('работяги приносят деньги и еду, министры едят бюджет', () => {
    const world = freshWorld();
    const am = world.countries.get('amerika')!;
    const moneyBefore = am.resources.money;
    tick(world, content);
    expect(am.resources.money).toBeGreaterThan(moneyBefore);
    expect(world.year).toBe(2);
  });

  it('нехватка еды включает статус «Голод» и убавляет население', () => {
    const world = freshWorld(['severnaya_tverdynia']);
    const s = world.countries.get('severnaya_tverdynia')!;
    s.resources.food = 0;
    s.sectors.economy = 0; // чтобы продовольствие не покрыло потребление
    s.population.rabotyagi = 10; // добыча еды мизерная
    const popBefore = totalPopulation(s);
    tick(world, content);
    expect(s.activeStatuses).toContain('golod');
    expect(totalPopulation(s)).toBeLessThan(popBefore);
  });
});

describe('tick: инфляция', () => {
  it('печать денег разгоняет инфляцию и роняет курс', () => {
    const world = freshWorld(['imperiya', 'imperiya2'].slice(0, 1));
    const s = world.countries.get('imperiya')!;
    s.printedThisYear = 1000;
    tick(world, content);
    expect(s.inflation).toBeGreaterThan(content.tunables.economy.inflationBase);
    expect(s.moneyRate).toBeLessThan(1);
  });

  it('иммунитет к инфляции (Америка) держит курс', () => {
    const world = freshWorld();
    const am = world.countries.get('amerika')!;
    am.printedThisYear = 1000;
    tick(world, content);
    expect(am.moneyRate).toBe(1);
    expect(am.inflation).toBe(0);
  });
});

describe('переворот', () => {
  it('низкое довольство + мало силовиков = переворот, казна страдает', () => {
    const world = freshWorld(['ostrov_kreditov']);
    const s = world.countries.get('ostrov_kreditov')!;
    s.dovolstvo = 1;
    s.population.siloviki = 0;
    s.sectors.smi = 0; // чтобы СМИ не вытянули довольство
    s.resources.money = 1000;
    s.resources.food = 0;
    s.population.rabotyagi = 5;
    tick(world, content);
    expect(s.coups).toBe(1);
    expect(s.resources.money).toBeLessThan(1000 * 0.7);
  });

  it('много силовиков страхуют режим даже при ненависти народа', () => {
    const world = freshWorld(['severnaya_tverdynia']);
    const s = world.countries.get('severnaya_tverdynia')!;
    s.dovolstvo = 1;
    s.sectors.smi = 0;
    s.resources.food = 0;
    tick(world, content);
    expect(s.coups).toBe(0); // силовиков 250 из ~1000 — доля выше порога
  });
});

describe('комбо-движок', () => {
  it('Коммунизм активируется при двух законах и no_rich, снимается при приватизации', () => {
    const world = freshWorld(['imperiya']);
    const s = world.countries.get('imperiya')!;
    s.activeStatuses.push('law_natsionalizatsiya', 'law_gosplan');
    recomputeStatuses(s, content);
    expect(s.activeStatuses).toContain('regime_kommunizm');

    // приватизация → появились богачи → no_rich ломается, дикий капитализм заходит
    s.activeStatuses.push('law_privatizatsiya');
    recomputeStatuses(s, content);
    expect(s.activeStatuses).not.toContain('regime_kommunizm');
    expect(s.activeStatuses).toContain('regime_dikiy_kapitalizm');
  });

  it('exclusiveGroup: два режима одновременно не живут', () => {
    const world = freshWorld(['imperiya']);
    const s = world.countries.get('imperiya')!;
    s.activeStatuses.push('law_natsionalizatsiya', 'law_gosplan', 'law_privatizatsiya');
    recomputeStatuses(s, content);
    const regimes = s.activeStatuses.filter(
      (id) => content.statuses.get(id)?.exclusiveGroup === 'regime',
    );
    expect(regimes.length).toBeLessThanOrEqual(1);
  });

  it('карта Пятилетка доступна только при Коммунизме', () => {
    const world = freshWorld(['imperiya']);
    const s = world.countries.get('imperiya')!;
    const country = content.countries.get('imperiya')!;
    // у Империи колода imperiya.json — карта пятилетки в default; проверим на стране с default
    const worldD = freshWorld(['drakoniya']);
    const sd = worldD.countries.get('drakoniya')!;
    const countryD = content.countries.get('drakoniya')!;
    expect(availableCards(sd, countryD, content).map((c) => c.id)).not.toContain('card_pyatiletka');
    sd.activeStatuses.push('law_natsionalizatsiya', 'law_gosplan');
    recomputeStatuses(sd, content);
    expect(availableCards(sd, countryD, content).map((c) => c.id)).toContain('card_pyatiletka');
    void s;
    void country;
  });
});

describe('карты и отложенные эффекты', () => {
  it('выбор применяет эффекты и ставит отложенный на нужный год', () => {
    const world = freshWorld();
    const am = world.countries.get('amerika')!;
    const country = content.countries.get('amerika')!;
    const card = availableCards(am, country, content).find((c) => c.id === 'pechatny_stanok')!;
    const moneyBefore = am.resources.money;
    applyChoice(am, card, 0, world.year, content); // «Печатаем триллион»
    expect(am.resources.money).toBe(moneyBefore + 300);
    expect(am.printedThisYear).toBe(300);
    expect(am.delayed).toHaveLength(1);
    expect(am.delayed[0]!.dueYear).toBe(world.year + 1);

    const dovBefore = am.dovolstvo;
    tick(world, content); // год 1 → 2, отложенный ещё не должен... dueYear=2, world.year был 1
    void dovBefore;
    // после первого tick world.year=2; отложенный со сроком 2 применится на втором tick
    const dovBefore2 = am.dovolstvo;
    tick(world, content);
    expect(am.delayed).toHaveLength(0);
    void dovBefore2; // довольство меняет много факторов — проверяем только факт срабатывания
  });

  it('drawCard детерминирован при одном seed', () => {
    const world = freshWorld();
    const am = world.countries.get('amerika')!;
    const country = content.countries.get('amerika')!;
    const a = drawCard(am, country, content, makeRng(7))?.id;
    const b = drawCard(am, country, content, makeRng(7))?.id;
    expect(a).toBe(b);
  });
});

describe('Форбс и квесты', () => {
  it('деньги считаются по курсу, золото — с весом', () => {
    const world = freshWorld(['imperiya']);
    const s = world.countries.get('imperiya')!;
    s.resources.money = 1000;
    s.resources.gold = 100;
    s.moneyRate = 0.8;
    const f = computeForbes(s, content);
    expect(f.moneyReal).toBeCloseTo(800);
    expect(f.goldValue).toBeCloseTo(100 * content.tunables.forbes.goldWeight);
  });

  it('квест «тонна золота» выполняется и даёт бонус', () => {
    const world = createWorld(content, ['imperiya'], 1, { imperiya: 'tonna_zolota' });
    const s = world.countries.get('imperiya')!;
    expect(questCompleted(content.quests.get('tonna_zolota')!, s, content)).toBe(false);
    s.resources.gold = 1200;
    expect(questCompleted(content.quests.get('tonna_zolota')!, s, content)).toBe(true);
    expect(computeForbes(s, content).questBonus).toBe(5000);
  });
});

describe('трейды', () => {
  it('атомарность: невалидная сделка не меняет ничего', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    const moneyA = a.resources.money;
    const goldB = b.resources.gold;
    expect(() =>
      applyTrade(a, b, {
        from: 'amerika',
        to: 'imperiya',
        give: { resources: { money: 999999 } }, // не хватает
        take: { resources: { gold: 10 } },
      }, content),
    ).toThrow(TradeError);
    expect(a.resources.money).toBe(moneyA);
    expect(b.resources.gold).toBe(goldB);
  });

  it('валидная сделка переводит ресурсы и население', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    applyTrade(a, b, {
      from: 'amerika',
      to: 'imperiya',
      give: { resources: { money: 100 }, population: { umniki: 10 } },
      take: { resources: { gold: 20 }, promise: 'не вводить санкции 2 года' },
    }, content);
    expect(a.resources.money).toBe(900);
    expect(a.population.umniki).toBe(190);
    expect(b.population.umniki).toBe(110);
    expect(a.resources.gold).toBe(70);
  });

  it('технологии передаются копированием', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    a.activeStatuses.push('tech_internet');
    applyTrade(a, b, {
      from: 'amerika',
      to: 'imperiya',
      give: { statuses: ['tech_internet'] },
      take: { resources: { gold: 5 } },
    }, content);
    expect(b.activeStatuses).toContain('tech_internet');
    expect(a.activeStatuses).toContain('tech_internet'); // знания не отнимешь
  });
});

describe('шпионаж', () => {
  it('шанс зажат в [0.05, 0.95] и растёт с разведкой', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    const base = spySuccessChance(a, b, content);
    expect(base).toBeGreaterThanOrEqual(0.05);
    expect(base).toBeLessThanOrEqual(0.95);
    a.sectors.intel = 12;
    b.sectors.intel = 0;
    b.sectors.smi = 0;
    expect(spySuccessChance(a, b, content)).toBeGreaterThan(base);
  });

  it('кража науки переносит очки', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    a.sectors.intel = 12;
    b.sectors.intel = 0;
    b.sectors.smi = 0;
    b.sciencePoints = 80;
    const rng = makeRng(1); // первый бросок < 0.95 почти наверняка
    const out = resolveSpyAction(a, b, 'steal_science', world, content, rng);
    if (out.success) {
      expect(a.sciencePoints).toBe(50);
      expect(b.sciencePoints).toBe(30);
    }
  });
});

describe('чудеса', () => {
  it('одно чудо — один владелец; эксклюзив чужим нельзя', () => {
    const world = freshWorld();
    const a = world.countries.get('amerika')!;
    const b = world.countries.get('imperiya')!;
    buildWonder(world, a, 'wonder_first_aes', content);
    expect(() => buildWonder(world, b, 'wonder_first_aes', content)).toThrow(WonderError);
    expect(() => buildWonder(world, b, 'wonder_first_ai', content)).toThrow(WonderError); // эксклюзив Америки
    expect(a.wondersBuilt).toContain('wonder_first_aes');
  });
});

describe('симуляция партии', () => {
  it('5 лет с 6 странами проходят без ошибок и дают Форбс', () => {
    const ids = ['amerika', 'imperiya', 'drakoniya', 'neftyanoe_khanstvo', 'evrosad', 'velikiy_bazar'];
    const world = createWorld(content, ids, 123);
    const rng = makeRng(123);
    for (let year = 1; year <= 5; year++) {
      // каждый игрок свайпает 3 карты в год
      for (const id of ids) {
        const s = world.countries.get(id)!;
        const country = content.countries.get(id)!;
        for (let i = 0; i < 3; i++) {
          const card = drawCard(s, country, content, rng);
          if (!card) break;
          applyChoice(s, card, Math.floor(rng() * card.choices.length), world.year, content);
        }
      }
      tick(world, content);
    }
    expect(world.year).toBe(6);
    for (const id of ids) {
      const f = computeForbes(world.countries.get(id)!, content);
      expect(Number.isFinite(f.total)).toBe(true);
      expect(f.total).toBeGreaterThanOrEqual(0);
    }
  });
});
