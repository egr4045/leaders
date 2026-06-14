const fs = require('fs');
const path = require('path');
const patchData = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/news_lines_patch.json'), 'utf8'));
const advisorsDir = path.join(__dirname, '../content/advisors');

for (const file of fs.readdirSync(advisorsDir)) {
    if (!file.endsWith('.json')) continue;
    const p = path.join(advisorsDir, file);
    const deck = JSON.parse(fs.readFileSync(p, 'utf8'));
    let modified = false;
    for (const card of deck.cards) {
        if (patchData[card.id]) {
            card.choices.forEach((c, idx) => {
                if (patchData[card.id][idx]) {
                    c.newsLines = patchData[card.id][idx];
                    modified = true;
                }
            });
        }
    }
    if (modified) {
        fs.writeFileSync(p, JSON.stringify(deck, null, 2));
    }
}
console.log('Patched JSON files directly!');
