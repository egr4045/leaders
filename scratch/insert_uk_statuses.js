const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'generate_statuses.js');
let code = fs.readFileSync(p, 'utf-8');

const ukStatuses = `
  // ВЕЛИКОБРИТАНИЯ
  {
    id: 'uk_nhs_funded', name: 'NHS Профинансирована', type: 'state',
    description: 'Национальная система здравоохранения временно спасена.',
    effects: { modifiers: { outputMult: { umniki: 1.1 } } }
  },
  {
    id: 'uk_nhs_privatized', name: 'Частная Медицина', type: 'state',
    description: 'Бесплатная медицина уходит в прошлое. Качество растет, но только для богатых.',
    effects: { modifiers: { outputMult: { umniki: 1.2 }, dovolstvoDrift: -1 } }
  },
  {
    id: 'uk_nhs_stable', name: 'Врачи Довольны', type: 'state',
    description: 'Зарплаты повышены. Забастовки прекращены.',
    effects: { modifiers: { dovolstvoDrift: 1 } }
  },
  {
    id: 'uk_nhs_forced', name: 'Принудительный Труд', type: 'state',
    description: 'Врачам запрещено бастовать под угрозой увольнения.',
    effects: { modifiers: { emigration: { umniki: 0.05 }, dovolstvoDrift: -1 } }
  },
  {
    id: 'uk_nhs_regulated', name: 'Жесткое Регулирование', type: 'state',
    description: 'Частные клиники обязаны принимать определенный процент бедняков бесплатно.',
    effects: { modifiers: { dovolstvoDrift: 1, outputMult: { umniki: 0.9 } } }
  },
  {
    id: 'uk_nhs_broken', name: 'Сломанная Медицина', type: 'state',
    description: 'Бедные умирают на улицах, богатые лечатся в роскоши.',
    effects: { modifiers: { dovolstvoDrift: -2, emigration: { rabotyagi: 0.05 } } }
  },
  {
    id: 'uk_scot_campaign', name: 'Шотландская Кампания', type: 'state',
    description: 'Идет подготовка к референдуму. Страна в напряжении.',
    effects: { modifiers: { dovolstvoDrift: -1 } }
  },
  {
    id: 'uk_scot_anger', name: 'Гнев Шотландии', type: 'state',
    description: 'Отказ в референдуме вызвал ярость в Эдинбурге.',
    effects: { modifiers: { dovolstvoDrift: -2 } }
  },
  {
    id: 'uk_scot_stayed', name: 'Единое Королевство', type: 'state',
    description: 'Шотландия осталась с нами. Но за это пришлось щедро заплатить.',
    effects: { modifiers: { dovolstvoDrift: 1 } }
  },
  {
    id: 'uk_scot_left', name: 'Шотландия Ушла', type: 'state',
    description: 'Конец Соединенного Королевства. Экономический и политический шок.',
    effects: { modifiers: { dovolstvoDrift: -3, outputMult: { rabotyagi: 0.8, umniki: 0.8 } } }
  },
  {
    id: 'uk_scot_suppressed', name: 'Полицейское Государство', type: 'state',
    description: 'Протесты подавлены силой. Тишина на улицах, ненависть в сердцах.',
    effects: { modifiers: { dovolstvoDrift: -2, outputMult: { siloviki: 1.2 } } }
  },
  {
    id: 'uk_monarchy_happy', name: 'Довольная Монархия', type: 'state',
    description: 'Королевская семья щедро финансируется и радует нацию.',
    effects: { modifiers: { dovolstvoDrift: 1 } }
  },
  {
    id: 'uk_monarchy_angry', name: 'Обиженная Монархия', type: 'state',
    description: 'Виндзоры жалуются на нехватку денег и портят имидж страны.',
    effects: { modifiers: { dovolstvoDrift: -1 } }
  },
  {
    id: 'uk_monarchy_reduced', name: 'Урезанная Монархия', type: 'state',
    description: 'Скандальные члены семьи лишены титулов и финансирования.',
    effects: { modifiers: { dovolstvoDrift: 1 } }
  },
  {
    id: 'uk_fish_war', name: 'Тресковая Война', type: 'state',
    description: 'Катера ВМС гоняют французских рыбаков. Отношения с ЕС на грани разрыва.',
    effects: { modifiers: { dovolstvoDrift: 1, outputMult: { economy: 0.9 } } }
  },
  {
    id: 'uk_fish_deal', name: 'Рыболовная Сделка', type: 'state',
    description: 'Компромисс с ЕС по рыболовству. Рыбаки недовольны, банкиры ликуют.',
    effects: { modifiers: { dovolstvoDrift: -1, outputMult: { economy: 1.1 } } }
  },
  {
    id: 'uk_trade_war', name: "Торговая Война", type: "state",
    description: "ЕС ввел санкции против наших товаров. Цены растут.",
    effects: { modifiers: { dovolstvoDrift: -2, inflationDelta: 0.05 } }
  },
  {
    id: "uk_eu_alignment", name: "Сближение с ЕС", type: "state",
    description: "Мы шаг за шагом возвращаемся в орбиту Брюсселя.",
    effects: { modifiers: { dovolstvoDrift: -1, outputMult: { economy: 1.2 } } }
  },
  {
    id: "uk_london_rich", name: "Рай для Банкиров", type: "state",
    description: "Лондон процветает, пока остальная страна беднеет.",
    effects: { modifiers: { dovolstvoDrift: -2, outputMult: { umniki: 1.3 } } }
  },
  {
    id: "uk_london_poor", name: "Бегство Капиталов", type: "state",
    description: "Банки переезжают во Франкфурт и Париж.",
    effects: { modifiers: { dovolstvoDrift: -1, outputMult: { umniki: 0.7 } } }
  },
  {
    id: "uk_levelling_up", name: "Выравнивание", type: "state",
    description: "Огромные инвестиции в северные регионы для снижения неравенства.",
    effects: { modifiers: { dovolstvoDrift: 2, outputMult: { rabotyagi: 1.2 } } }
  },
  {
    id: "uk_strikes_banned", name: "Запрет Забастовок", type: "state",
    description: "Любые протесты профсоюзов объявлены вне закона.",
    effects: { modifiers: { dovolstvoDrift: -3, outputMult: { rabotyagi: 1.1 } } }
  },
  {
    id: "uk_crypto_hub", name: "Крипто-Оффшор", type: "state",
    description: "Лондон стал мировой столицей сомнительных крипто-схем.",
    effects: { modifiers: { inflationDelta: 0.05, outputMult: { economy: 1.5 } } }
  },
  {
    id: "uk_austerity", name: "Суровые Меры", type: "state",
    description: "Бюджет урезан до костей. Социалка в руинах.",
    effects: { modifiers: { dovolstvoDrift: -4, inflationDelta: -0.05 } }
  },

  // Уникальные перки стран (startStatuses)
`;

code = code.replace('// Уникальные перки стран (startStatuses)', ukStatuses);
fs.writeFileSync(p, code);
