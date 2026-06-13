const fs = require('fs');
const code = fs.readFileSync('scratch/generate_unique_cards.js', 'utf-8');
const lines = code.split('\n');

const startIdx = lines.findIndex(l => l.includes('id: "uk_lorry_drivers"'));
if (startIdx > -1) {
  let ukStart = startIdx;
  while(ukStart > 0 && !lines[ukStart].includes('  uk: [')) ukStart--;
  
  let ukEnd = ukStart + 1;
  while(ukEnd < lines.length && !lines[ukEnd].includes('  germany: [')) ukEnd++;
  
  if (ukStart > -1 && ukEnd < lines.length) {
    const newLines = [...lines.slice(0, ukStart), ...lines.slice(ukEnd)];
    fs.writeFileSync('scratch/generate_unique_cards.js', newLines.join('\n'));
    console.log('Removed old uk block');
  }
}
