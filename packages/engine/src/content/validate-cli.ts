/**
 * CLI: node dist/content/validate-cli.js <путь-к-content>
 * Выход 0 — контент валиден; 1 — есть проблемы (списком).
 */
import { loadContent, ContentError } from './load.js';

const dir = process.argv[2];
if (!dir) {
  console.error('Использование: validate-cli <путь к каталогу content>');
  process.exit(2);
}

try {
  const content = loadContent(dir);
  const wonders = [...content.statuses.values()].filter((s) => s.type === 'wonder').length;
  console.log('✅ Контент валиден:');
  console.log(`   страны:    ${content.countries.size}`);
  console.log(`   статусы:   ${content.statuses.size - wonders} (+ чудеса: ${wonders})`);
  console.log(`   колоды:    ${content.advisorDecks.size} (карт: ${[...content.advisorDecks.values()].reduce((n, d) => n + d.cards.length, 0)})`);
  console.log(`   квесты:    ${content.quests.size}`);
  console.log(`   лет в партии: ${content.tunables.game.years}`);
} catch (e) {
  if (e instanceof ContentError) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
  throw e;
}
