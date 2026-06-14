const fs = require('fs');
const path = require('path');

const cardsFile = path.join(__dirname, 'generate_unique_cards.js');
let cardsCode = fs.readFileSync(cardsFile, 'utf-8');

const newIndia = `  india: [
    // Chain 1: Tech & Scams
    {
      id: "in_call_centers",
      speaker: "Министр IT",
      situation: "Наши колл-центры приносят миллиарды, но в мире мы ассоциируемся с телефонными мошенниками.",
      weight: 1,
      choices: [
        { label: "Жестко зачистить скамеров силами полиции", addStatuses: ["in_tech_clean"], effects: { resources: { influence: 100, money: -500 }, sectors: { economy: -1 } } },
        { label: "Не трогать их, это рабочие места", addStatuses: ["in_scam_hub"], effects: { resources: { money: 500, influence: -150 } } }
      ]
    },
    {
      id: "in_ai_replacement",
      speaker: "CEO IT-корпорации",
      situation: "ИИ начинает заменять операторов колл-центров. Миллионы могут потерять работу.",
      requires: { statuses: ["in_scam_hub"] },
      weight: 1,
      choices: [
        { label: "Ввести налог на ИИ и субсидировать зарплаты", effects: { resources: { money: -1000 }, dovolstvo: 20 } },
        { label: "Пусть переучиваются на программистов", addStatuses: ["in_ai_hub"], effects: { sectors: { science: 1 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "in_global_tech",
      speaker: "Глава диаспоры в США",
      situation: "Наши очищенные IT-компании готовы покупать стартапы в Кремниевой Долине.",
      requires: { statuses: ["in_tech_clean"] },
      weight: 1,
      choices: [
        { label: "Выделить гос. кредиты на экспансию", effects: { resources: { money: -1500 }, sectors: { economy: 2, science: 1 }, dovolstvo: 10 } },
        { label: "Деньги нужны внутри страны", effects: { resources: { money: 500 } } }
      ]
    },

    // Chain 2: Bollywood vs Censorship
    {
      id: "in_bollywood_blockbuster",
      speaker: "Продюсер Болливуда",
      situation: "Новый фильм бьет все рекорды, но радикалы считают, что он оскорбляет религию.",
      weight: 1,
      choices: [
        { label: "Запретить показ ради спокойствия", addStatuses: ["in_censorship"], effects: { sectors: { economy: -1 }, dovolstvo: -10, resources: { influence: 100 } } },
        { label: "Защитить кинотеатры полицией", addStatuses: ["in_free_cinema"], effects: { sectors: { smi: 1 }, dovolstvo: 10, resources: { influence: -150 } } }
      ]
    },
    {
      id: "in_radical_riots",
      speaker: "Начальник Полиции",
      situation: "Радикалы вышли на улицы из-за фильма. Горят автобусы.",
      requires: { statuses: ["in_free_cinema"] },
      weight: 1,
      choices: [
        { label: "Подавить протесты силой", effects: { sectors: { army: 1 }, dovolstvo: -20, resources: { influence: -100 } } },
        { label: "Снять фильм с проката", removeStatuses: ["in_free_cinema"], addStatuses: ["in_censorship"], effects: { sectors: { economy: -1, smi: -1 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "in_hollywood_deal",
      speaker: "Продюсер Болливуда",
      situation: "Голливуд хочет снимать копродукцию, но требует снять цензуру.",
      requires: { statuses: ["in_censorship"] },
      weight: 1,
      choices: [
        { label: "Снять цензурные ограничения", removeStatuses: ["in_censorship"], addStatuses: ["in_global_cinema"], effects: { resources: { money: 1000 }, sectors: { smi: 2 }, dovolstvo: 15 } },
        { label: "Наши традиции важнее долларов", effects: { resources: { influence: 200 }, dovolstvo: 5 } }
      ]
    },

    // Chain 3: Space Program
    {
      id: "in_moon_landing",
      speaker: "Директор ISRO",
      situation: "Мы можем посадить ровер на Южный полюс Луны первыми в мире! Нужны средства.",
      weight: 1,
      choices: [
        { label: "Выделить бюджет! Это престиж нации", addStatuses: ["in_space_power"], effects: { resources: { money: -1000, influence: 300 }, sectors: { science: 1 } } },
        { label: "У нас люди недоедают, какой космос?", effects: { resources: { money: 500 }, dovolstvo: 10, sectors: { science: -1 } } }
      ]
    },
    {
      id: "in_mars_mission",
      speaker: "Директор ISRO",
      situation: "После Луны мы готовы лететь на Марс. Это обойдется еще дороже.",
      requires: { statuses: ["in_space_power"] },
      weight: 1,
      choices: [
        { label: "Летим на Марс!", addStatuses: ["in_mars_power"], effects: { resources: { money: -2000, influence: 400 }, sectors: { science: 2 } } },
        { label: "Приостановить программу, денег нет", removeStatuses: ["in_space_power"], effects: { dovolstvo: -15 } }
      ]
    },
    {
      id: "in_space_commercial",
      speaker: "Глава ISRO",
      situation: "Мы можем зарабатывать миллиарды, запуская спутники для других стран.",
      requires: { statuses: ["in_mars_power"] },
      weight: 1,
      choices: [
        { label: "Открыть космодромы для коммерции", effects: { resources: { money: 3000 }, sectors: { economy: 2 }, dovolstvo: 10 } },
        { label: "Космос только для государственных нужд", effects: { resources: { influence: 200 } } }
      ]
    },

    // Chain 4: Agriculture
    {
      id: "in_farmer_subsidies",
      speaker: "Министр Сельского Хозяйства",
      situation: "Фермеры требуют повысить закупочные цены. Бюджет трещит по швам.",
      weight: 1,
      choices: [
        { label: "Повысить цены и выдать субсидии", addStatuses: ["in_farmers_happy"], effects: { resources: { money: -1500, food: 500 }, dovolstvo: 25 } },
        { label: "Отказать и разрешить корпорациям скупать земли", addStatuses: ["in_corp_farming"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "in_farmer_protests",
      speaker: "Лидер Профсоюза",
      situation: "Миллионы фермеров идут маршем на столицу на тракторах! Они против корпораций.",
      requires: { statuses: ["in_corp_farming"] },
      weight: 1,
      choices: [
        { label: "Отменить реформы и сдаться", removeStatuses: ["in_corp_farming"], addStatuses: ["in_farmers_happy"], effects: { resources: { money: -2000 }, sectors: { economy: -1 }, dovolstvo: 30 } },
        { label: "Перекрыть дороги и подавить бунт", effects: { resources: { food: -500 }, sectors: { army: 1 }, dovolstvo: -40 } }
      ]
    },
    {
      id: "in_green_revolution",
      speaker: "Ученый-Агроном",
      situation: "Довольные фермеры готовы внедрять новые технологии ГМО, но нужны гранты.",
      requires: { statuses: ["in_farmers_happy"] },
      weight: 1,
      choices: [
        { label: "Профинансировать ГМО-революцию", effects: { resources: { money: -1000, food: 2000 }, sectors: { science: 2 }, dovolstvo: 15 } },
        { label: "Оставить традиционное земледелие", effects: { resources: { food: 200 } } }
      ]
    },

    // Chain 5: Kashmir
    {
      id: "in_kashmir_skirmish",
      speaker: "Министр Обороны",
      situation: "Очередная перестрелка на границе. Соседи обвиняют нас.",
      weight: 1,
      choices: [
        { label: "Ответить массированным авиаударом!", addStatuses: ["in_border_war"], effects: { resources: { money: -500 }, sectors: { army: 2 }, dovolstvo: 15 } },
        { label: "Начать мирные переговоры", addStatuses: ["in_peace_talks"], effects: { resources: { influence: 150 }, sectors: { army: -1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "in_arms_race",
      speaker: "Генерал",
      situation: "Из-за конфликта на границе нам нужно срочно закупить системы ПВО.",
      requires: { statuses: ["in_border_war"] },
      weight: 1,
      choices: [
        { label: "Закупить ПВО у России", effects: { resources: { money: -1500, influence: -100 }, sectors: { army: 1 } } },
        { label: "Закупить ПВО у США", effects: { resources: { money: -2000, influence: 100 }, sectors: { army: 1 } } }
      ]
    },
    {
      id: "in_kashmir_resolution",
      speaker: "Дипломат",
      situation: "Благодаря переговорам мы можем подписать исторический пакт о демилитаризации.",
      requires: { statuses: ["in_peace_talks"] },
      weight: 1,
      choices: [
        { label: "Подписать пакт", removeStatuses: ["in_peace_talks"], effects: { resources: { money: 1000, influence: 400 }, sectors: { economy: 1 }, dovolstvo: 20 } },
        { label: "Нас обманут! Отменить переговоры", removeStatuses: ["in_peace_talks"], addStatuses: ["in_border_war"], effects: { dovolstvo: -15 } }
      ]
    }
  ],`;

