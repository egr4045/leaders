const fs = require('fs');
const path = require('path');

const statusesDir = path.join('d:', 'dev', 'leaders', 'content', 'statuses');

// 1. Delete old laws
const oldLaws = [
  'law_gosplan.json',
  'law_kult_lichnosti.json',
  'law_natsionalizatsiya.json',
  'law_obyazatelnoe_blagochestie.json',
  'law_privatizatsiya.json',
  'law_sukhoy_zakon.json',
  'law_tsifrovoy_suverenitet.json',
  'law_voennoe_polozhenie.json',
  'law_zapret_tufel.json'
];

oldLaws.forEach(file => {
  const filePath = path.join(statusesDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted ${file}`);
  }
});

// 2. Create new laws
const newLaws = [
  {
    id: "law_agrarnaya_reforma",
    name: "Аграрная Реформа",
    type: "law",
    description: "Мобилизация ресурсов на сельское хозяйство: Работяги трудятся в полях, еды становится больше, но казна теряет золото, а министры лишаются привилегий.",
    revocable: true,
    levels: [
      {
        name: "Поддержка фермеров",
        effects: {
          modifiers: {
            foodPerCapitaMult: -0.1,
            outputMult: { rabotyagi: 1.15, ministry: 0.9 }
          },
          resources: { food: 50, gold: -10 }
        },
        cost: { money: 100, influence: 5 },
        minMinistry: 5
      },
      {
        name: "Гос. Колхозы",
        effects: {
          modifiers: {
            foodPerCapitaMult: -0.2,
            outputMult: { rabotyagi: 1.3, ministry: 0.8 }
          },
          resources: { food: 100, gold: -20 }
        },
        cost: { money: 200, influence: 15 },
        minMinistry: 15
      },
      {
        name: "Продразверстка",
        effects: {
          modifiers: {
            foodPerCapitaMult: -0.4,
            outputMult: { rabotyagi: 1.5, ministry: 0.6 }
          },
          resources: { food: 200, gold: -40 }
        },
        cost: { money: 400, influence: 30 },
        minMinistry: 30
      }
    ]
  },
  {
    id: "law_nomenklatura",
    name: "Номенклатурный Иммунитет",
    type: "law",
    description: "Абсолютная власть и неприкосновенность для чиновников. Государство генерирует огромное Влияние, но народ ненавидит власть, а работяги опускают руки.",
    revocable: true,
    levels: [
      {
        name: "Льготы",
        effects: {
          modifiers: {
            dovolstvoDrift: -2,
            outputMult: { ministry: 1.2, rabotyagi: 0.9 }
          },
          resources: { influence: 20 }
        },
        cost: { money: 150 },
        minMinistry: 10
      },
      {
        name: "Неприкосновенность",
        effects: {
          modifiers: {
            dovolstvoDrift: -4,
            outputMult: { ministry: 1.5, rabotyagi: 0.8 }
          },
          resources: { influence: 40 }
        },
        cost: { money: 300 },
        minMinistry: 20
      },
      {
        name: "Новое Дворянство",
        effects: {
          modifiers: {
            dovolstvoDrift: -7,
            outputMult: { ministry: 2.0, rabotyagi: 0.6 }
          },
          resources: { influence: 80 }
        },
        cost: { money: 600 },
        minMinistry: 35
      }
    ]
  },
  {
    id: "law_technokratiya",
    name: "Технократия",
    type: "law",
    description: "Ставка на инновации и бизнес: Умники работают на пределе и приносят гигантские Деньги, но Влияние государства падает, а силовой блок недофинансирован.",
    revocable: true,
    levels: [
      {
        name: "Гранты стартапам",
        effects: {
          modifiers: {
            outputMult: { umniki: 1.2, siloviki: 0.9 }
          },
          resources: { money: 200, influence: -10 }
        },
        cost: { money: 50, influence: 10 },
        minMinistry: 5
      },
      {
        name: "IT-Офшоры",
        effects: {
          modifiers: {
            outputMult: { umniki: 1.5, siloviki: 0.8 }
          },
          resources: { money: 500, influence: -25 }
        },
        cost: { money: 150, influence: 20 },
        minMinistry: 15
      },
      {
        name: "Государство-Корпорация",
        effects: {
          modifiers: {
            outputMult: { umniki: 2.0, siloviki: 0.6 }
          },
          resources: { money: 1200, influence: -50 }
        },
        cost: { money: 400, influence: 40 },
        minMinistry: 25
      }
    ]
  },
  {
    id: "law_chvk",
    name: "Закон о ЧВК",
    type: "law",
    description: "Разрешение на частные военные компании и агрессивную экспансию: Силовики приносят много Золота через контракты, но отбирают Еду и жестко подавляют свободу прессы.",
    revocable: true,
    levels: [
      {
        name: "Легализация",
        effects: {
          modifiers: {
            outputMult: { siloviki: 1.2, mediyshchiki: 0.9 }
          },
          resources: { gold: 20, food: -30 }
        },
        cost: { money: 200, influence: 10 },
        minMinistry: 10
      },
      {
        name: "Гос. Контракты",
        effects: {
          modifiers: {
            outputMult: { siloviki: 1.5, mediyshchiki: 0.8 }
          },
          resources: { gold: 50, food: -80 }
        },
        cost: { money: 400, influence: 25 },
        minMinistry: 20
      },
      {
        name: "Мировые Операции",
        effects: {
          modifiers: {
            outputMult: { siloviki: 2.0, mediyshchiki: 0.6 }
          },
          resources: { gold: 120, food: -200 }
        },
        cost: { money: 800, influence: 50 },
        minMinistry: 35
      }
    ]
  },
  {
    id: "law_gos_propaganda",
    name: "Министерство Правды",
    type: "law",
    description: "Огромные вливания в госСМИ: Медийщики промывают мозги и обеспечивают высокое Довольство, но это стоит колоссальных Денег, а Умники массово бегут из страны.",
    revocable: true,
    levels: [
      {
        name: "Цензура",
        effects: {
          modifiers: {
            dovolstvoDrift: 3,
            outputMult: { mediyshchiki: 1.2, umniki: 0.9 },
            emigration: { umniki: 0.05 }
          },
          resources: { money: -150 }
        },
        cost: { money: 100, influence: 15 },
        minMinistry: 5
      },
      {
        name: "Единое Вещание",
        effects: {
          modifiers: {
            dovolstvoDrift: 6,
            outputMult: { mediyshchiki: 1.5, umniki: 0.7 },
            emigration: { umniki: 0.15 }
          },
          resources: { money: -400 }
        },
        cost: { money: 250, influence: 30 },
        minMinistry: 15
      },
      {
        name: "Абсолютный Контроль",
        effects: {
          modifiers: {
            dovolstvoDrift: 12,
            outputMult: { mediyshchiki: 2.0, umniki: 0.4 },
            emigration: { umniki: 0.3 }
          },
          resources: { money: -1000 }
        },
        cost: { money: 600, influence: 60 },
        minMinistry: 30
      }
    ]
  }
];

newLaws.forEach(law => {
  const filePath = path.join(statusesDir, `${law.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(law, null, 2));
  console.log(`Created ${law.id}.json`);
});

console.log("Laws rewritten successfully.");
