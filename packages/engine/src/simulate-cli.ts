/**
 * CLI-симуляция партии без сети: node dist/simulate-cli.js <content> [seed] [лет]
 * Боты свайпают случайно; в конце — «Список Форбс».
 */
import { loadContent } from './content/load.js';
import { createWorld } from './state.js';
import { drawCard, applyChoice } from './cards.js';
import { tick } from './tick.js';
import { computeForbes } from './forbes.js';
import { makeRng } from './rng.js';

const contentDir = process.argv[2] ?? '../../content';
const seed = Number(process.argv[3] ?? 42);
const years = Number(process.argv[4] ?? 5);

const content = loadContent(contentDir);
const ids = [...content.countries.keys()].slice(0, 6);
const world = createWorld(content, ids, seed);
const rng = makeRng(seed);

console.log(`Симуляция: ${ids.join(', ')} | seed=${seed} | лет=${years}\n`);

for (let y = 1; y <= years; y++) {
  for (const id of ids) {
    const s = world.countries.get(id)!;
    const country = content.countries.get(id)!;
    for (let i = 0; i < 3; i++) {
      const card = drawCard(s, country, content, rng);
      if (!card) break;
      applyChoice(s, card, Math.floor(rng() * card.choices.length), world.year, content);
    }
  }
  const report = tick(world, content);
  const publicEvents = report.events.filter((e) => !e.hidden);
  console.log(`=== Год ${report.year} ===`);
  for (const e of publicEvents) {
    const name = content.countries.get(e.countryId)?.name ?? e.countryId;
    console.log(`  [${name}] ${e.text}`);
  }
}

console.log('\n=== СПИСОК ФОРБС ===');
const rows = ids
  .map((id) => {
    const s = world.countries.get(id)!;
    const f = computeForbes(s, content);
    return { name: content.countries.get(id)!.name, f, dovolstvo: Math.round(s.dovolstvo) };
  })
  .sort((a, b) => b.f.total - a.f.total);
for (const { name, f, dovolstvo } of rows) {
  console.log(
    `  ${name.padEnd(20)} ${String(Math.round(f.total)).padStart(8)}  ` +
      `(деньги ${Math.round(f.moneyReal)}, золото ${Math.round(f.goldValue)}, ` +
      `квест ${f.questBonus}, легаси ${Math.round(f.legacy)}; довольство ${dovolstvo})`,
  );
}
