const fs = require('fs');
const path = require('path');

const statusesDir = path.join(__dirname, '..', 'content', 'statuses');
if (!fs.existsSync(statusesDir)) fs.mkdirSync(statusesDir, { recursive: true });

const statuses = [
  // Глобальные мемы
  {
    id: "pandemic",
    name: "Пандемия Ковид-26",
    type: "state",
    description: "Вирус гуляет по планете. Сидите дома, качайте медицину. Экономика падает.",
    effects: { sectors: { economy: -3, science: 3 } },
    globalEffects: { sectors: { economy: -3, science: 3 } }
  },
  {
    id: "labubu_trend",
    name: "Мода на Лабубу",
    type: "state",
    description: "Все скупают бесполезный пластик. Экономика летит в космос, но наука падает до нуля.",
    effects: { sectors: { economy: 5, science: -5 }, modifiers: { dovolstvoDrift: 10 } },
    globalEffects: { sectors: { economy: 5, science: -5 }, modifiers: { dovolstvoDrift: 10 } }
  },
  {
    id: "crypto_crash",
    name: "Крах Тапалок",
    type: "state",
    description: "Хомяк сдох. Финансовые рынки обвалились, умники в депрессии.",
    effects: { modifiers: { dovolstvoDrift: -15, outputMult: { umniki: 0.5 } } },
    globalEffects: { modifiers: { dovolstvoDrift: -15, outputMult: { umniki: 0.5 } } }
  },
  
  // РОССИЯ
  {
    id: "smekalochka", name: "Смекалочка", type: "state",
    description: "Умение выживать под любыми санкциями. Импортозамещение работает, но наука немного страдает.",
    effects: { modifiers: { inflationDelta: -0.05, scienceMult: -0.1 } }
  },
  {
    id: "gas_needle", name: "Нефтяная Игла", type: "state",
    description: "Колоссальные доходы от ресурсов. Экономика качается сама по себе.",
    effects: { modifiers: { outputMult: { rabotyagi: 1.5 } }, sectors: { economy: 1 } }
  },
  {
    id: "dacha_culture", name: "Дачная Культура", type: "state",
    description: "Работяги сами выращивают картошку по выходным. Потребление еды снижено.",
    effects: { modifiers: { foodPerCapitaMult: 0.5 } }
  },
  {
    id: "ru_washing_planes", name: "Стиральные Авиалинии", type: "state",
    description: "Наш авиапром перешел на чипы из стиралок. Смешно, но самолеты летают.",
    effects: { sectors: { science: -1, economy: 1 } }
  },
  {
    id: "ru_slow_internet", name: "Замедленный Интернет", type: "state",
    description: "Забугорные видеосервисы еле грузятся, народ переходит на ТВ и Рутуб.",
    effects: { sectors: { smi: 2, science: -2 } }
  },
  {
    id: "ru_eastern_partner", name: "Восточный Партнер", type: "state",
    description: "Экономика прочно завязана на Восток. Доллары больше не нужны.",
    effects: { sectors: { economy: 2 }, modifiers: { inflationDelta: -0.05 } }
  },
  {
    id: "ru_dacha_boom", name: "Дачный Бум", type: "state",
    description: "Вся страна копает картошку на майские. Производство еды на пике.",
    effects: { modifiers: { outputMult: { rabotyagi: 1.5 } } }
  },

  // США
  {
    id: "fed_printer", name: "Печатный Станок ФРС", type: "state",
    description: "Можно печатать деньги из воздуха, но базовая инфляция выше.",
    effects: { modifiers: { inflationDelta: 0.1 } }
  },
  {
    id: "hollywood_softpower", name: "Голливудская Гегемония", type: "state",
    description: "Культурное доминирование. СМИ работают невероятно эффективно.",
    effects: { modifiers: { outputMult: { mediyshchiki: 2.0 } } }
  },
  {
    id: "military_industrial_complex", name: "ВПК", type: "state",
    description: "Армия приносит доход. Солдаты работают на экспорт демократии.",
    effects: { modifiers: { outputMult: { siloviki: 1.5 } } }
  },

  // КИТАЙ
  {
    id: "social_credit", name: "Социальный Рейтинг", type: "state",
    description: "Тотальный контроль. Довольство всегда стремится к норме, бунтовать сложно.",
    effects: { modifiers: { dovolstvoDrift: 5 } }
  },
  {
    id: "world_factory", name: "Фабрика Мира", type: "state",
    description: "Огромная экономика, демпинг на рынке товаров. Работяги пашут за двоих.",
    effects: { modifiers: { outputMult: { rabotyagi: 1.8 } } }
  },
  {
    id: "great_firewall", name: "Великий Файрвол", type: "state",
    description: "Полная защита информационного поля. Внешнее влияние СМИ сведено к минимуму.",
    effects: { modifiers: { outputMult: { mediyshchiki: 1.5 } } }
  },

  // КНДР
  {
    id: "chuchhe", name: "Идеология Чучхе", type: "state",
    description: "Опора на свои силы. Полная изоляция от инфляции, но еды вечно не хватает.",
    effects: { modifiers: { inflationDelta: -0.5, outputMult: { rabotyagi: 0.5 } } }
  },
  {
    id: "red_button", name: "Ядерная Дубина", type: "state",
    description: "Армия генерирует влияние за счет страха соседей.",
    effects: { modifiers: { outputMult: { siloviki: 2.0 } } }
  },
  {
    id: "supreme_leader", name: "Солнцеподобный Вождь", type: "state",
    description: "Абсолютная стабильность элит. Довольство министров не падает.",
    effects: { modifiers: { dovolstvoDrift: 2 } }
  },

  // ВЕЛИКОБРИТАНИЯ
  {
    id: "brexit_legacy", name: "Гордое Одиночество", type: "state",
    description: "Отрезаны от континента. Инфляция выше, но сильное независимое СМИ.",
    effects: { modifiers: { inflationDelta: 0.05, outputMult: { mediyshchiki: 1.5 } } }
  },
  {
    id: "financial_hub", name: "Лондонград", type: "state",
    description: "Убежище для олигархов со всего мира. Экономика получает пассивный бонус.",
    effects: { sectors: { economy: 1 } }
  },
  {
    id: "tea_5_oclock", name: "Традиция Чаепития", type: "state",
    description: "Железобетонная стабильность. Довольство понемногу растет каждый ход.",
    effects: { modifiers: { dovolstvoDrift: 3 } }
  },

  // ГЕРМАНИЯ
  {
    id: "eco_bureaucracy", name: "Эко-Бюрократия", type: "state",
    description: "Зеленая повестка. Наука на высоте, но экономика буксует.",
    effects: { modifiers: { scienceMult: 0.5, outputMult: { rabotyagi: 0.7 } } }
  },
  {
    id: "eu_locomotive", name: "Локомотив Европы", type: "state",
    description: "Тянем всех за собой. Мощный буст к экономике.",
    effects: { modifiers: { outputMult: { rabotyagi: 1.3 } }, sectors: { economy: 1 } }
  },
  {
    id: "ordnung", name: "Немецкий Орднунг", type: "state",
    description: "Строгая дисциплина. Силовики и Умники работают как часы.",
    effects: { modifiers: { outputMult: { siloviki: 1.2, umniki: 1.2 } } }
  },

  // ИНДИЯ
  {
    id: "it_kasty", name: "IT-касты", type: "state",
    description: "Миллионы программистов на аутсорсе. Наука взлетает в небеса.",
    effects: { modifiers: { scienceMult: 1.0, outputMult: { umniki: 2.0 } } }
  },
  {
    id: "bollywood", name: "Болливуд", type: "state",
    description: "Танцуют все! Мощная генерация влияния через кино.",
    effects: { modifiers: { outputMult: { mediyshchiki: 2.0 }, dovolstvoDrift: 2 } }
  },
  {
    id: "overpopulation", name: "Перенаселение", type: "state",
    description: "Огромное количество работяг, но они съедают всю еду.",
    effects: { modifiers: { foodPerCapitaMult: 1.5, outputMult: { rabotyagi: 1.5 } } }
  },

  // ЯПОНИЯ
  {
    id: "workaholics", name: "Трудоголики (Кароси)", type: "state",
    description: "Сумасшедшая эффективность экономики, но высочайший стресс.",
    effects: { modifiers: { outputMult: { rabotyagi: 2.0 }, dovolstvoDrift: -5 } }
  },
  {
    id: "anime_softpower", name: "Сила Аниме", type: "state",
    description: "Кавай спасет мир. Мягкая сила дает колоссальный бонус к СМИ.",
    effects: { modifiers: { outputMult: { mediyshchiki: 2.5 } } }
  },
  {
    id: "aging_population", name: "Стареющая Нация", type: "state",
    description: "Высокий уровень медицины и науки, но силовиков мало.",
    effects: { modifiers: { scienceMult: 0.5, outputMult: { siloviki: 0.5 } } }
  },

  // АРМЕНИЯ
  {
    id: "diaspora", name: "Мощная Диаспора", type: "state",
    description: "Земляки за рубежом всегда помогут деньгами.",
    effects: { modifiers: { outputMult: { rabotyagi: 1.2 } } }
  },
  {
    id: "nardy", name: "Турниры по Нардам", type: "state",
    description: "Мирное разрешение конфликтов. Влияние генерируется броском кубиков.",
    effects: { modifiers: { outputMult: { mediyshchiki: 1.5 }, dovolstvoDrift: 2 } }
  },
  {
    id: "radio_erevan", name: "Армянское Радио", type: "state",
    description: "Любой скандал можно обратить в шутку. Неуязвимость к мелким кризисам.",
    effects: { modifiers: { outputMult: { mediyshchiki: 1.5 } } }
  },

  // ИЗРАИЛЬ
  {
    id: "iron_dome", name: "Железный Купол", type: "state",
    description: "Абсолютная безопасность воздушного пространства. Силовики работают эффективно.",
    effects: { modifiers: { outputMult: { siloviki: 2.0 } } }
  },
  {
    id: "shekeli", name: "Стартап-Нация", type: "state",
    description: "Инновации приносят огромные деньги.",
    effects: { modifiers: { scienceMult: 1.5, outputMult: { umniki: 1.5 } } }
  },
  {
    id: "mossad", name: "Моссад", type: "state",
    description: "Лучшая разведка в мире. Бонус к сектору Разведки.",
    effects: { sectors: { intel: 2 } }
  },
  {
    id: "ru_social_credit_lite",
    name: "Социальный рейтинг (Лайт)",
    description: "Китайские партнеры внедрили систему поощрения лояльных граждан.",
    effects: { modifiers: { outputMult: { army: 1.1, intel: 1.2 } } }
  }
];

for (const st of statuses) {
  fs.writeFileSync(path.join(statusesDir, st.id + '.json'), JSON.stringify(st, null, 2));
}

console.log('Created ' + statuses.length + ' statuses.');