const newJapan = `  japan: [
    // Chain 1: Demographics
    {
      id: "jp_aging_pop",
      speaker: "Министр Здравоохранения",
      situation: "Нация стареет. Скоро некому будет работать и платить налоги.",
      weight: 1,
      choices: [
        { label: "Заменить сиделок роботами", addStatuses: ["jp_robot_care"], effects: { resources: { money: -1000 }, sectors: { science: 2 }, dovolstvo: 10 } },
        { label: "Открыть границы для мигрантов", addStatuses: ["jp_migrants"], effects: { resources: { money: 500 }, sectors: { economy: 1 }, dovolstvo: -30 } }
      ]
    },
    {
      id: "jp_robot_revolt",
      speaker: "Министр Внутренних Дел",
      situation: "Произошел сбой в ПО роботов-сиделок, несколько пенсионеров получили травмы.",
      requires: { statuses: ["jp_robot_care"] },
      weight: 1,
      choices: [
        { label: "Отозвать роботов и выплатить компенсации", removeStatuses: ["jp_robot_care"], effects: { resources: { money: -1500 }, dovolstvo: -20 } },
        { label: "Замять инцидент и выпустить патч", addStatuses: ["jp_ai_society"], effects: { resources: { influence: -100 }, sectors: { science: 1 } } }
      ]
    },
    {
      id: "jp_immortal_society",
      speaker: "Футуролог",
      situation: "Наши ИИ-системы достигли уровня, когда могут управлять экономикой без участия людей.",
      requires: { statuses: ["jp_ai_society"] },
      weight: 1,
      choices: [
        { label: "Передать управление ИИ", effects: { resources: { money: 3000 }, sectors: { economy: 2, science: 3 }, dovolstvo: 40 } },
        { label: "Люди должны оставаться главными", effects: { dovolstvo: 10 } }
      ]
    },

    // Chain 2: Work Culture
    {
      id: "jp_karoshi",
      speaker: "Профсоюзный Лидер",
      situation: "Смерти от переутомления (кароси) бьют рекорды. Люди спят на работе.",
      weight: 1,
      choices: [
        { label: "Ввести обязательную 4-дневную рабочую неделю", addStatuses: ["jp_4day_week"], effects: { resources: { money: -500 }, sectors: { economy: -1 }, dovolstvo: 30 } },
        { label: "Это японский дух! Работа превыше всего", addStatuses: ["jp_overwork"], effects: { sectors: { economy: 1 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "jp_productivity_drop",
      speaker: "Глава Корпорации",
      situation: "Из-за 4-дневной недели наши заводы отстают от корейских и китайских конкурентов.",
      requires: { statuses: ["jp_4day_week"] },
      weight: 1,
      choices: [
        { label: "Субсидировать автоматизацию производств", effects: { resources: { money: -1500 }, sectors: { science: 1, economy: 1 } } },
        { label: "Отменить 4-дневку", removeStatuses: ["jp_4day_week"], addStatuses: ["jp_overwork"], effects: { dovolstvo: -40, sectors: { economy: 1 } } }
      ]
    },
    {
      id: "jp_suicide_crisis",
      speaker: "Министр Здравоохранения",
      situation: "Переработки убивают молодежь. Уровень самоубийств катастрофический.",
      requires: { statuses: ["jp_overwork"] },
      weight: 1,
      choices: [
        { label: "Создать 'Министерство Одиночества'", effects: { resources: { money: -500 }, dovolstvo: 15 } },
        { label: "Скрывать статистику", effects: { resources: { influence: -100 }, sectors: { smi: -1 }, dovolstvo: -10 } }
      ]
    },

    // Chain 3: Yakuza
    {
      id: "jp_casino_bill",
      speaker: "Мэр Осаки",
      situation: "Давайте легализуем казино! Это привлечет туристов и налоги.",
      weight: 1,
      choices: [
        { label: "Разрешить казино", addStatuses: ["jp_casinos"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -10 } },
        { label: "Запретить, это аморально", effects: { resources: { influence: 100 }, dovolstvo: 5 } }
      ]
    },
    {
      id: "jp_yakuza_takeover",
      speaker: "Шеф Полиции",
      situation: "Якудза полностью взяла под контроль новые казино. Наркотики и проституция процветают.",
      requires: { statuses: ["jp_casinos"] },
      weight: 1,
      choices: [
        { label: "Начать масштабную облаву и чистку", addStatuses: ["jp_yakuza_war"], effects: { resources: { money: -500 }, sectors: { army: 1 }, dovolstvo: 15 } },
        { label: "Брать с них свою долю", addStatuses: ["jp_corrupt_casinos"], effects: { resources: { money: 1500, influence: -200 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "jp_yakuza_war_end",
      speaker: "Шеф Полиции",
      situation: "Боссы кланов Якудзы арестованы. Улицы безопасны.",
      requires: { statuses: ["jp_yakuza_war"] },
      weight: 1,
      choices: [
        { label: "Национализировать легальный бизнес Якудзы", removeStatuses: ["jp_yakuza_war"], effects: { resources: { money: 2000 }, sectors: { economy: 1 }, dovolstvo: 20 } },
        { label: "Сжечь их активы", removeStatuses: ["jp_yakuza_war"], effects: { dovolstvo: 10 } }
      ]
    },

    // Chain 4: Fukushima
    {
      id: "jp_fukushima_water",
      speaker: "Министр Экологии",
      situation: "Хранилища радиоактивной воды на Фукусиме переполнены. Надо сбрасывать в океан.",
      weight: 1,
      choices: [
        { label: "Сбросить воду в океан! Она очищена", addStatuses: ["jp_water_dump"], effects: { resources: { money: 500, influence: -150 }, dovolstvo: -15 } },
        { label: "Строить новые хранилища", effects: { resources: { money: -1000 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "jp_fish_ban",
      speaker: "Ассоциация Рыбаков",
      situation: "Соседи (Китай и Корея) запретили импорт наших морепродуктов из-за сброса воды!",
      requires: { statuses: ["jp_water_dump"] },
      weight: 1,
      choices: [
        { label: "Выплатить компенсации рыбакам", effects: { resources: { money: -1000 }, dovolstvo: 15 } },
        { label: "Подать жалобу в ВТО", addStatuses: ["jp_trade_war"], effects: { resources: { influence: 100 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "jp_nuclear_restart",
      speaker: "Глава Энергетической Компании",
      situation: "У нас дефицит энергии. Пора перезапускать остановленные после Фукусимы реакторы.",
      requires: { statuses: ["jp_trade_war"] },
      weight: 1,
      choices: [
        { label: "Запустить реакторы", effects: { resources: { money: 2000 }, sectors: { economy: 2 }, dovolstvo: -20 } },
        { label: "Мы обожглись однажды. Только зеленый курс", effects: { resources: { money: -1500 }, sectors: { science: 1 }, dovolstvo: 15 } }
      ]
    },

    // Chain 5: Defense
    {
      id: "jp_article_9",
      speaker: "Премьер-Министр",
      situation: "9-я статья Конституции запрещает нам иметь армию. Но угроза от соседей растет.",
      weight: 1,
      choices: [
        { label: "Инициировать отмену 9-й статьи!", addStatuses: ["jp_remilitarization"], effects: { resources: { influence: 200 }, sectors: { army: 2 }, dovolstvo: -20 } },
        { label: "Мы страна пацифистов. Оставить как есть", effects: { resources: { influence: -100 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "jp_carrier_build",
      speaker: "Адмирал",
      situation: "Чтобы противостоять флоту соседей, нам нужны полноценные авианосцы, а не 'эсминцы-вертолетоносцы'.",
      requires: { statuses: ["jp_remilitarization"] },
      weight: 1,
      choices: [
        { label: "Заложить два суперавианосца", addStatuses: ["jp_naval_power"], effects: { resources: { money: -3000 }, sectors: { army: 2 }, dovolstvo: 10 } },
        { label: "Оборонного бюджета не хватит", effects: { dovolstvo: -10 } }
      ]
    },
    {
      id: "jp_island_dispute",
      speaker: "Генерал",
      situation: "Наши новые авианосцы готовы патрулировать спорные острова. Соседи грозят ракетами.",
      requires: { statuses: ["jp_naval_power"] },
      weight: 1,
      choices: [
        { label: "Провести жесткую демонстрацию силы", effects: { resources: { influence: 400 }, sectors: { army: 1 }, dovolstvo: 20 } },
        { label: "Отступить ради дипломатии", effects: { resources: { influence: -300 }, dovolstvo: -15 } }
      ]
    }
  ],`;

