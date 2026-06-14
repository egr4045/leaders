const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../content/advisors');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

let totalChoices = 0;
let missingNewsLines = 0;
let missingState = 0;
let missingLiberal = 0;

let issues = [];
let allNews = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const country = data.country;
  for (const card of data.cards) {
    card.choices.forEach((choice, idx) => {
      totalChoices++;
      if (!choice.newsLines) {
        missingNewsLines++;
        issues.push({ 
            country, 
            cardId: card.id, 
            situation: card.situation,
            speaker: card.speaker,
            choiceIdx: idx, 
            label: choice.label,
            issue: 'Missing newsLines entirely' 
        });
      } else {
        if (!choice.newsLines.state) {
            missingState++;
            issues.push({ country, cardId: card.id, choiceIdx: idx, issue: 'Missing state newsLine' });
        }
        if (!choice.newsLines.liberal) {
            missingLiberal++;
            issues.push({ country, cardId: card.id, choiceIdx: idx, issue: 'Missing liberal newsLine' });
        }
        
        allNews.push({
            country,
            cardId: card.id,
            label: choice.label,
            state: choice.newsLines.state || '',
            liberal: choice.newsLines.liberal || ''
        });
      }
    });
  }
}

const report = {
    stats: {
        totalChoices,
        missingNewsLines,
        missingState,
        missingLiberal
    },
    issues
};

fs.writeFileSync(path.join(__dirname, 'news_report.json'), JSON.stringify(report, null, 2));
console.log('Report generated with', issues.length, 'issues.');
