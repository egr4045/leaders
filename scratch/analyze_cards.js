const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '../content');
const advisorsDir = path.join(contentDir, 'advisors');
const statusesDir = path.join(contentDir, 'statuses');

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
  return Math.max(...card.choices.map(calculateChoicePower));
}

// Helper to get statuses added by a card
function getCardOutputs(card) {
  const outputs = new Set();
  card.choices.forEach((ch, idx) => {
    // some choices might have addStatuses in raw choices if not mapped perfectly,
    // but in content JSON they should be in effects or raw choice.
    // In content json it is usually in choice.effects.addStatuses
    // or sometimes we have to check raw source. 
    // Wait, the content JSON is what we read. In content JSON, addStatuses is inside `effects`?
    // Actually, in generate_unique_cards.js, it's `addStatuses` on the choice object itself!
    // But in content JSON, let's see how it's serialized. It's usually `addStatuses` on choice.
    if (ch.addStatuses) ch.addStatuses.forEach(s => outputs.add(s));
    if (ch.effects && ch.effects.addStatuses) ch.effects.addStatuses.forEach(s => outputs.add(s));
  });
  return [...outputs];
}

function getCardInputs(card) {
  if (!card.requires || !card.requires.statuses) return [];
  return card.requires.statuses;
}

const stats = [];
const advisorFiles = fs.readdirSync(advisorsDir).filter(f => f.endsWith('.json'));

for (const file of advisorFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf-8'));
  const cards = data.cards || [];
  
  if (cards.length === 0) {
    stats.push({ country: data.country, cards: 0, min: 0, max: 0, avg: 0, avgChain: 0 });
    continue;
  }
  
  // Power Index
  let powers = cards.map(calculateCardPower);
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  const avg = powers.reduce((a, b) => a + b, 0) / powers.length;
  
  // Chain length
  // 1. Build map of all statuses produced in this deck
  const producedStatuses = new Set();
  cards.forEach(c => {
    getCardOutputs(c).forEach(s => producedStatuses.add(s));
  });
  
  // 2. Identify roots
  // A card is a root if NONE of its required statuses are produced by this deck.
  const roots = cards.filter(c => {
    const inputs = getCardInputs(c);
    return inputs.every(s => !producedStatuses.has(s));
  });
  
  // 3. Recursive depth calculation
  function getDepth(card) {
    const outputs = getCardOutputs(card);
    if (outputs.length === 0) return 1;
    
    // Find children
    const children = cards.filter(c => {
      const inputs = getCardInputs(c);
      return inputs.some(s => outputs.includes(s));
    });
    
    if (children.length === 0) return 1;
    
    const childDepths = children.map(getDepth);
    return 1 + Math.max(...childDepths);
  }
  
  let avgChain = 0;
  if (roots.length > 0) {
    const depths = roots.map(getDepth);
    avgChain = depths.reduce((a, b) => a + b, 0) / depths.length;
  }
  
  stats.push({
    country: data.country || file.replace('.json', ''),
    cards: cards.length,
    min: min.toFixed(1),
    max: max.toFixed(1),
    avg: avg.toFixed(1),
    avgChain: avgChain.toFixed(1)
  });
}

const statusFiles = fs.readdirSync(statusesDir).filter(f => f.endsWith('.json'));
let lawsCount = 0;
let statesCount = 0;

for (const file of statusFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(statusesDir, file), 'utf-8'));
  if (data.type === 'law') lawsCount++;
  else if (data.type === 'state') statesCount++;
}

console.log(JSON.stringify({ stats, statuses: { lawsCount, statesCount, total: statusFiles.length } }, null, 2));
