const fs = require('fs');
let code = fs.readFileSync('scratch/generate_unique_cards.js', 'utf-8');

const injection = `
// REBALANCE
const buffAmounts = { china: 13, usa: 3, armenia: 2 };
for (const country of ['china', 'usa', 'armenia']) {
    if (decks[country]) {
        for (const card of decks[country]) {
            for (const choice of card.choices) {
                if (!choice.effects) choice.effects = {};
                choice.effects.dovolstvo = (choice.effects.dovolstvo || 0) + buffAmounts[country];
            }
        }
    }
}
`;

if (!code.includes('// REBALANCE')) {
    code = code.replace('for (const [countryId, cards] of Object.entries(decks)) {', injection + '\nfor (const [countryId, cards] of Object.entries(decks)) {');
    fs.writeFileSync('scratch/generate_unique_cards.js', code);
    console.log('Injected rebalance code.');
} else {
    console.log('Already rebalanced.');
}