const newIsrael = `  israel: [
    // Chain 1: Settlements
    {
      id: "il_settlements_expand",
      speaker: "Лидер Поселенцев",
      situation: "Мы требуем разрешения на постройку новых кварталов на спорных территориях.",
      weight: 1,
      choices: [
        { label: "Разрешить строительство", addStatuses: ["il_settlements_growing"], effects: { resources: { influence: -150 }, sectors: { economy: 1 }, dovolstvo: 10 } },
        { label: "Заморозить ради мира с соседями", addStatuses: ["il_peace_process"], effects: { resources: { influence: 150 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "il_intifada",
      speaker: "Шеф Шабак",
      situation: "Из-за строительства поселений вспыхнуло масштабное восстание. Ракеты летят каждый день.",
      requires: { statuses: ["il_settlements_growing"] },
      weight: 1,
      choices: [
        { label: "Начать полномасштабную военную операцию", addStatuses: ["il_war_state"], effects: { resources: { money: -1000, influence: -200 }, sectors: { army: 2 }, dovolstvo: -15 } },
        { label: "Эвакуировать новые поселения", removeStatuses: ["il_settlements_growing"], effects: { dovolstvo: -40, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "il_two_state",
      speaker: "Президент США",
      situation: "Вы заморозили поселения. Теперь мы требуем подписать договор о создании двух государств.",
      requires: { statuses: ["il_peace_process"] },
      weight: 1,
      choices: [
        { label: "Подписать исторический мирный договор", removeStatuses: ["il_peace_process"], effects: { resources: { money: 2000, influence: 500 }, sectors: { economy: 2 }, dovolstvo: 30 } },
        { label: "Разорвать переговоры, это угроза безопасности", removeStatuses: ["il_peace_process"], effects: { resources: { influence: -300 }, dovolstvo: 15 } }
      ]
    },

    // Chain 2: Tech Exodus
    {
      id: "il_tech_taxes",
      speaker: "Министр Финансов",
      situation: "У нас огромный дефицит. Давайте повысим налоги для IT-компаний (Силиконовой Вади).",
      weight: 1,
      choices: [
        { label: "Повысить налоги", addStatuses: ["il_tech_exodus"], effects: { resources: { money: 1000 }, sectors: { economy: -1 }, dovolstvo: -10 } },
        { label: "Ввести налоговые льготы", addStatuses: ["il_tech_hub"], effects: { resources: { money: -800 }, sectors: { science: 2 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "il_brain_drain",
      speaker: "CEO Стартапа",
      situation: "Из-за высоких налогов мы переводим штаб-квартиру в Лондон. Прощайте.",
      requires: { statuses: ["il_tech_exodus"] },
      weight: 1,
      choices: [
        { label: "Запретить вывод капитала!", effects: { resources: { influence: -150 }, sectors: { economy: -2, science: -2 }, dovolstvo: -30 } },
        { label: "Предложить им эксклюзивные гранты на возвращение", removeStatuses: ["il_tech_exodus"], effects: { resources: { money: -2000 }, sectors: { science: 1 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "il_cyber_empire",
      speaker: "Директор Моссад",
      situation: "Наши технологии позволяют взламывать телефоны кого угодно. Диктаторы готовы платить миллиарды.",
      requires: { statuses: ["il_tech_hub"] },
      weight: 1,
      choices: [
        { label: "Продавать кибероружие всем желающим", effects: { resources: { money: 3000, influence: -300 }, sectors: { intel: 2 }, dovolstvo: 10 } },
        { label: "Только для нужд нашей разведки", effects: { resources: { influence: 150 }, sectors: { intel: 1 } } }
      ]
    },

    // Chain 3: Haredim (Ultra-Orthodox)
    {
      id: "il_haredim_draft",
      speaker: "Верховный Суд",
      situation: "Освобождение ультраортодоксов от службы в армии незаконно. Они должны служить как все.",
      weight: 1,
      choices: [
        { label: "Начать призыв в армию", addStatuses: ["il_haredim_riots"], effects: { sectors: { army: 1 }, dovolstvo: 20, resources: { influence: 100 } } },
        { label: "Принять закон об обходе решения суда", addStatuses: ["il_secular_anger"], effects: { dovolstvo: -20, resources: { influence: -100 } } }
      ]
    },
    {
      id: "il_haredim_protests",
      speaker: "Главный Раввин",
      situation: "Студенты иешив перекрыли шоссе в знак протеста против призыва! Они скорее сядут в тюрьму.",
      requires: { statuses: ["il_haredim_riots"] },
      weight: 1,
      choices: [
        { label: "Бросить их в военные тюрьмы", effects: { resources: { money: -500 }, dovolstvo: -30, sectors: { smi: -1 } } },
        { label: "Уступить и отменить призыв", removeStatuses: ["il_haredim_riots"], addStatuses: ["il_secular_anger"], effects: { dovolstvo: -20 } }
      ]
    },
    {
      id: "il_secular_strike",
      speaker: "Глава Профсоюзов",
      situation: "Светские граждане платят налоги и служат, пока другие молятся. Мы объявляем всеобщую забастовку!",
      requires: { statuses: ["il_secular_anger"] },
      weight: 1,
      choices: [
        { label: "Урезать субсидии религиозным школам", removeStatuses: ["il_secular_anger"], effects: { resources: { money: 1000 }, dovolstvo: 30 } },
        { label: "Разогнать забастовку водометами", effects: { sectors: { economy: -2 }, dovolstvo: -40 } }
      ]
    },

    // Chain 4: Iron Dome
    {
      id: "il_laser_defense",
      speaker: "Генерал ПВО",
      situation: "Ракеты для Железного Купола слишком дорогие. У нас есть прототип боевого лазера 'Железный Луч'.",
      weight: 1,
      choices: [
        { label: "Влить миллиарды в лазеры", addStatuses: ["il_laser_shield"], effects: { resources: { money: -1500 }, sectors: { science: 2, army: 1 } } },
        { label: "Просить США профинансировать ракеты", effects: { resources: { influence: -100 }, sectors: { army: 1 } } }
      ]
    },
    {
      id: "il_laser_export",
      speaker: "Министр Обороны",
      situation: "Наш боевой лазер сбивает ракеты за копейки. Европа хочет купить систему для защиты от соседей.",
      requires: { statuses: ["il_laser_shield"] },
      weight: 1,
      choices: [
        { label: "Продать системы в Европу", effects: { resources: { money: 4000, influence: 200 }, sectors: { economy: 1 }, dovolstvo: 20 } },
        { label: "Сохранить технологию в тайне", effects: { sectors: { intel: 1 } } }
      ]
    },
    {
      id: "il_laser_hack",
      speaker: "Директор Моссад",
      situation: "Хакеры пытаются украсть чертежи 'Железного Луча'.",
      requires: { statuses: ["il_laser_shield"] },
      weight: 1,
      choices: [
        { label: "Запустить ответную кибератаку", effects: { resources: { influence: 150 }, sectors: { intel: 2 } } },
        { label: "Усилить внутреннюю защиту", effects: { resources: { money: -300 } } }
      ]
    },

    // Chain 5: Judicial Reform
    {
      id: "il_judicial_reform_start",
      speaker: "Министр Юстиции",
      situation: "Судьи слишком левые и блокируют законы. Давайте дадим парламенту право отменять их решения.",
      weight: 1,
      choices: [
        { label: "Запустить реформу!", addStatuses: ["il_reform_protests"], effects: { resources: { influence: -100 }, dovolstvo: -20 } },
        { label: "Не раскалывать общество", effects: { dovolstvo: 15 } }
      ]
    },
    {
      id: "il_pilots_strike",
      speaker: "Командующий ВВС",
      situation: "Пилоты-резервисты отказываются летать на тренировки из-за судебной реформы. Обороноспособность под угрозой!",
      requires: { statuses: ["il_reform_protests"] },
      weight: 1,
      choices: [
        { label: "Уволить мятежников!", addStatuses: ["il_army_crisis"], effects: { sectors: { army: -2 }, dovolstvo: -30 } },
        { label: "Приостановить реформу ради переговоров", removeStatuses: ["il_reform_protests"], addStatuses: ["il_reform_paused"], effects: { dovolstvo: 20 } }
      ]
    },
    {
      id: "il_constitution",
      speaker: "Президент",
      situation: "Реформа на паузе. Может, пора наконец написать настоящую Конституцию, чтобы избежать этого в будущем?",
      requires: { statuses: ["il_reform_paused"] },
      weight: 1,
      choices: [
        { label: "Собрать Учредительное Собрание", removeStatuses: ["il_reform_paused"], effects: { resources: { influence: 300 }, dovolstvo: 40 } },
        { label: "Слишком сложно. Отменить реформу и забыть", removeStatuses: ["il_reform_paused"], effects: { dovolstvo: 10 } }
      ]
    }
  ],`;

