const fs = require('fs');

const file = 'scratch/generate_unique_cards.js';
let code = fs.readFileSync(file, 'utf-8');

function updateCountry(country, addPower) {
    const startStr = `  ${country}: [`;
    const startIdx = code.indexOf(startStr);
    if (startIdx === -1) {
        console.log(`Country ${country} not found!`);
        return;
    }
    
    // Find the end of this country's array.
    // It ends with `    }\n  ]` or something similar before the next country.
    // Let's just find the next country's start `  \w+: \[` or `};`
    let endIdx = code.length;
    const matchNext = code.slice(startIdx + startStr.length).match(/  \w+: \[|\};\nfor/);
    if (matchNext) {
        endIdx = startIdx + startStr.length + matchNext.index;
    }

    let countryCode = code.slice(startIdx, endIdx);
    
    // For every `choices: [` array in this country, we want to add `dovolstvo: addPower` 
    // or if `dovolstvo` exists, add to it. 
    // Since doing it via regex on JS strings is tricky, we can use a replacer.
    
    // Find all `effects: { ... }`
    countryCode = countryCode.replace(/effects:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (match, inner) => {
        // inner is everything inside effects: { ... }
        // Let's see if dovolstvo exists
        let newInner = inner;
        const dovMatch = newInner.match(/dovolstvo:\s*(-?\d+)/);
        if (dovMatch) {
            const currentDov = parseInt(dovMatch[1]);
            const newDov = currentDov + addPower;
            newInner = newInner.replace(dovMatch[0], `dovolstvo: ${newDov}`);
        } else {
            // Add dovolstvo
            if (newInner.trim().length === 0) {
                newInner = ` dovolstvo: ${addPower} `;
            } else {
                newInner = newInner + `, dovolstvo: ${addPower}`;
            }
        }
        return `effects: {${newInner}}`;
    });
    
    code = code.slice(0, startIdx) + countryCode + code.slice(endIdx);
    console.log(`Updated ${country} with +${addPower} power.`);
}

updateCountry('china', 13);
updateCountry('usa', 3);
updateCountry('armenia', 2);

fs.writeFileSync(file, code);
console.log('generate_unique_cards.js updated.');
