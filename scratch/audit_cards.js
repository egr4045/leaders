#!/usr/bin/env node
/**
 * audit_cards.js — статический анализ контента карточек советника
 * Запуск: node scratch/audit_cards.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ADVISORS_DIR = path.join(ROOT, 'content', 'advisors');
const STATUSES_DIR = path.join(ROOT, 'content', 'statuses');
const TUNABLES_PATH = path.join(ROOT, 'content', 'tunables.json');

// ─── Загрузка ─────────────────────────────────────────────────────────────

function loadJsonFile(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`ОШИБКА чтения ${p}: ${e.message}`);
    return null;
  }
}

function loadAllAdvisorCards() {
  const files = fs.readdirSync(ADVISORS_DIR).filter(f => f.endsWith('.json'));
  const allCards = [];
  for (const f of files) {
    const data = loadJsonFile(path.join(ADVISORS_DIR, f));
    if (!data) continue;
    // Structure: { country, cards: [...] } or array or single card
    let cards;
    if (data.cards && Array.isArray(data.cards)) {
      cards = data.cards;
    } else if (Array.isArray(data)) {
      cards = data;
    } else {
      cards = [data];
    }
    for (const c of cards) {
      c._file = f;
      allCards.push(c);
    }
  }
  return allCards;
}

function loadAllStatuses() {
  const set = new Set();
  const files = fs.readdirSync(STATUSES_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const data = loadJsonFile(path.join(STATUSES_DIR, f));
    if (!data) continue;
    const items = Array.isArray(data) ? data : [data];
    for (const s of items) {
      if (s.id) set.add(s.id);
    }
  }
  return set;
}

// ─── Утилиты ──────────────────────────────────────────────────────────────

function getCountryIds(cards) {
  // Карточки доступны глобально (без requires.country) или для конкретных стран
  // Определяем по prefixes в id или полю requires
  const ids = new Set(['global']);
  for (const c of cards) {
    if (c.requires?.country) ids.add(c.requires.country);
    // Также пробуем определить по именам файлов
    const file = c._file;
    const m = file.match(/^([a-z_]+)\.json$/);
    if (m && m[1] !== 'common' && m[1] !== 'wonders_deck') ids.add(m[1]);
  }
  return ids;
}

function getCardsForCountry(countryId, allCards) {
  return allCards.filter(c => {
    // Файл страны или common
    if (c._file === `${countryId}.json`) return true;
    if (c._file === 'common.json') return true;
    // Явный requires.country
    if (c.requires?.country && c.requires.country !== countryId) return false;
    return false;
  });
}

const VALID_RESOURCE_KEYS = new Set(['money', 'gold', 'food', 'influence']);
const VALID_SECTOR_KEYS = new Set(['economy', 'science', 'army', 'smi', 'intel']);
const VALID_POP_KEYS = new Set(['rabotyagi', 'umniki', 'siloviki', 'mediyshchiki', 'ministry']);

function checkEffects(effects, location) {
  const issues = [];
  if (!effects) return issues;

  if (effects.resources) {
    for (const k of Object.keys(effects.resources)) {
      if (!VALID_RESOURCE_KEYS.has(k)) {
        issues.push(`  ❌ Неизвестный ресурс: effects.resources.${k} в ${location}`);
      }
    }
  }
  if (effects.sectors) {
    for (const k of Object.keys(effects.sectors)) {
      if (!VALID_SECTOR_KEYS.has(k)) {
        issues.push(`  ❌ Неизвестный сектор: effects.sectors.${k} в ${location}`);
      }
    }
  }
  if (effects.population) {
    for (const k of Object.keys(effects.population)) {
      if (!VALID_POP_KEYS.has(k)) {
        issues.push(`  ❌ Неизвестное население: effects.population.${k} в ${location}`);
      }
    }
  }
  // Проверяем modifiers.special допустимые ключи
  if (effects.modifiers?.special) {
    const VALID_SPECIAL = new Set([
      'printedMoney', 'repressions', 'buildWonder', 'ministerUpkeepMult',
      'inflationImmunity', 'coupImmunity', 'forbesLegacy',
    ]);
    for (const k of Object.keys(effects.modifiers.special)) {
      if (!VALID_SPECIAL.has(k)) {
        issues.push(`  ⚠️  Неизвестный special: effects.modifiers.special.${k} в ${location}`);
      }
    }
  }
  return issues;
}

// ─── Анализ ───────────────────────────────────────────────────────────────

const allCards = loadAllAdvisorCards();
const allStatuses = loadAllStatuses();
const tunables = loadJsonFile(TUNABLES_PATH);
const cardsPerTurn = tunables?.cabinet?.cardsPerTurn ?? 5;
const totalYears = tunables?.game?.maxYears ?? 5;
const minCardsNeeded = cardsPerTurn * totalYears;

console.log('='.repeat(70));
console.log(`АУДИТ КАРТОЧЕК СОВЕТНИКА`);
console.log(`Всего карточек: ${allCards.length}`);
console.log(`cardsPerTurn=${cardsPerTurn}, maxYears=${totalYears} → нужно минимум ${minCardsNeeded} уникальных`);
console.log('='.repeat(70));

// ─── 1. Покрытие newsLines ─────────────────────────────────────────────────
console.log('\n📰 1. ПОКРЫТИЕ NEWLINES\n');

const newsIssues = [];
let totalChoices = 0;
let choicesWithBothLines = 0;
let choicesWithNoLines = 0;
let choicesWithOnlyLiberal = 0;
let choicesWithOnlyState = 0;

for (const card of allCards) {
  const choices = card.choices ?? [];
  for (let i = 0; i < choices.length; i++) {
    totalChoices++;
    const c = choices[i];
    const loc = `${card._file} / ${card.id} / choice[${i}] "${c.label}"`;
    const hasLiberal = !!(c.newsLines?.liberal);
    const hasState = !!(c.newsLines?.state);

    if (hasLiberal && hasState) {
      choicesWithBothLines++;
    } else if (!hasLiberal && !hasState) {
      choicesWithNoLines++;
    } else if (hasLiberal && !hasState) {
      choicesWithOnlyLiberal++;
      newsIssues.push(`  ⚠️  Только .liberal (нет .state): ${loc}`);
    } else {
      choicesWithOnlyState++;
      newsIssues.push(`  ⚠️  Только .state (нет .liberal): ${loc}`);
    }
  }
}

console.log(`Всего вариантов: ${totalChoices}`);
console.log(`  ✅ Оба поля (liberal + state): ${choicesWithBothLines}`);
console.log(`  ✅ Нет newsLines (дефолт): ${choicesWithNoLines}`);
console.log(`  ⚠️  Только .liberal: ${choicesWithOnlyLiberal}`);
console.log(`  ⚠️  Только .state: ${choicesWithOnlyState}`);

if (newsIssues.length) {
  console.log('\nПроблемы:');
  newsIssues.slice(0, 30).forEach(l => console.log(l));
  if (newsIssues.length > 30) console.log(`  ...и ещё ${newsIssues.length - 30}`);
} else {
  console.log('  (проблем нет)');
}

// ─── 2. Ссылки на несуществующие статусы ──────────────────────────────────
console.log('\n🏷️  2. ССЫЛКИ НА СТАТУСЫ\n');

const statusRefIssues = [];
for (const card of allCards) {
  const cardLoc = `${card._file} / ${card.id}`;

  // requires.statuses
  for (const sid of card.requires?.statuses ?? []) {
    if (!allStatuses.has(sid)) {
      statusRefIssues.push(`  ❌ requires.statuses: "${sid}" не найден → ${cardLoc}`);
    }
  }

  const choices = card.choices ?? [];
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const loc = `${cardLoc} / choice[${i}] "${c.label}"`;

    for (const sid of c.addStatuses ?? []) {
      if (!allStatuses.has(sid)) {
        statusRefIssues.push(`  ❌ addStatuses: "${sid}" не найден → ${loc}`);
      }
    }
    for (const sid of c.removeStatuses ?? []) {
      if (!allStatuses.has(sid)) {
        statusRefIssues.push(`  ❌ removeStatuses: "${sid}" не найден → ${loc}`);
      }
    }
    // delayed effects тоже могут добавлять статусы
    if (c.delayed?.effects?.addStatuses) {
      for (const sid of c.delayed.effects.addStatuses) {
        if (!allStatuses.has(sid)) {
          statusRefIssues.push(`  ❌ delayed.addStatuses: "${sid}" не найден → ${loc}`);
        }
      }
    }
  }
}

if (statusRefIssues.length === 0) {
  console.log('  ✅ Все ссылки на статусы корректны');
} else {
  console.log(`Найдено проблем: ${statusRefIssues.length}`);
  statusRefIssues.slice(0, 50).forEach(l => console.log(l));
  if (statusRefIssues.length > 50) console.log(`  ...и ещё ${statusRefIssues.length - 50}`);
}

// ─── 3. Баланс весов ─────────────────────────────────────────────────────
console.log('\n⚖️  3. БАЛАНС ВЕСОВ\n');

const fileGroups = {};
for (const card of allCards) {
  const g = card._file;
  if (!fileGroups[g]) fileGroups[g] = [];
  fileGroups[g].push(card);
}

for (const [file, cards] of Object.entries(fileGroups).sort()) {
  const totalWeight = cards.reduce((s, c) => s + (c.weight ?? 1), 0);
  const zeroWeight = cards.filter(c => c.weight === 0);
  const highWeight = cards.filter(c => (c.weight ?? 1) >= 8);

  const top3 = [...cards]
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, 3)
    .map(c => `${c.id}(${c.weight ?? 1})`);

  let line = `  ${file.replace('.json','').padEnd(20)} ${String(cards.length).padStart(3)} карт, вес ${Math.round(totalWeight)}`;
  if (zeroWeight.length) line += ` | ⚠️ нулевой вес: ${zeroWeight.map(c => c.id).join(', ')}`;
  if (highWeight.length) line += ` | ⚠️ высокий вес(≥8): ${highWeight.map(c => `${c.id}(${c.weight})`).join(', ')}`;
  console.log(line);
  console.log(`    топ-3: ${top3.join(' | ')}`);
}

// ─── 4. Deck exhaustion риск ──────────────────────────────────────────────
console.log('\n🃏  4. DECK EXHAUSTION (карточки однократны — usedCards никогда не сбрасывается)\n');
console.log(`  ⚠️  ВНИМАНИЕ: usedCards НИКОГДА не сбрасывается в tick.ts!`);
console.log(`  Это значит за ${totalYears} лет игрок должен иметь минимум ${minCardsNeeded} уникальных карточек.\n`);

// Считаем per-file
for (const [file, cards] of Object.entries(fileGroups).sort()) {
  if (file === 'wonders_deck.json') continue;
  const nonZero = cards.filter(c => (c.weight ?? 1) > 0);
  const country = file.replace('.json', '');
  let status = '✅';
  let note = '';

  if (file === 'common.json') {
    // common карточки доступны всем
    const commonCount = nonZero.length;
    note = `(+${commonCount} к каждой стране)`;
    status = commonCount >= minCardsNeeded ? '✅' : '⚠️';
    console.log(`  ${status} common: ${nonZero.length} карт (ненулевых: ${nonZero.length}) ${note}`);
    continue;
  }

  // Для страны: свои + common
  const commonCards = fileGroups['common.json'] ?? [];
  const commonNonZero = commonCards.filter(c => (c.weight ?? 1) > 0).length;
  const total = nonZero.length + commonNonZero;
  if (total < minCardsNeeded) {
    status = '❌';
    note = ` ← НУЖНО ещё ${minCardsNeeded - total}`;
  } else if (total < minCardsNeeded + 5) {
    status = '⚠️';
    note = ` ← запас мал (${total - minCardsNeeded} лишних)`;
  }
  console.log(`  ${status} ${country.padEnd(20)}: своих ${nonZero.length} + common ${commonNonZero} = ${total} (нужно ${minCardsNeeded})${note}`);
}

// ─── 5. Эффекты с опечатками ──────────────────────────────────────────────
console.log('\n🔍  5. ОПЕЧАТКИ В ЭФФЕКТАХ\n');

const effectIssues = [];
for (const card of allCards) {
  const choices = card.choices ?? [];
  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    const loc = `${card._file} / ${card.id} / choice[${i}]`;
    effectIssues.push(...checkEffects(c.effects, loc));
    if (c.delayed?.effects) {
      effectIssues.push(...checkEffects(c.delayed.effects, `${loc} [delayed]`));
    }
  }
}

if (effectIssues.length === 0) {
  console.log('  ✅ Опечаток в эффектах не найдено');
} else {
  console.log(`Найдено проблем: ${effectIssues.length}`);
  effectIssues.slice(0, 50).forEach(l => console.log(l));
  if (effectIssues.length > 50) console.log(`  ...и ещё ${effectIssues.length - 50}`);
}

// ─── 6. effectSummary: модификаторы не показываются ──────────────────────
console.log('\n📋  6. МОДИФИКАТОРЫ НЕ ОТОБРАЖАЮТСЯ В CARDRESULTMODAL\n');

const modifierChoices = [];
for (const card of allCards) {
  for (let i = 0; i < (card.choices ?? []).length; i++) {
    const c = card.choices[i];
    if (c.effects?.modifiers && Object.keys(c.effects.modifiers).length > 0) {
      const mods = JSON.stringify(c.effects.modifiers);
      modifierChoices.push(`  ${card._file} / ${card.id} / "${c.label}": ${mods}`);
    }
  }
}

if (modifierChoices.length === 0) {
  console.log('  ✅ Карточек с modifiers нет (или все без эффектов модификаторов)');
} else {
  console.log(`  ⚠️  effectSummary() НЕ показывает modifiers игроку! ${modifierChoices.length} вариантов:`);
  modifierChoices.slice(0, 20).forEach(l => console.log(l));
  if (modifierChoices.length > 20) console.log(`  ...и ещё ${modifierChoices.length - 20}`);
}

// ─── Итог ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(70));
console.log('ИТОГ АУДИТА\n');
const criticalBugs = [];
criticalBugs.push('❌ usedCards НИКОГДА не сбрасывается между годами → deck exhaustion');
if (newsIssues.length) criticalBugs.push(`⚠️  ${newsIssues.length} вариантов с неполными newsLines`);
if (statusRefIssues.length) criticalBugs.push(`❌ ${statusRefIssues.length} несуществующих ссылок на статусы`);
if (effectIssues.length) criticalBugs.push(`❌ ${effectIssues.length} опечаток в именах эффектов`);
if (modifierChoices.length) criticalBugs.push(`⚠️  modifiers не отображаются в CardResultModal (${modifierChoices.length} вариантов)`);

criticalBugs.forEach(l => console.log(l));
console.log('='.repeat(70));
