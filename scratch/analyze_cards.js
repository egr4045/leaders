const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../content');
const advisorsDir = path.join(contentDir, 'advisors');
const statusesDir = path.join(contentDir, 'statuses');
const countriesDir = path.join(contentDir, 'countries');

function calculateChoicePower(choice) {
  let power = 0;
  if (!choice.effects) return power;

  const { resources, sectors, dovolstvo } = choice.effects;
  
  if (resources) {
    if (resources.money) power += resources.money / 100;
    if (resources.influence) power += resources.influence / 10;
    if (resources.food) power += resources.food / 100;
    if (resources.gold) power += resources.gold;
  }
  
  if (sectors) {
    for (const s of Object.values(sectors)) {
      power += s * 5;
    }
  }
  
  if (dovolstvo) {
    power += dovolstvo;
  }
  
  return power;
}

function calculateCardPower(card) {
  if (!card.choices || card.choices.length === 0) return 0;
  // Let's say the card power is the maximum power of its choices
  return Math.max(...card.choices.map(calculateChoicePower));
}

const stats = [];
const advisorFiles = fs.readdirSync(advisorsDir).filter(f => f.endsWith('.json'));

for (const file of advisorFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf-8'));
  const cards = data.cards || [];
  
  let powers = cards.map(calculateCardPower);
  
  if (powers.length === 0) {
    stats.push({ country: data.country, cards: 0, min: 0, max: 0, avg: 0 });
    continue;
  }
  
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  const avg = powers.reduce((a, b) => a + b, 0) / powers.length;
  
  stats.push({
    country: data.country,
    cards: cards.length,
    min: min.toFixed(1),
    max: max.toFixed(1),
    avg: avg.toFixed(1)
  });
}

const statusFiles = fs.readdirSync(statusesDir).filter(f => f.endsWith('.json'));
let lawsCount = 0;
let statesCount = 0;
let itemsCount = 0;

for (const file of statusFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(statusesDir, file), 'utf-8'));
  if (data.type === 'law') lawsCount++;
  else if (data.type === 'state') statesCount++;
  else if (data.type === 'item') itemsCount++;
}

console.log(JSON.stringify({ stats, statuses: { lawsCount, statesCount, itemsCount, total: statusFiles.length } }, null, 2));
