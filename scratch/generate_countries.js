const fs = require('fs');
const path = require('path');

const countriesDir = path.join(__dirname, '..', 'content', 'countries');

// Очищаем старые страны
if (fs.existsSync(countriesDir)) {
  const oldFiles = fs.readdirSync(countriesDir);
  for (const file of oldFiles) {
    fs.unlinkSync(path.join(countriesDir, file));
  }
} else {
  fs.mkdirSync(countriesDir, { recursive: true });
}

const countries = [
  {
    id: "russia", name: "Россия",
    startResources: { money: 1000, gold: 50, food: 2000, influence: 500 },
    startPopulation: { rabotyagi: 7000, umniki: 1500, siloviki: 2000, mediyshchiki: 500, ministry: 100 },
    startSectors: { economy: 4, science: 5, army: 8, smi: 5, intel: 7 },
    startStatuses: [],
    uniquePerks: ["smekalochka", "gas_needle", "dacha_culture"],
    advisorsRef: "advisors/russia.json"
  },
  {
    id: "usa", name: "США",
    startResources: { money: 5000, gold: 100, food: 3000, influence: 1000 },
    startPopulation: { rabotyagi: 10000, umniki: 3000, siloviki: 1500, mediyshchiki: 2000, ministry: 200 },
    startSectors: { economy: 9, science: 9, army: 9, smi: 9, intel: 8 },
    startStatuses: [],
    uniquePerks: ["fed_printer", "hollywood_softpower", "military_industrial_complex"],
    advisorsRef: "advisors/usa.json"
  },
  {
    id: "china", name: "Китай",
    startResources: { money: 4000, gold: 80, food: 4000, influence: 800 },
    startPopulation: { rabotyagi: 20000, umniki: 2500, siloviki: 3000, mediyshchiki: 1000, ministry: 300 },
    startSectors: { economy: 9, science: 7, army: 7, smi: 6, intel: 7 },
    startStatuses: [],
    uniquePerks: ["social_credit", "world_factory", "great_firewall"],
    advisorsRef: "advisors/china.json"
  },
  {
    id: "dprk", name: "КНДР",
    startResources: { money: 100, gold: 10, food: 100, influence: 300 },
    startPopulation: { rabotyagi: 5000, umniki: 200, siloviki: 3000, mediyshchiki: 100, ministry: 50 },
    startSectors: { economy: 1, science: 3, army: 8, smi: 2, intel: 5 },
    startStatuses: [],
    uniquePerks: ["chuchhe", "red_button", "supreme_leader"],
    advisorsRef: "advisors/dprk.json"
  },
  {
    id: "uk", name: "Великобритания",
    startResources: { money: 2000, gold: 40, food: 800, influence: 700 },
    startPopulation: { rabotyagi: 4000, umniki: 2000, siloviki: 500, mediyshchiki: 1500, ministry: 150 },
    startSectors: { economy: 7, science: 8, army: 6, smi: 8, intel: 9 },
    startStatuses: [],
    uniquePerks: ["brexit_legacy", "financial_hub", "tea_5_oclock"],
    advisorsRef: "advisors/uk.json"
  },
  {
    id: "germany", name: "Германия",
    startResources: { money: 3000, gold: 60, food: 1200, influence: 600 },
    startPopulation: { rabotyagi: 5000, umniki: 2500, siloviki: 400, mediyshchiki: 1000, ministry: 100 },
    startSectors: { economy: 8, science: 8, army: 5, smi: 6, intel: 6 },
    startStatuses: [],
    uniquePerks: ["eco_bureaucracy", "eu_locomotive", "ordnung"],
    advisorsRef: "advisors/germany.json"
  },
  {
    id: "india", name: "Индия",
    startResources: { money: 800, gold: 30, food: 5000, influence: 400 },
    startPopulation: { rabotyagi: 25000, umniki: 3000, siloviki: 1500, mediyshchiki: 2000, ministry: 200 },
    startSectors: { economy: 6, science: 6, army: 5, smi: 7, intel: 4 },
    startStatuses: [],
    uniquePerks: ["it_kasty", "bollywood", "overpopulation"],
    advisorsRef: "advisors/india.json"
  },
  {
    id: "japan", name: "Япония",
    startResources: { money: 2500, gold: 50, food: 1000, influence: 600 },
    startPopulation: { rabotyagi: 6000, umniki: 3000, siloviki: 300, mediyshchiki: 1500, ministry: 100 },
    startSectors: { economy: 8, science: 9, army: 4, smi: 8, intel: 5 },
    startStatuses: [],
    uniquePerks: ["workaholics", "anime_softpower", "aging_population"],
    advisorsRef: "advisors/japan.json"
  },
  {
    id: "armenia", name: "Армения",
    startResources: { money: 300, gold: 5, food: 300, influence: 200 },
    startPopulation: { rabotyagi: 1000, umniki: 500, siloviki: 200, mediyshchiki: 300, ministry: 50 },
    startSectors: { economy: 3, science: 4, army: 4, smi: 5, intel: 4 },
    startStatuses: [],
    uniquePerks: ["diaspora", "nardy", "radio_erevan"],
    advisorsRef: "advisors/armenia.json"
  },
  {
    id: "israel", name: "Израиль",
    startResources: { money: 1500, gold: 20, food: 500, influence: 500 },
    startPopulation: { rabotyagi: 2000, umniki: 1500, siloviki: 1000, mediyshchiki: 800, ministry: 100 },
    startSectors: { economy: 7, science: 9, army: 8, smi: 6, intel: 10 },
    startStatuses: [],
    uniquePerks: ["iron_dome", "shekeli", "mossad"],
    advisorsRef: "advisors/israel.json"
  }
];

for (const c of countries) {
  fs.writeFileSync(path.join(countriesDir, c.id + '.json'), JSON.stringify(c, null, 2));
}

console.log('Created ' + countries.length + ' countries.');
