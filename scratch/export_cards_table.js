const fs = require('fs');
const path = require('path');

const advisorsDir = path.join(__dirname, '../content/advisors');
const files = fs.readdirSync(advisorsDir).filter(f => f.endsWith('.json'));

let md = '# Ревью всех карточек и реакций СМИ\n\n';

for (const file of files) {
  const deck = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf8'));
  const country = deck.country || file.replace('.json', '');
  
  md += `## Страна: ${country.toUpperCase()}\n\n`;
  md += `| Кто предложил | Событие | Вариант ответа | Тип СМИ | Реакция СМИ |\n`;
  md += `|---|---|---|---|---|\n`;
  
  for (const card of deck.cards) {
    const speaker = card.speaker || '-';
    const situation = (card.situation || '').replace(/\n/g, ' ');
    
    card.choices.forEach((choice, idx) => {
      const label = (choice.label || '').replace(/\n/g, ' ');
      
      let stateNews = '-';
      let libNews = '-';
      if (choice.newsLines) {
        stateNews = (choice.newsLines.state || '').replace(/\n/g, ' ');
        libNews = (choice.newsLines.liberal || '').replace(/\n/g, ' ');
      }
      
      md += `| ${speaker} | ${situation} | ${label} | **Провластное** | ${stateNews} |\n`;
      md += `| ${speaker} | ${situation} | ${label} | **Либеральное** | ${libNews} |\n`;
    });
  }
  md += '\n';
}

fs.writeFileSync(path.join(__dirname, '../cards_review.md'), md);

// Также создадим CSV для удобства открытия в Excel
let csv = '\uFEFF'; // BOM для Excel
csv += 'Страна;Кто предложил;Событие;Вариант ответа;Тип СМИ;Реакция СМИ\n';

for (const file of files) {
  const deck = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf8'));
  const country = deck.country || file.replace('.json', '');
  
  for (const card of deck.cards) {
    const speaker = (card.speaker || '-').replace(/;/g, ',');
    const situation = (card.situation || '').replace(/\n/g, ' ').replace(/;/g, ',');
    
    card.choices.forEach((choice, idx) => {
      const label = (choice.label || '').replace(/\n/g, ' ').replace(/;/g, ',');
      
      let stateNews = '-';
      let libNews = '-';
      if (choice.newsLines) {
        stateNews = (choice.newsLines.state || '').replace(/\n/g, ' ').replace(/;/g, ',');
        libNews = (choice.newsLines.liberal || '').replace(/\n/g, ' ').replace(/;/g, ',');
      }
      
      csv += `${country};${speaker};${situation};${label};Провластное;${stateNews}\n`;
      csv += `${country};${speaker};${situation};${label};Либеральное;${libNews}\n`;
    });
  }
}

fs.writeFileSync(path.join(__dirname, '../cards_review.csv'), csv);
console.log('Сгенерированы файлы cards_review.md и cards_review.csv');
