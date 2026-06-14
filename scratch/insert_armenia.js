const fs = require('fs');
const path = require('path');

const cardsFile = path.join(__dirname, 'generate_unique_cards.js');
let cardsCode = fs.readFileSync(cardsFile, 'utf-8');

const amCards = `  armenia: [
    // Chain 1: IT Relocants
    {
      id: "am_it_arrival",
      speaker: "Мэр Еревана",
      situation: "В страну хлынули десятки тысяч айтишников-релокантов. Цены на аренду жилья улетели в космос.",
      weight: 1,
      choices: [
        { label: "Ввести налоговые льготы для IT-компаний", addStatuses: ["am_it_hub"], effects: { resources: { money: 1500 }, sectors: { science: 1 }, dovolstvo: 0 }, newsLines: { state: "Армения становится Силиконовой Долиной Кавказа", liberal: "Местные жители не могут снять квартиру" } },
        { label: "Ограничить въезд и повысить налоги нерезидентам", addStatuses: ["am_it_left"], effects: { resources: { money: 0 }, sectors: { economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Защита рынка жилья для граждан", liberal: "Мы упустили исторический шанс" } }
      ]
    },
    {
      id: "am_it_hub_crisis",
      speaker: "Глава Центробанка",
      situation: "Из-за притока валюты от айтишников драм сильно укрепился. Наши экспортеры разоряются!",
      requires: { statuses: ["am_it_hub"] },
      weight: 1,
      choices: [
        { label: "Искусственно ослабить драм (интервенции)", addStatuses: ["am_export_saved"], effects: { resources: { money: -500 }, sectors: { economy: 1 }, modifiers: { inflationDelta: 0.05 } }, newsLines: { state: "ЦБ поддерживает отечественного производителя", liberal: "Опасные игры с валютным курсом" } },
        { label: "Ничего не делать, рынок сам разберется", addStatuses: ["am_export_crisis"], effects: { resources: { money: 1000 }, sectors: { economy: -1 }, dovolstvo: -10 }, newsLines: { state: "Крепкая валюта - признак стабильности", liberal: "Экспорт встал, фабрики закрываются" } }
      ]
    },
    {
      id: "am_it_citizenship",
      speaker: "Министр Юстиции",
      situation: "Релоканты просят упростить получение гражданства. Националисты против.",
      requires: { statuses: ["am_it_hub"] },
      weight: 1,
      choices: [
        { label: "Выдавать паспорта за инвестиции", effects: { resources: { money: 2000, influence: -50 }, dovolstvo: 0 }, newsLines: { state: "Новые граждане укрепляют экономику", liberal: "Паспорта продаются как горячие пирожки" } },
        { label: "Отказать. Гражданство нужно заслужить", effects: { resources: { influence: 150 }, sectors: { science: 1 }, dovolstvo: 10 }, newsLines: { state: "Национальные интересы превыше всего", liberal: "Релоканты начинают уезжать" } }
      ]
    },

    // Chain 2: Diaspora
    {
      id: "am_diaspora_fund",
      speaker: "Представитель Диаспоры",
      situation: "Диаспора в США и Франции собрала огромный фонд. Они хотят инвестировать, но требуют мест в правительстве.",
      weight: 1,
      choices: [
        { label: "Дать им министерские кресла", addStatuses: ["am_diaspora_in_power"], effects: { resources: { money: 2500, influence: 50 }, sectors: { economy: 1 }, dovolstvo: 5 }, newsLines: { state: "Единство нации по всему миру", liberal: "Страной управляют люди с чужими паспортами" } },
        { label: "Взять только деньги, власть не отдадим", addStatuses: ["am_diaspora_angry"], effects: { resources: { money: 500, influence: 150 }, dovolstvo: 5 }, newsLines: { state: "Суверенитет не продается", liberal: "Мы отвернулись от своих же братьев" } }
      ]
    },
    {
      id: "am_diaspora_scandal",
      speaker: "Журналист-расследователь",
      situation: "Министры из диаспоры замешаны в отмывании денег через благотворительные фонды!",
      requires: { statuses: ["am_diaspora_in_power"] },
      weight: 1,
      choices: [
        { label: "Замять скандал, они нам нужны", addStatuses: ["am_corruption_high"], effects: { resources: { influence: -50 }, dovolstvo: -10, sectors: { smi: 1 } }, newsLines: { state: "Атака на правительство отражена", liberal: "Коррупция процветает открыто" } },
        { label: "Громко уволить и посадить", addStatuses: ["am_diaspora_angry"], effects: { resources: { influence: 200, money: 0 }, dovolstvo: 10, sectors: { smi: 1 } }, newsLines: { state: "Закон един для всех", liberal: "Политическая чистка или борьба за справедливость?" } }
      ]
    },
    {
      id: "am_diaspora_boycott",
      speaker: "Министр Финансов",
      situation: "Диаспора обиделась и призывает бойкотировать наши товары за рубежом.",
      requires: { statuses: ["am_diaspora_angry"] },
      weight: 1,
      choices: [
        { label: "Извиниться на высшем уровне", removeStatuses: ["am_diaspora_angry"], effects: { resources: { influence: 0 }, dovolstvo: 0 }, newsLines: { state: "Примирение ради будущего", liberal: "Унизительное покаяние" } },
        { label: "Справимся без них! Искать новые рынки", addStatuses: ["am_self_reliant"], effects: { sectors: { economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Курс на опору на собственные силы", liberal: "Спад экспорта из-за ссоры со своими" } }
      ]
    },

    // Chain 3: Geopolitics
    {
      id: "am_border_tensions",
      speaker: "Министр Обороны",
      situation: "На границе участились перестрелки. Соседи стягивают войска. Нам нужны союзники.",
      weight: 1,
      choices: [
        { label: "Просить помощи у традиционного северного союзника", addStatuses: ["am_north_ally"], effects: { resources: { influence: -50 }, sectors: { army: 2 }, dovolstvo: 5 }, newsLines: { state: "Старые друзья пришли на помощь", liberal: "Мы теряем суверенитет" } },
        { label: "Искать поддержки на Западе (Франция, США)", addStatuses: ["am_west_ally"], effects: { resources: { money: 500 }, sectors: { intel: 1 }, dovolstvo: 15 }, newsLines: { state: "Новый вектор внешней политики", liberal: "Опасная геополитическая игра" } }
      ]
    },
    {
      id: "am_north_betrayal",
      speaker: "Посол",
      situation: "Северный союзник занят своими делами и не реагирует на наши просьбы о поставках оружия.",
      requires: { statuses: ["am_north_ally"] },
      weight: 1,
      choices: [
        { label: "Сделать резкое заявление и выйти из союза!", removeStatuses: ["am_north_ally"], addStatuses: ["am_isolated"], effects: { resources: { influence: 150 }, sectors: { army: -1 }, dovolstvo: 0 }, newsLines: { state: "Исторический разворот", liberal: "Мы остались один на один с врагом" } },
        { label: "Продолжать унизительно просить", effects: { resources: { influence: -50 }, dovolstvo: -10 }, newsLines: { state: "Сложные дипломатические маневры", liberal: "Предательство интересов нации" } }
      ]
    },
    {
      id: "am_west_weapons",
      speaker: "Министр Обороны",
      situation: "Франция предлагает продать нам современные радары и броневики, но это разозлит Север.",
      requires: { statuses: ["am_west_ally"] },
      weight: 1,
      choices: [
        { label: "Купить французское оружие", addStatuses: ["am_modern_army"], effects: { resources: { money: -1000 }, sectors: { army: 2 }, dovolstvo: 15 }, newsLines: { state: "Армия переходит на стандарты НАТО", liberal: "Риск ответных санкций с Севера" } },
        { label: "Отказаться, чтобы не дразнить соседей", effects: { resources: { influence: -50 }, sectors: { army: 1 }, dovolstvo: -5 }, newsLines: { state: "Осторожность — залог выживания", liberal: "Мы упустили шанс усилить оборону" } }
      ]
    },

    // Chain 4: Cognac & Trade
    {
      id: "am_cognac_export",
      speaker: "Глава Союза Виноделов",
      situation: "Основной рынок сбыта нашего коньяка грозит ввести новые пошлины. Что делать с продукцией?",
      weight: 1,
      choices: [
        { label: "Снизить цены, чтобы сохранить долю рынка", addStatuses: ["am_cheap_cognac"], effects: { resources: { money: 0 }, sectors: { economy: 1 }, dovolstvo: 0 }, newsLines: { state: "Заводы продолжают работать", liberal: "Мы продаем нашу гордость за бесценок" } },
        { label: "Переориентироваться на новые премиальные рынки", addStatuses: ["am_premium_cognac"], effects: { resources: { money: -500 }, sectors: { economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Выход на европейские рынки", liberal: "Сложный переходный период для фермеров" } }
      ]
    },
    {
      id: "am_cheap_cognac_scandal",
      speaker: "Роспотреб... Иностранный Регулятор",
      situation: "Наш коньяк признали подделкой в стране назначения! Это удар по репутации всей отрасли.",
      requires: { statuses: ["am_cheap_cognac"] },
      weight: 1,
      choices: [
        { label: "Жестко наказать бракоделов", addStatuses: ["am_cognac_regulated"], effects: { resources: { influence: 0 }, sectors: { economy: -1 }, dovolstvo: 15 }, newsLines: { state: "Очищение рынка от контрафакта", liberal: "Многие заводы обанкротятся" } },
        { label: "Списать на политическое давление", effects: { resources: { influence: 150 }, dovolstvo: 0 }, newsLines: { state: "Недобросовестная конкуренция из-за рубежа", liberal: "Отрицание очевидных проблем качества" } }
      ]
    },
    {
      id: "am_premium_cognac_success",
      speaker: "Глава Союза Виноделов",
      situation: "Наш премиальный бренд взял золото в Париже! Мы можем расширить производство.",
      requires: { statuses: ["am_premium_cognac"] },
      weight: 1,
      choices: [
        { label: "Дать госгарантии под новые виноградники", effects: { resources: { money: 0 }, sectors: { economy: 2 }, dovolstvo: 20 }, newsLines: { state: "Золотая эра армянского коньяка", liberal: "Инвестиции в перспективную отрасль" } },
        { label: "Пусть развиваются за свой счет", effects: { resources: { money: 500, influence: 50 }, dovolstvo: 5 } }
      ]
    },

    // Chain 5: Traffic & Infrastructure
    {
      id: "am_yerevan_traffic",
      speaker: "Мэр Еревана",
      situation: "Город стоит в мертвых пробках. Дышать нечем, люди опаздывают на работу.",
      weight: 1,
      choices: [
        { label: "Закупить сотни новых автобусов", addStatuses: ["am_new_buses"], effects: { resources: { money: -1000 }, sectors: { economy: 1 }, dovolstvo: 20 }, newsLines: { state: "Масштабная реформа общественного транспорта", liberal: "Многомиллионные контракты без конкурса" } },
        { label: "Убрать выделенные полосы, пусть все едут", addStatuses: ["am_car_chaos"], effects: { sectors: { economy: -1 }, dovolstvo: 5 }, newsLines: { state: "Власти пошли навстречу автомобилистам", liberal: "Город окончательно превратился в парковку" } }
      ]
    },
    {
      id: "am_bus_strike",
      speaker: "Водители Маршруток",
      situation: "Из-за новых автобусов частные маршрутчики теряют работу. Они перекрыли главные улицы!",
      requires: { statuses: ["am_new_buses"] },
      weight: 1,
      choices: [
        { label: "Разогнать силой и лишить лицензий", addStatuses: ["am_transport_monopoly"], effects: { resources: { influence: -50 }, sectors: { economy: 1 }, dovolstvo: 0 }, newsLines: { state: "Конец мафии маршрутчиков", liberal: "Тысячи людей остались без работы" } },
        { label: "Трудоустроить их в госкомпанию с двойной зарплатой", effects: { resources: { money: -500 }, dovolstvo: 20 }, newsLines: { state: "Социальный компромисс найден", liberal: "Огромная нагрузка на городской бюджет" } }
      ]
    },
    {
      id: "am_smog_crisis",
      speaker: "Министр Экологии",
      situation: "Из-за огромного количества машин над городом повис токсичный смог. Больницы переполнены.",
      requires: { statuses: ["am_car_chaos"] },
      weight: 1,
      choices: [
        { label: "Ввести платный въезд в центр", addStatuses: ["am_paid_parking"], effects: { resources: { money: 1000, influence: -100 }, dovolstvo: -20 }, newsLines: { state: "Непопулярные, но необходимые меры", liberal: "Очередной налог на бедных" } },
        { label: "Посоветовать всем носить маски", effects: { sectors: { science: 1 }, dovolstvo: -10 }, newsLines: { state: "Минздрав предупреждает", liberal: "Экологическая катастрофа в столице" } }
      ]
    }
  ]`;

  let loopIdx = cardsCode.indexOf('for (const [countryId, cards]');
  const insertIdx = cardsCode.lastIndexOf('};', loopIdx);
  if (insertIdx !== -1) {
    cardsCode = cardsCode.substring(0, insertIdx) + amCards + ',\n' + cardsCode.substring(insertIdx);
    fs.writeFileSync(cardsFile, cardsCode);
    console.log('Armenia cards updated!');
  } else {
    console.log('Could not find insert index for Armenia');
  }

