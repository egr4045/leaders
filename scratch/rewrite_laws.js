const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../content/statuses');
const files = fs.readdirSync(dir).filter(f => f.startsWith('law_') && f.endsWith('.json'));

const lawUpgrades = {
  "law_gosplan.json": [
    { name: "Мягкое планирование", effects: { modifiers: { outputMult: { ministry: 1.2 }, special: { planEconomy: 1 } } }, cost: { money: 40 }, minMinistry: 20 },
    { name: "Жесткие квоты", effects: { modifiers: { outputMult: { ministry: 1.5, rabotyagi: 1.1 }, dovolstvoDrift: -1, special: { planEconomy: 1 } } }, cost: { money: 60, influence: 10 }, minMinistry: 35 },
    { name: "Тотальный Госснаб", effects: { modifiers: { outputMult: { ministry: 2.0, rabotyagi: 1.3 }, dovolstvoDrift: -3, special: { planEconomy: 1 } } }, cost: { money: 100, influence: 30 }, minMinistry: 50 },
  ],
  "law_kult_lichnosti.json": [
    { name: "Узнаваемость", effects: { modifiers: { dovolstvoDrift: 1, forbesLegacy: 5 } }, cost: { money: 50 }, minMinistry: 10 },
    { name: "Портреты в кабинетах", effects: { modifiers: { dovolstvoDrift: 2, forbesLegacy: 15, emigration: { umniki: 0.03 } } }, cost: { money: 100, influence: 10 }, minMinistry: 20 },
    { name: "Отец Нации", effects: { modifiers: { dovolstvoDrift: 4, forbesLegacy: 30, emigration: { umniki: 0.08 } } }, cost: { money: 200, influence: 40 }, minMinistry: 40 },
  ],
  "law_natsionalizatsiya.json": [
    { name: "Частичная", effects: { resources: { money: 100 }, modifiers: { special: { noRichTrend: 1 } } }, cost: { influence: 15 }, minMinistry: 20 },
    { name: "Масштабная", effects: { resources: { money: 300 }, modifiers: { emigration: { umniki: 0.05 }, special: { noRichTrend: 1 } } }, cost: { influence: 30 }, minMinistry: 30 },
    { name: "Полная конфискация", effects: { resources: { money: 800 }, modifiers: { emigration: { umniki: 0.15 }, dovolstvoDrift: -2, special: { noRichTrend: 1 } } }, cost: { influence: 60 }, minMinistry: 50 },
  ],
  "law_obyazatelnoe_blagochestie.json": [
    { name: "Рекомендованное", effects: { modifiers: { dovolstvoDrift: 1 } }, cost: { money: 20, influence: 5 }, minMinistry: 10 },
    { name: "Обязательное", effects: { modifiers: { dovolstvoDrift: 2, scienceMult: -0.1 } }, cost: { money: 40, influence: 15 }, minMinistry: 20 },
    { name: "Инквизиция", effects: { modifiers: { dovolstvoDrift: 4, scienceMult: -0.3, emigration: { umniki: 0.05 } } }, cost: { money: 80, influence: 30 }, minMinistry: 35 },
  ],
  "law_privatizatsiya.json": [
    { name: "Малая приватизация", effects: { resources: { money: 100 }, modifiers: { dovolstvoDrift: -1 } }, cost: { influence: 10 }, minMinistry: 10 },
    { name: "Залоговые аукционы", effects: { resources: { money: 300 }, modifiers: { dovolstvoDrift: -2, special: { oligarchy: 1 } } }, cost: { influence: 20 }, minMinistry: 20 },
    { name: "Распродажа страны", effects: { resources: { money: 800 }, modifiers: { dovolstvoDrift: -4, special: { oligarchy: 1 } } }, cost: { influence: 40 }, minMinistry: 35 },
  ],
  "law_sukhoy_zakon.json": [
    { name: "Ограничение по времени", effects: { modifiers: { dovolstvoDrift: -1, outputMult: { rabotyagi: 1.05 } } }, cost: { money: 30 }, minMinistry: 10 },
    { name: "Полный запрет", effects: { modifiers: { dovolstvoDrift: -3, outputMult: { rabotyagi: 1.15 } } }, cost: { money: 60 }, minMinistry: 20 },
    { name: "Уголовное наказание", effects: { modifiers: { dovolstvoDrift: -5, outputMult: { rabotyagi: 1.3 }, emigration: { rabotyagi: 0.02 } } }, cost: { money: 100, influence: 20 }, minMinistry: 35 },
  ],
  "law_tsifrovoy_suverenitet.json": [
    { name: "Цензура соцсетей", effects: { sectors: { intel: 1 }, modifiers: { scienceMult: -0.05 } }, cost: { money: 50, influence: 10 }, minMinistry: 15 },
    { name: "Блокировка VPN", effects: { sectors: { intel: 2 }, modifiers: { scienceMult: -0.15, emigration: { umniki: 0.05 } } }, cost: { money: 100, influence: 20 }, minMinistry: 30 },
    { name: "Чебурнет", effects: { sectors: { intel: 4 }, modifiers: { scienceMult: -0.3, emigration: { umniki: 0.15 } } }, cost: { money: 200, influence: 40 }, minMinistry: 50 },
  ],
  "law_voennoe_polozhenie.json": [
    { name: "Особый режим", effects: { sectors: { army: 1 }, modifiers: { dovolstvoDrift: -1 } }, cost: { influence: 15 }, minMinistry: 10 },
    { name: "Комендантский час", effects: { sectors: { army: 2 }, modifiers: { dovolstvoDrift: -3, emigration: { umniki: 0.05 } } }, cost: { influence: 30 }, minMinistry: 25 },
    { name: "Тотальная мобилизация", effects: { sectors: { army: 4 }, modifiers: { dovolstvoDrift: -6, emigration: { umniki: 0.15, rabotyagi: 0.1 } } }, cost: { influence: 60 }, minMinistry: 45 },
  ],
  "law_zapret_tufel.json": [
    { name: "Штрафы", effects: { modifiers: { dovolstvoDrift: -1, special: { absurdLaw: 1 } } }, cost: { money: 20 }, minMinistry: 10 },
    { name: "Изъятие", effects: { modifiers: { dovolstvoDrift: -2, special: { absurdLaw: 1 } }, resources: { money: 50 } }, cost: { money: 40 }, minMinistry: 15 },
    { name: "Тюремный срок", effects: { modifiers: { dovolstvoDrift: -4, special: { absurdLaw: 1 } }, resources: { money: 100 } }, cost: { money: 80, influence: 10 }, minMinistry: 25 },
  ],
};

for (const f of files) {
  const p = path.join(dir, f);
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const levels = lawUpgrades[f];
  
  if (levels) {
    data.levels = levels;
    // Удаляем старые плоские поля
    delete data.effects;
    delete data.cost;
    delete data.minMinistry;
    
    fs.writeFileSync(p, JSON.stringify(data, null, 2));
    console.log(`Updated ${f} to multi-level law`);
  }
}
