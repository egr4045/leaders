const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'generate_unique_cards.js');
let code = fs.readFileSync(file, 'utf8');

const injection = `
let patchData = {};
try {
  patchData = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/news_lines_patch.json'), 'utf8'));
} catch(e) {}
for (const countryId in decks) {
  for (const card of decks[countryId]) {
    if (patchData[card.id]) {
      card.choices.forEach((c, idx) => {
        if (patchData[card.id][idx]) {
          c.newsLines = patchData[card.id][idx];
        }
      });
    }
  }
}
`;

code = code.replace('for (const [countryId, cards] of Object.entries(decks))', injection + '\nfor (const [countryId, cards] of Object.entries(decks))');
fs.writeFileSync(file, code);
console.log('Injected newslines patch logic.');