const statusFile = path.join(__dirname, 'generate_statuses.js');
let statusCode = fs.readFileSync(statusFile, 'utf-8');

const amStatuses = `
  // АРМЕНИЯ
  { id: 'am_it_hub', name: 'IT-Хаб', type: 'state', description: 'Страна стала пристанищем для тысяч айтишников.', effects: { modifiers: { outputMult: { umniki: 1.2 } } } },
  { id: 'am_it_left', name: 'Отток Умов', type: 'state', description: 'Жесткие законы отпугнули специалистов.', effects: { modifiers: { outputMult: { umniki: 0.8 } } } },
  { id: 'am_export_saved', name: 'Слабый Драм', type: 'state', description: 'ЦБ искусственно занижает курс для экспортеров.', effects: { modifiers: { inflationDelta: 0.05, outputMult: { economy: 1.1 } } } },
  { id: 'am_export_crisis', name: 'Кризис Экспорта', type: 'state', description: 'Крепкая валюта делает наш экспорт неконкурентным.', effects: { modifiers: { outputMult: { economy: 0.8 } } } },
  { id: 'am_diaspora_in_power', name: 'Диаспора во Власти', type: 'state', description: 'Представители диаспоры занимают ключевые посты.', effects: { modifiers: { dovolstvoDrift: -1 } } },
  { id: 'am_diaspora_angry', name: 'Обида Диаспоры', type: 'state', description: 'Наши соотечественники за рубежом отказываются нам помогать.', effects: { modifiers: { dovolstvoDrift: -2 } } },
  { id: 'am_corruption_high', name: 'Расцвет Коррупции', type: 'state', description: 'Скандалы заминаются, деньги исчезают.', effects: { modifiers: { outputMult: { economy: 0.9, siloviki: 0.9 } } } },
  { id: 'am_self_reliant', name: 'Опора на Себя', type: 'state', description: 'Мы учимся жить без помощи извне.', effects: { modifiers: { outputMult: { rabotyagi: 1.1 } } } },
  { id: 'am_north_ally', name: 'Северный Союзник', type: 'state', description: 'Мы полностью полагаемся на исторического партнера.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'am_west_ally', name: 'Западный Вектор', type: 'state', description: 'Мы ищем новых друзей в Европе и США.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'am_isolated', name: 'В Изоляции', type: 'state', description: 'Старые союзники предали, новых пока нет.', effects: { modifiers: { dovolstvoDrift: -3, outputMult: { army: 0.8 } } } },
  { id: 'am_modern_army', name: 'Перевооружение', type: 'state', description: 'Армия переходит на современные стандарты.', effects: { modifiers: { outputMult: { army: 1.3 } } } },
  { id: 'am_cheap_cognac', name: 'Дешевый Коньяк', type: 'state', description: 'Мы берем объемами, а не качеством.', effects: { modifiers: { outputMult: { economy: 1.05 } } } },
  { id: 'am_premium_cognac', name: 'Премиум Бренд', type: 'state', description: 'Наш коньяк подают в лучших ресторанах Парижа.', effects: { modifiers: { outputMult: { economy: 1.15 } } } },
  { id: 'am_cognac_regulated', name: 'ГОСТы и Контроль', type: 'state', description: 'Жесткий контроль качества бьет по мелким производителям.', effects: { modifiers: { outputMult: { economy: 0.9 } } } },
  { id: 'am_new_buses', name: 'Новые Автобусы', type: 'state', description: 'Транспортная проблема решается, но дорого.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'am_car_chaos', name: 'Автомобильный Хаос', type: 'state', description: 'Город стоит в бесконечных пробках.', effects: { modifiers: { dovolstvoDrift: -2, outputMult: { economy: 0.9 } } } },
  { id: 'am_transport_monopoly', name: 'Монополия на Транспорт', type: 'state', description: 'Государство полностью контролирует перевозки.', effects: { modifiers: { dovolstvoDrift: -1 } } },
  { id: 'am_paid_parking', name: 'Платный Въезд', type: 'state', description: 'Машин стало меньше, но люди в ярости.', effects: { modifiers: { dovolstvoDrift: -3 } } },
  
  // Уникальные перки стран (startStatuses)`;

statusCode = statusCode.replace('// Уникальные перки стран (startStatuses)', amStatuses);
fs.writeFileSync(statusFile, statusCode);
console.log('Armenia statuses updated!');