function replaceDeck(countryName, newCardsCode) {
  const startIdx = cardsCode.indexOf(`  ${countryName}: [`);
  if (startIdx === -1) {
    console.log(`Could not find ${countryName} deck`);
    return;
  }
  let endIdx = -1;
  if (countryName === 'india') endIdx = cardsCode.indexOf('  japan: [', startIdx);
  if (countryName === 'japan') endIdx = cardsCode.indexOf('  israel: [', startIdx);
  if (countryName === 'israel') endIdx = cardsCode.indexOf('};', startIdx);
  
  if (endIdx !== -1) {
    cardsCode = cardsCode.substring(0, startIdx) + newCardsCode + '\n' + cardsCode.substring(endIdx);
    console.log(`Replaced ${countryName}`);
  } else {
    console.log(`Could not find end of ${countryName} deck`);
  }
}

replaceDeck('india', newIndia);
replaceDeck('japan', newJapan);
replaceDeck('israel', newIsrael);

fs.writeFileSync(cardsFile, cardsCode);
console.log('Cards file updated!');

const statusesFile = path.join(__dirname, 'generate_statuses.js');
let stCode = fs.readFileSync(statusesFile, 'utf-8');

const newStatuses = `
  // INDIA
  { id: 'in_tech_clean', name: 'Очищенный IT-Сектор', type: 'state', description: 'Колл-центры легализованы и очищены от скама.', effects: { modifiers: { outputMult: { umniki: 1.1 } } } },
  { id: 'in_scam_hub', name: 'Мировой Скам-Хаб', type: 'state', description: 'Тысячи мошенников вытягивают деньги из пенсионеров по всему миру.', effects: { modifiers: { outputMult: { economy: 1.1 }, dovolstvoDrift: -1 } } },
  { id: 'in_ai_hub', name: 'Столица ИИ', type: 'state', description: 'Миллионы бывших операторов обучают нейросети.', effects: { modifiers: { outputMult: { science: 1.2 } } } },
  { id: 'in_censorship', name: 'Строгая Цензура', type: 'state', description: 'Кино и искусство под жестким контролем религии.', effects: { modifiers: { outputMult: { smi: 0.8 }, dovolstvoDrift: -1 } } },
  { id: 'in_free_cinema', name: 'Свободный Болливуд', type: 'state', description: 'Режиссеры снимают что хотят, несмотря на протесты.', effects: { modifiers: { outputMult: { smi: 1.2 } } } },
  { id: 'in_global_cinema', name: 'Глобальный Болливуд', type: 'state', description: 'Наши фильмы собирают кассу по всему миру.', effects: { modifiers: { outputMult: { economy: 1.1, smi: 1.2 } } } },
  { id: 'in_space_power', name: 'Лунная Держава', type: 'state', description: 'Наш ровер бороздит просторы Луны.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'in_mars_power', name: 'Марсианская Держава', type: 'state', description: 'Мы успешно вышли на орбиту Марса.', effects: { modifiers: { dovolstvoDrift: 2 } } },
  { id: 'in_farmers_happy', name: 'Довольные Фермеры', type: 'state', description: 'Щедрые субсидии спасают урожай.', effects: { modifiers: { outputMult: { rabotyagi: 1.2 } } } },
  { id: 'in_corp_farming', name: 'Корпоративные Фермы', type: 'state', description: 'Мелкие хозяйства разоряются, уступая место агрохолдингам.', effects: { modifiers: { outputMult: { economy: 1.2, rabotyagi: 0.8 } } } },
  { id: 'in_border_war', name: 'Пограничная Война', type: 'state', description: 'Артиллерийские дуэли не стихают.', effects: { modifiers: { dovolstvoDrift: -2 } } },
  { id: 'in_peace_talks', name: 'Мирные Переговоры', type: 'state', description: 'Идет сложный процесс примирения с соседями.', effects: { modifiers: { dovolstvoDrift: 1 } } },

  // JAPAN
  { id: 'jp_robot_care', name: 'Роботы-Сиделки', type: 'state', description: 'Машины ухаживают за пенсионерами.', effects: { modifiers: { outputMult: { science: 1.1 } } } },
  { id: 'jp_migrants', name: 'Наплыв Мигрантов', type: 'state', description: 'Иностранцы решают проблему рабочих рук, но пугают общество.', effects: { modifiers: { outputMult: { rabotyagi: 1.2 }, dovolstvoDrift: -2 } } },
  { id: 'jp_ai_society', name: 'ИИ-Общество', type: 'state', description: 'Нейросети проникают во все сферы жизни.', effects: { modifiers: { outputMult: { science: 1.3 } } } },
  { id: 'jp_4day_week', name: '4-Дневная Неделя', type: 'state', description: 'Люди наконец-то начали высыпаться.', effects: { modifiers: { dovolstvoDrift: 2, outputMult: { economy: 0.9 } } } },
  { id: 'jp_overwork', name: 'Кароси', type: 'state', description: 'Переработки убивают людей прямо на рабочем месте.', effects: { modifiers: { dovolstvoDrift: -3, outputMult: { economy: 1.2 } } } },
  { id: 'jp_casinos', name: 'Легальные Казино', type: 'state', description: 'Осака превратилась в азиатский Лас-Вегас.', effects: { modifiers: { outputMult: { economy: 1.1 } } } },
  { id: 'jp_yakuza_war', name: 'Война с Якудзой', type: 'state', description: 'Полиция зачищает улицы от преступности.', effects: { modifiers: { dovolstvoDrift: -1 } } },
  { id: 'jp_corrupt_casinos', name: 'Коррумпированные Казино', type: 'state', description: 'Якудза отмывает деньги через рулетки.', effects: { modifiers: { outputMult: { economy: 0.8, siloviki: 0.8 } } } },
  { id: 'jp_water_dump', name: 'Сброс Воды', type: 'state', description: 'Радиоактивная вода сливается в океан.', effects: { modifiers: { dovolstvoDrift: -1 } } },
  { id: 'jp_trade_war', name: 'Торговая Война (Рыба)', type: 'state', description: 'Соседи блокируют импорт наших товаров.', effects: { modifiers: { outputMult: { economy: 0.9 } } } },
  { id: 'jp_remilitarization', name: 'Ремилитаризация', type: 'state', description: 'Отказ от пацифизма. Армия растет.', effects: { modifiers: { outputMult: { army: 1.2 }, dovolstvoDrift: -1 } } },
  { id: 'jp_naval_power', name: 'Морская Сверхдержава', type: 'state', description: 'Наши авианосцы доминируют в Тихом океане.', effects: { modifiers: { outputMult: { army: 1.4 } } } },

  // ISRAEL
  { id: 'il_settlements_growing', name: 'Рост Поселений', type: 'state', description: 'Новые кварталы строятся на спорных землях.', effects: { modifiers: { outputMult: { economy: 1.1 }, dovolstvoDrift: -1 } } },
  { id: 'il_peace_process', name: 'Мирный Процесс', type: 'state', description: 'Идут переговоры о создании двух государств.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'il_war_state', name: 'Состояние Войны', type: 'state', description: 'Ракеты летят, армия проводит операции.', effects: { modifiers: { dovolstvoDrift: -3, outputMult: { army: 1.3 } } } },
  { id: 'il_tech_exodus', name: 'Бегство IT', type: 'state', description: 'Стартапы уезжают из-за высоких налогов.', effects: { modifiers: { outputMult: { science: 0.8 } } } },
  { id: 'il_tech_hub', name: 'Налоговый Рай', type: 'state', description: 'Силиконовая Вади процветает за счет льгот.', effects: { modifiers: { outputMult: { science: 1.3, economy: 1.1 } } } },
  { id: 'il_haredim_riots', name: 'Бунты Ортодоксов', type: 'state', description: 'Религиозные граждане перекрывают дороги из-за призыва.', effects: { modifiers: { dovolstvoDrift: -2 } } },
  { id: 'il_secular_anger', name: 'Светский Гнев', type: 'state', description: 'Светские граждане устали тащить всё на себе.', effects: { modifiers: { dovolstvoDrift: -2 } } },
  { id: 'il_laser_shield', name: 'Железный Луч', type: 'state', description: 'Лазерные системы ПВО сбивают ракеты за копейки.', effects: { modifiers: { outputMult: { army: 1.2, science: 1.1 } } } },
  { id: 'il_reform_protests', name: 'Протесты против Реформы', type: 'state', description: 'Миллионы на улицах защищают Верховный Суд.', effects: { modifiers: { dovolstvoDrift: -2, outputMult: { economy: 0.9 } } } },
  { id: 'il_army_crisis', name: 'Кризис Армии', type: 'state', description: 'Резервисты отказываются служить.', effects: { modifiers: { outputMult: { army: 0.7 }, dovolstvoDrift: -3 } } },
  { id: 'il_reform_paused', name: 'Реформа на Паузе', type: 'state', description: 'Законопроект отложен ради переговоров.', effects: { modifiers: { dovolstvoDrift: 1 } } },

  // Уникальные перки стран (startStatuses)
`;

stCode = stCode.replace('// Уникальные перки стран (startStatuses)', newStatuses);
fs.writeFileSync(statusesFile, stCode);
console.log('Statuses updated!');
