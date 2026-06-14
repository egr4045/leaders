const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const advisorsDir = path.join(__dirname, '../content/advisors');
const backupDir = path.join(__dirname, 'backup_json');
const csvFile = path.join(__dirname, '../cards_review.csv');

// 1. Делаем бекап
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const files = fs.readdirSync(advisorsDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const p = path.join(advisorsDir, file);
  fs.copyFileSync(p, path.join(backupDir, file));
}
console.log('1. Бекап создан в scratch/backup_json');

// Читаем CSV
const csvText = fs.readFileSync(csvFile, 'utf8');
const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);

// Пропускаем BOM и заголовок
const dataLines = lines.slice(1);
if (dataLines[0].startsWith('Страна;')) dataLines.shift(); // На случай если заголовок на 2 строке

const csvMap = new Map();
// ключ: "country|situation|label", значение: { state: "", liberal: "" }

for (const line of dataLines) {
  const parts = line.split(';');
  if (parts.length < 6) continue;
  
  let [country, speaker, situation, label, mediaType, mediaText] = parts;
  if (country.charCodeAt(0) === 0xFEFF) country = country.substring(1); // strip BOM just in case
  
  const key = `${country}|${situation}|${label}`;
  
  if (!csvMap.has(key)) {
    csvMap.set(key, { state: '', liberal: '' });
  }
  
  const entry = csvMap.get(key);
  if (mediaType === 'Провластное') {
    entry.state = mediaText;
  } else if (mediaType === 'Либеральное') {
    entry.liberal = mediaText;
  }
}

// 2 & 3. Удаляем текущие реакции и вставляем новые строго по совпадению
let unfilled = 0;
let totalChoices = 0;

for (const file of files) {
  const backupData = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
  const newData = JSON.parse(JSON.stringify(backupData)); // clone
  
  const country = newData.country || file.replace('.json', '');
  
  for (const card of newData.cards) {
    const situation = (card.situation || '').replace(/\n/g, ' ').replace(/;/g, ',');
    
    if (card.choices) {
      for (const choice of card.choices) {
        // Удаляем старые (Шаг 2)
        delete choice.newsLines;
        
        // Вставляем новые по совпадению (Шаг 3)
        const label = (choice.label || '').replace(/\n/g, ' ').replace(/;/g, ',');
        const key = `${country}|${situation}|${label}`;
        
        totalChoices++;
        
        const entry = csvMap.get(key);
        if (entry && entry.state !== '-' && entry.liberal !== '-') {
          choice.newsLines = {
            state: entry.state,
            liberal: entry.liberal
          };
        } else {
          unfilled++;
        }
      }
    }
  }
  
  // Сохраняем новые файлы
  fs.writeFileSync(path.join(advisorsDir, file), JSON.stringify(newData, null, 2));
}

console.log(`2 & 3. Реакции очищены и вставлены из CSV по точному совпадению.`);

// 4. Проверяем незаполненные
console.log(`4. Незаполненных вариантов ответа: ${unfilled} из ${totalChoices}`);

// 5. Посимвольное сравнение
let diffFound = false;

// Вспомогательная функция для глубокого сравнения без newsLines
function deepEqualWithoutNewsLines(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1).filter(k => k !== 'newsLines');
  const keys2 = Object.keys(obj2).filter(k => k !== 'newsLines');

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!deepEqualWithoutNewsLines(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

for (const file of files) {
  const oldJson = JSON.parse(fs.readFileSync(path.join(backupDir, file), 'utf8'));
  const newJson = JSON.parse(fs.readFileSync(path.join(advisorsDir, file), 'utf8'));
  
  if (!deepEqualWithoutNewsLines(oldJson, newJson)) {
    console.error(`ОШИБКА: Файл ${file} изменился за пределами newsLines!`);
    diffFound = true;
  }
}

if (!diffFound) {
  console.log('5. Сравнение пройдено! Бекап и новые файлы отличаются ТОЛЬКО полем newsLines.');
} else {
  console.log('5. Сравнение не пройдено. Есть отличия кроме newsLines.');
}
