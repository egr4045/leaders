const fs = require('fs');
const path = require('path');

const cardsFile = path.join(__dirname, 'generate_unique_cards.js');
let cardsCode = fs.readFileSync(cardsFile, 'utf-8');

const newRussia = `  russia: [
    // Chain 1: Sanctions & Import
    {
      id: "ru_sanctions_hit",
      speaker: "Министр Экономики",
      situation: "Запад ввел новые пакеты санкций. Нам не хватает высокотехнологичных комплектующих.",
      weight: 1,
      choices: [
        { label: "Запустить параллельный импорт", addStatuses: ["ru_parallel_import"], effects: { resources: { money: -500 }, sectors: { economy: 1 }, dovolstvo: 10 } },
        { label: "Опираться только на свои силы (Импортозамещение)", addStatuses: ["ru_import_sub"], effects: { resources: { money: -1000 }, sectors: { science: 1 }, dovolstvo: -15 } }
      ]
    },
    {
      id: "ru_import_crisis",
      speaker: "Глава ЦБ",
      situation: "Параллельный импорт истощает наши запасы валюты. Цены на электронику космические.",
      requires: { statuses: ["ru_parallel_import"] },
      weight: 1,
      choices: [
        { label: "Ввести жесткий валютный контроль", effects: { resources: { influence: 100 }, sectors: { economy: -1 }, dovolstvo: -20 } },
        { label: "Переключиться на китайских поставщиков", removeStatuses: ["ru_parallel_import"], addStatuses: ["ru_china_tech"], effects: { resources: { money: 1000, influence: -200 }, sectors: { economy: 1 } } }
      ]
    },
    {
      id: "ru_tech_sovereignty",
      speaker: "Министр Промышленности",
      situation: "Наши инженеры смогли скопировать процессоры. Мы можем начать массовое производство.",
      requires: { statuses: ["ru_import_sub"] },
      weight: 1,
      choices: [
        { label: "Влить миллиарды в госзаказ", effects: { resources: { money: -2000 }, sectors: { science: 2, economy: 1 }, dovolstvo: 20 } },
        { label: "Слишком дорого, купим у Азии", removeStatuses: ["ru_import_sub"], addStatuses: ["ru_china_tech"], effects: { resources: { money: 500 } } }
      ]
    },

    // Chain 2: Oligarchs
    {
      id: "ru_oligarchs_loyalty",
      speaker: "Директор ФСБ",
      situation: "Некоторые олигархи выводят капиталы и финансируют оппозицию за рубежом.",
      weight: 1,
      choices: [
        { label: "Национализировать их активы!", addStatuses: ["ru_state_capitalism"], effects: { resources: { money: 2000, influence: 200 }, sectors: { economy: -1 }, dovolstvo: 30 } },
        { label: "Предложить им налоговую амнистию", addStatuses: ["ru_oligarch_pact"], effects: { resources: { money: 1000, influence: -150 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "ru_state_corp_inefficiency",
      speaker: "Счетная Палата",
      situation: "Национализированные заводы убыточны. Директора-чиновники воруют бюджеты.",
      requires: { statuses: ["ru_state_capitalism"] },
      weight: 1,
      choices: [
        { label: "Начать массовые посадки директоров", addStatuses: ["ru_purge"], effects: { resources: { influence: 300 }, sectors: { siloviki: 2, economy: -1 }, dovolstvo: 20 } },
        { label: "Заливать убытки деньгами", effects: { resources: { money: -1500 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "ru_capital_flight",
      speaker: "Министр Финансов",
      situation: "Олигархи, которым мы дали амнистию, всё равно вывели деньги через крипту.",
      requires: { statuses: ["ru_oligarch_pact"] },
      weight: 1,
      choices: [
        { label: "Создать национальную криптобиржу под контролем ФСБ", effects: { resources: { money: 1500 }, sectors: { siloviki: 1, economy: 1 }, dovolstvo: 10 } },
        { label: "Разорвать пакт и начать конфискации", removeStatuses: ["ru_oligarch_pact"], addStatuses: ["ru_state_capitalism"], effects: { resources: { money: 2000 }, dovolstvo: 20 } }
      ]
    },

    // Chain 3: Demographics
    {
      id: "ru_demographics_drop",
      speaker: "Министр Труда",
      situation: "Смертность превышает рождаемость. Работать на заводах некому.",
      weight: 1,
      choices: [
        { label: "Увеличить Материнский Капитал", addStatuses: ["ru_mat_capital"], effects: { resources: { money: -1500 }, dovolstvo: 25 } },
        { label: "Завезти миллионы мигрантов", addStatuses: ["ru_migrants"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -30 } }
      ]
    },
    {
      id: "ru_migrant_crime",
      speaker: "Глава МВД",
      situation: "Из-за наплыва мигрантов выросла преступность. Местные формируют дружины.",
      requires: { statuses: ["ru_migrants"] },
      weight: 1,
      choices: [
        { label: "Ужесточить визовый режим и начать депортации", removeStatuses: ["ru_migrants"], effects: { resources: { money: -1000 }, sectors: { economy: -2 }, dovolstvo: 40 } },
        { label: "Подавлять дружины, нам нужны рабочие руки", effects: { resources: { influence: -200 }, sectors: { siloviki: 1 }, dovolstvo: -40 } }
      ]
    },
    {
      id: "ru_baby_boom",
      speaker: "Министр Труда",
      situation: "Материнский капитал сработал! Но школ и детсадов не хватает.",
      requires: { statuses: ["ru_mat_capital"] },
      weight: 1,
      choices: [
        { label: "Развернуть мега-стройку инфраструктуры", effects: { resources: { money: -2000 }, sectors: { economy: 2 }, dovolstvo: 30 } },
        { label: "Сэкономить, пусть учатся в три смены", effects: { dovolstvo: -20 } }
      ]
    },

    // Chain 4: Energy Pivot
    {
      id: "ru_gas_pivot",
      speaker: "Глава Газпрома",
      situation: "Европа отказалась от нашего газа. Трубопроводы простаивают.",
      weight: 1,
      choices: [
        { label: "Строить 'Силу Сибири-2' в Китай", addStatuses: ["ru_asian_gas"], effects: { resources: { money: -2000, influence: 150 }, sectors: { economy: 1 } } },
        { label: "Переориентироваться на внутреннюю газификацию", addStatuses: ["ru_local_gas"], effects: { resources: { money: -1000 }, dovolstvo: 30 } }
      ]
    },
    {
      id: "ru_china_price",
      speaker: "Министр Энергетики",
      situation: "Китай требует огромную скидку на газ по новой трубе. Это почти невыгодно.",
      requires: { statuses: ["ru_asian_gas"] },
      weight: 1,
      choices: [
        { label: "Согласиться, выбора нет", effects: { resources: { influence: -200, money: 500 }, dovolstvo: -10 } },
        { label: "Заморозить стройку и шантажировать Азию", effects: { resources: { influence: 300, money: -1000 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "ru_gas_boom",
      speaker: "Губернатор Сибири",
      situation: "Внутренняя газификация дала толчок местной промышленности. Регионы оживают.",
      requires: { statuses: ["ru_local_gas"] },
      weight: 1,
      choices: [
        { label: "Дать регионам больше автономии и налогов", effects: { resources: { influence: -150, money: 1000 }, sectors: { economy: 2 }, dovolstvo: 20 } },
        { label: "Забрать сверхдоходы в федеральный центр", effects: { resources: { money: 2000, influence: 200 }, dovolstvo: -20 } }
      ]
    },

    // Chain 5: Internet
    {
      id: "ru_internet_control",
      speaker: "Глава Роскомнадзора",
      situation: "Западные соцсети используются для координации протестов. Пора закрывать интернет.",
      weight: 1,
      choices: [
        { label: "Включить 'Чебурнет' (изолированный интернет)", addStatuses: ["ru_cheburnet"], effects: { resources: { influence: 400 }, sectors: { science: -1, smi: 1 }, dovolstvo: -30 } },
        { label: "Ограничиться блокировкой отдельных сервисов", addStatuses: ["ru_vpn_era"], effects: { resources: { influence: 100 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "ru_it_brain_drain",
      speaker: "Министр Цифры",
      situation: "Из-за Чебурнета айтишники массово бегут из страны. Разработка встала.",
      requires: { statuses: ["ru_cheburnet"] },
      weight: 1,
      choices: [
        { label: "Запретить выезд IT-специалистам!", effects: { resources: { influence: 200 }, sectors: { science: -2 }, dovolstvo: -40 } },
        { label: "Снять блокировки для 'своих' компаний", effects: { resources: { money: -500 }, sectors: { science: 1 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "ru_vpn_ban",
      speaker: "Глава ФСБ",
      situation: "Люди массово используют VPN, блокировки не работают. Нужно криминализовать обход.",
      requires: { statuses: ["ru_vpn_era"] },
      weight: 1,
      choices: [
        { label: "Сажать за использование VPN", effects: { resources: { influence: 300 }, sectors: { siloviki: 2 }, dovolstvo: -30 } },
        { label: "Создать свои удобные аналоги сервисов", effects: { resources: { money: -1500 }, sectors: { science: 2, smi: 1 }, dovolstvo: 25 } }
      ]
    }
  ],`;

const newGermany = `  germany: [
    // Chain 1: Energy Transition
    {
      id: "de_energy_crisis",
      speaker: "Министр Экономики",
      situation: "Мы закрыли АЭС, а дешевого газа больше нет. Заводы встают из-за цен на энергию.",
      weight: 1,
      choices: [
        { label: "Расконсервировать угольные электростанции", addStatuses: ["de_coal_revival"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -15 } },
        { label: "Ускорить зеленый переход любой ценой", addStatuses: ["de_green_pioneer"], effects: { resources: { money: -2000 }, sectors: { science: 1 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "de_climate_protests",
      speaker: "Лидер Партии Зеленых",
      situation: "Из-за возврата к углю экологи приклеивают себя к дорогам и блокируют аэропорты.",
      requires: { statuses: ["de_coal_revival"] },
      weight: 1,
      choices: [
        { label: "Жестко задерживать эко-активистов", effects: { resources: { influence: 150 }, sectors: { siloviki: 1 }, dovolstvo: -20 } },
        { label: "Уступить и ввести налог на выбросы", removeStatuses: ["de_coal_revival"], addStatuses: ["de_green_pioneer"], effects: { resources: { money: -1000 }, sectors: { economy: -1 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "de_hydrogen_economy",
      speaker: "Канцлер",
      situation: "Наши зеленые технологии окупились! Мы можем стать мировым хабом водородной энергетики.",
      requires: { statuses: ["de_green_pioneer"] },
      weight: 1,
      choices: [
        { label: "Инвестировать в водородный экспорт", effects: { resources: { money: 3000, influence: 200 }, sectors: { economy: 2, science: 1 }, dovolstvo: 20 } },
        { label: "Оставить водород для внутреннего рынка", effects: { resources: { money: 1000 }, sectors: { economy: 1 } } }
      ]
    },

    // Chain 2: Auto Industry
    {
      id: "de_auto_ban",
      speaker: "Глава ЕС",
      situation: "ЕС требует запретить продажу машин с ДВС к 2035 году. Наш автопром в панике.",
      weight: 1,
      choices: [
        { label: "Поддержать запрет, мы перейдем на электро!", addStatuses: ["de_ev_transition"], effects: { resources: { money: -1500 }, sectors: { economy: -1 }, dovolstvo: 10 } },
        { label: "Наложить вето в ЕС, защитить наши заводы", addStatuses: ["de_ice_defender"], effects: { resources: { influence: 200 }, sectors: { economy: 1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "de_china_ev_flood",
      speaker: "CEO Volkswagen",
      situation: "Дешевые китайские электромобили захватывают наш рынок. Мы не можем конкурировать.",
      requires: { statuses: ["de_ev_transition"] },
      weight: 1,
      choices: [
        { label: "Ввести огромные заградительные пошлины", effects: { resources: { influence: 100 }, sectors: { economy: 1 }, dovolstvo: -15 } },
        { label: "Субсидировать покупку немецких авто", effects: { resources: { money: -2000 }, sectors: { economy: 1 }, dovolstvo: 25 } }
      ]
    },
    {
      id: "de_synthetic_fuel",
      speaker: "Инженер Porsche",
      situation: "Мы защитили ДВС. Теперь мы разработали синтетическое углеродно-нейтральное топливо!",
      requires: { statuses: ["de_ice_defender"] },
      weight: 1,
      choices: [
        { label: "Запатентовать и продавать всему миру", effects: { resources: { money: 4000 }, sectors: { science: 2, economy: 2 }, dovolstvo: 20 } },
        { label: "Это слишком нишевая технология", effects: { resources: { money: 500 } } }
      ]
    },

    // Chain 3: Migration
    {
      id: "de_migration_crisis",
      speaker: "Мэр Берлина",
      situation: "Нам критически не хватает рабочих рук, но центры приема беженцев переполнены.",
      weight: 1,
      choices: [
        { label: "Выдавать рабочие визы квалифицированным мигрантам", addStatuses: ["de_skilled_migrants"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -10 } },
        { label: "Закрыть границы и повысить зарплаты местным", addStatuses: ["de_closed_borders"], effects: { resources: { money: -1500 }, sectors: { economy: -1 }, dovolstvo: 30 } }
      ]
    },
    {
      id: "de_far_right_rise",
      speaker: "Аналитик",
      situation: "Из-за наплыва мигрантов ультраправые партии набирают рекордные рейтинги.",
      requires: { statuses: ["de_skilled_migrants"] },
      weight: 1,
      choices: [
        { label: "Запретить ультраправую партию через суд", effects: { resources: { influence: -200 }, dovolstvo: -40 } },
        { label: "Ужесточить правила депортации", effects: { resources: { influence: 100 }, dovolstvo: 20 } }
      ]
    },
    {
      id: "de_demographic_collapse",
      speaker: "Министр Финансов",
      situation: "Мы закрыли границы, теперь пенсионная система рушится из-за нехватки налогов.",
      requires: { statuses: ["de_closed_borders"] },
      weight: 1,
      choices: [
        { label: "Поднять пенсионный возраст до 70 лет", effects: { resources: { money: 2000 }, dovolstvo: -50 } },
        { label: "Взять гигантские долги на выплаты", effects: { resources: { money: -3000 }, dovolstvo: 10 } }
      ]
    },

    // Chain 4: EU Leadership
    {
      id: "de_eu_debt",
      speaker: "Министр Финансов Южной Европы",
      situation: "Южные страны ЕС снова на грани дефолта. Они просят выпустить общие евробонды.",
      weight: 1,
      choices: [
        { label: "Согласиться (мы заплатим за их долги)", addStatuses: ["de_eu_payer"], effects: { resources: { money: -2500, influence: 300 }, sectors: { economy: -1 }, dovolstvo: -20 } },
        { label: "Отказать. Пусть экономят", addStatuses: ["de_eu_strict"], effects: { resources: { money: 1500, influence: -200 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "de_eu_integration",
      speaker: "Канцлер",
      situation: "Раз мы платим за ЕС, давайте требовать полного фискального контроля над их бюджетами.",
      requires: { statuses: ["de_eu_payer"] },
      weight: 1,
      choices: [
        { label: "Создать 'Соединенные Штаты Европы'", effects: { resources: { influence: 500, money: 2000 }, sectors: { economy: 2 }, dovolstvo: 10 } },
        { label: "Это вызовет бунт суверенитетов", effects: { resources: { influence: -100 } } }
      ]
    },
    {
      id: "de_euro_collapse",
      speaker: "Глава ЕЦБ",
      situation: "Из-за вашей строгости Южная Европа грозит выйти из Еврозоны. Евро падает.",
      requires: { statuses: ["de_eu_strict"] },
      weight: 1,
      choices: [
        { label: "Пусть выходят! Вернем Марку!", effects: { resources: { influence: -300, money: -1000 }, sectors: { economy: -2 }, dovolstvo: 30 } },
        { label: "Выдать им экстренный кредит спасения", removeStatuses: ["de_eu_strict"], addStatuses: ["de_eu_payer"], effects: { resources: { money: -2000 }, dovolstvo: -15 } }
      ]
    },

    // Chain 5: Military (Zeitenwende)
    {
      id: "de_zeitenwende",
      speaker: "Министр Обороны",
      situation: "Бундесвер в ужасном состоянии. Танки не ездят, вертолеты не летают.",
      weight: 1,
      choices: [
        { label: "Выделить 100 миллиардов на армию", addStatuses: ["de_army_fund"], effects: { resources: { money: -2000 }, sectors: { army: 2 }, dovolstvo: 10 } },
        { label: "Армия нам не нужна, нас защитит НАТО", effects: { resources: { money: 1000, influence: -200 }, sectors: { army: -1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "de_bureaucracy",
      speaker: "Генерал",
      situation: "Из 100 миллиардов мы не потратили почти ничего. Бюрократия запрашивает 500 справок на каждую гайку.",
      requires: { statuses: ["de_army_fund"] },
      weight: 1,
      choices: [
        { label: "Провести радикальную чистку министерства", effects: { resources: { influence: 150 }, sectors: { army: 1 }, dovolstvo: 15 } },
        { label: "Отдать закупки американским корпорациям", effects: { resources: { money: -1000, influence: 200 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "de_european_army",
      speaker: "Канцлер",
      situation: "Наша армия теперь сильнейшая в Европе. Мы можем инициировать создание единой Армии ЕС.",
      requires: { statuses: ["de_army_fund"] },
      weight: 1,
      choices: [
        { label: "Возглавить Армию Европы", effects: { resources: { influence: 600, money: -1000 }, sectors: { army: 3 }, dovolstvo: 20 } },
        { label: "Оставить войска под национальным контролем", effects: { resources: { influence: 100 } } }
      ]
    }
  ],`;

const newUK = `  uk: [
    // Chain 1: NHS
    {
      id: "uk_nhs_crisis",
      speaker: "Министр Здравоохранения",
      situation: "Очереди в NHS достигают 18 месяцев. Врачи и медсестры объявляют бессрочную забастовку.",
      weight: 1,
      choices: [
        { label: "Поднять зарплаты на 20% (Огромный долг)", addStatuses: ["uk_nhs_saved"], effects: { resources: { money: -2000 }, dovolstvo: 30 } },
        { label: "Ввести элементы платной медицины", addStatuses: ["uk_private_health"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "uk_health_tax",
      speaker: "Канцлер Казначейства",
      situation: "Чтобы оплатить повышение зарплат в NHS, нам придется поднять налоги до рекордного уровня.",
      requires: { statuses: ["uk_nhs_saved"] },
      weight: 1,
      choices: [
        { label: "Повысить налоги", addStatuses: ["uk_tax_revolt"], effects: { resources: { money: 2000 }, sectors: { economy: 1 }, dovolstvo: -10 } },
        { label: "Взять в долг, пусть платят дети", effects: { resources: { money: -500, influence: 50 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "uk_tax_protests",
      speaker: "Лидер Профсоюзов",
      situation: "Из-за рекордных налогов на спасение NHS начались массовые протесты среднего класса.",
      requires: { statuses: ["uk_tax_revolt"] },
      weight: 1,
      choices: [
        { label: "Ввести налог на богатство вместо этого", effects: { resources: { influence: 50 }, sectors: { economy: 1 }, dovolstvo: 15 } },
        { label: "Подавить протесты полицией", effects: { sectors: { siloviki: 2 }, dovolstvo: -20 } }
      ]
    },

    // Chain 2: Scotland
    {
      id: "uk_scotland_ref",
      speaker: "Первый министр Шотландии",
      situation: "Мы требуем второй референдум о независимости! Брексит изменил всё.",
      weight: 1,
      choices: [
        { label: "Разрешить референдум", addStatuses: ["uk_scot_ref_active"], effects: { resources: { influence: 50 }, dovolstvo: 10 } },
        { label: "Отказать жестко (Это незаконно!)", addStatuses: ["uk_scot_anger"], effects: { resources: { influence: 200 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "uk_scotland_leaves",
      speaker: "BBC News",
      situation: "Шотландия проголосовала ЗА выход! Нам придется делить армию и ядерные подлодки.",
      requires: { statuses: ["uk_scot_ref_active"] },
      weight: 1,
      choices: [
        { label: "Мирное расставание", addStatuses: ["uk_border_crisis"], effects: { resources: { money: -1000, influence: 50 }, sectors: { economy: 1 }, dovolstvo: 0 } },
        { label: "Ввести войска в Эдинбург (Отменить итоги)", effects: { resources: { influence: 100 }, sectors: { siloviki: 2 }, dovolstvo: -30 } }
      ]
    },
    {
      id: "uk_scot_border",
      speaker: "Пограничная Служба",
      situation: "Между Англией и независимой Шотландией теперь жесткая граница. Торговля встала.",
      requires: { statuses: ["uk_border_crisis"] },
      weight: 1,
      choices: [
        { label: "Подписать договор о свободной торговле", effects: { resources: { money: 500 }, sectors: { economy: 1 }, dovolstvo: 10 } },
        { label: "Ввести пошлины, пусть платят", effects: { resources: { influence: 100 }, sectors: { economy: 1 }, dovolstvo: 0 } }
      ]
    },

    // Chain 3: Economy/Brexit
    {
      id: "uk_trade_deal",
      speaker: "Министр Торговли",
      situation: "Нам нужно торговое соглашение с США. Но они требуют открыть рынок для хлорированной курицы и приватизировать NHS.",
      weight: 1,
      choices: [
        { label: "Согласиться. Нам нужны деньги", addStatuses: ["uk_us_vassal"], effects: { resources: { money: 2000, influence: 50 }, sectors: { economy: 1 }, dovolstvo: 0 } },
        { label: "Отказать. Британия не продается", addStatuses: ["uk_trade_iso"], effects: { resources: { money: -1000, influence: 100 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "uk_us_buyout",
      speaker: "Аналитик",
      situation: "Американские корпорации скупили половину британских брендов. Мы теряем экономический суверенитет.",
      requires: { statuses: ["uk_us_vassal"] },
      weight: 1,
      choices: [
        { label: "Ввести закон о защите нац. интересов", addStatuses: ["uk_us_trade_war"], effects: { resources: { money: -1500, influence: 100 }, dovolstvo: 10 } },
        { label: "Продолжать продавать активы", effects: { resources: { money: 2000 }, sectors: { economy: 1 }, dovolstvo: 0 } }
      ]
    },
    {
      id: "uk_us_sanctions",
      speaker: "Посол США",
      situation: "Закон о защите национальных интересов нарушает нашу сделку. Мы вводим тарифы на британские товары.",
      requires: { statuses: ["uk_us_trade_war"] },
      weight: 1,
      choices: [
        { label: "Подать жалобу в ВТО", effects: { resources: { influence: 100 }, sectors: { economy: 1 } } },
        { label: "Отменить закон", removeStatuses: ["uk_us_trade_war"], effects: { resources: { influence: 50 }, dovolstvo: 0 } }
      ]
    },

    // Chain 4: Monarchy
    {
      id: "uk_royal_scandal",
      speaker: "Главред Таблоида",
      situation: "Очередной член королевской семьи оказался в центре грязного скандала. Рейтинги монархии на дне.",
      weight: 1,
      choices: [
        { label: "Лишить его титулов и содержания", addStatuses: ["uk_modern_monarchy"], effects: { resources: { influence: 50 }, dovolstvo: 15 } },
        { label: "Замять скандал, надавив на прессу", addStatuses: ["uk_republican_rise"], effects: { resources: { influence: 50 }, sectors: { smi: 1 }, dovolstvo: 0 } }
      ]
    },
    {
      id: "uk_abolish_monarchy",
      speaker: "Лидер Оппозиции",
      situation: "Скандалы переполнили чашу. Половина страны требует провозгласить Республику!",
      requires: { statuses: ["uk_republican_rise"] },
      weight: 1,
      choices: [
        { label: "Провести референдум о Монархии", addStatuses: ["uk_republic_vote"], effects: { resources: { influence: 50 }, dovolstvo: 20 } },
        { label: "Корона священна! Подавить протесты", effects: { resources: { influence: 200 }, sectors: { siloviki: 1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "uk_new_republic",
      speaker: "Премьер-Министр",
      situation: "Народ проголосовал за Республику! Королевские дворцы теперь музеи. Нужно выбрать Президента.",
      requires: { statuses: ["uk_republic_vote"] },
      weight: 1,
      choices: [
        { label: "Перейти к президентской республике", effects: { resources: { influence: 50 }, sectors: { economy: 1 }, dovolstvo: 10 } },
        { label: "Оставить парламентскую систему", effects: { resources: { influence: 100 }, dovolstvo: 10 } }
      ]
    },

    // Chain 5: Channel Boats
    {
      id: "uk_channel_crisis",
      speaker: "Министр Внутренних Дел",
      situation: "Рекордное число лодок с нелегалами пересекает Ла-Манш. Отели переполнены беженцами.",
      weight: 1,
      choices: [
        { label: "Отправлять их всех в Руанду!", addStatuses: ["uk_rwanda_plan"], effects: { resources: { money: -1000, influence: 50 }, dovolstvo: 20 } },
        { label: "Упростить выдачу убежища", addStatuses: ["uk_open_doors"], effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "uk_echr_exit",
      speaker: "Европейский Суд по ПЧ",
      situation: "Ваш план с Руандой незаконен! Мы запрещаем депортационные рейсы.",
      requires: { statuses: ["uk_rwanda_plan"] },
      weight: 1,
      choices: [
        { label: "Выйти из ЕСПЧ и депортировать!", addStatuses: ["uk_pariah_state"], effects: { resources: { influence: 100 }, sectors: { siloviki: 1 }, dovolstvo: 20 } },
        { label: "Подчиниться суду (Отменить план)", removeStatuses: ["uk_rwanda_plan"], effects: { resources: { influence: 200 }, dovolstvo: 0 } }
      ]
    },
    {
      id: "uk_global_sanctions",
      speaker: "ООН",
      situation: "Выход из ЕСПЧ и жесткие депортации привели к санкциям со стороны правозащитных организаций.",
      requires: { statuses: ["uk_pariah_state"] },
      weight: 1,
      choices: [
        { label: "Мы гордая независимая нация!", effects: { resources: { influence: 50 }, sectors: { economy: -1 }, dovolstvo: 10 } },
        { label: "Вернуться в юрисдикцию ЕСПЧ", removeStatuses: ["uk_pariah_state"], effects: { resources: { influence: 200 }, dovolstvo: 0 } }
      ]
    }
  ],`;

// RUSSIA
let startIdx = cardsCode.indexOf('  russia: [');
let endIdx = cardsCode.indexOf('  usa: [', startIdx);
cardsCode = cardsCode.substring(0, startIdx) + newRussia + '\n' + cardsCode.substring(endIdx);

// GERMANY
startIdx = cardsCode.indexOf('  germany: [');
endIdx = cardsCode.indexOf('  india: [', startIdx);
cardsCode = cardsCode.substring(0, startIdx) + newGermany + '\n' + cardsCode.substring(endIdx);

// UK (Append before "};" that closes decks)
let loopIdx = cardsCode.indexOf('for (const [countryId, cards]');
endIdx = cardsCode.lastIndexOf('};', loopIdx);
if (endIdx === -1) {
  console.log("Could not find end of decks object");
} else {
  // Ensure we add a comma after the previous deck
  cardsCode = cardsCode.substring(0, endIdx) + newUK + '\n' + cardsCode.substring(endIdx);
}

fs.writeFileSync(cardsFile, cardsCode);
console.log('Cards file updated for Russia, Germany, UK!');

const statusesFile = path.join(__dirname, 'generate_statuses.js');
let stCode = fs.readFileSync(statusesFile, 'utf-8');

const newStatuses = `
  // RUSSIA
  { id: 'ru_parallel_import', name: 'Параллельный Импорт', type: 'state', description: 'Западные товары везут втридорога через третьи страны.', effects: { modifiers: { outputMult: { economy: 1.1 }, dovolstvoDrift: -1 } } },
  { id: 'ru_import_sub', name: 'Импортозамещение', type: 'state', description: 'Попытки производить всё самостоятельно.', effects: { modifiers: { outputMult: { science: 1.1, economy: 0.9 } } } },
  { id: 'ru_china_tech', name: 'Зависимость от Азии', type: 'state', description: 'Европу заменил Китай. Мы зависимы от их технологий.', effects: { modifiers: { outputMult: { economy: 1.2, science: 0.8 } } } },
  { id: 'ru_state_capitalism', name: 'Госкапитализм', type: 'state', description: 'Всё принадлежит государству. Олигархов нет.', effects: { modifiers: { outputMult: { siloviki: 1.2, economy: 0.8 }, dovolstvoDrift: -1 } } },
  { id: 'ru_oligarch_pact', name: 'Пакт с Олигархами', type: 'state', description: 'Бизнесу дали гарантии в обмен на лояльность.', effects: { modifiers: { outputMult: { economy: 1.2 } } } },
  { id: 'ru_purge', name: 'Чистки Директоров', type: 'state', description: 'За коррупцию сажают десятками.', effects: { modifiers: { outputMult: { siloviki: 1.3, economy: 0.7 } } } },
  { id: 'ru_mat_capital', name: 'Беби-Бум', type: 'state', description: 'Гигантские выплаты за рождение детей.', effects: { modifiers: { dovolstvoDrift: 2 } } },
  { id: 'ru_migrants', name: 'Мигрантский Кризис', type: 'state', description: 'Миллионы гастарбайтеров работают на стройках.', effects: { modifiers: { outputMult: { economy: 1.3, siloviki: 1.1 }, dovolstvoDrift: -3 } } },
  { id: 'ru_asian_gas', name: 'Поворот на Восток', type: 'state', description: 'Наш газ течет в Китай.', effects: { modifiers: { outputMult: { economy: 1.1 } } } },
  { id: 'ru_local_gas', name: 'Внутренняя Газификация', type: 'state', description: 'Промышленность регионов обеспечена дешевой энергией.', effects: { modifiers: { outputMult: { economy: 1.2 }, dovolstvoDrift: 1 } } },
  { id: 'ru_cheburnet', name: 'Чебурнет', type: 'state', description: 'Глобальная сеть отключена. Мы в изоляции.', effects: { modifiers: { outputMult: { science: 0.7, smi: 1.5 }, dovolstvoDrift: -3 } } },
  { id: 'ru_vpn_era', name: 'Эпоха VPN', type: 'state', description: 'Блокировки обходят 90% населения.', effects: { modifiers: { outputMult: { science: 1.1 } } } },

  // GERMANY
  { id: 'de_coal_revival', name: 'Возврат Угля', type: 'state', description: 'Угольные станции коптят небо ради энергии.', effects: { modifiers: { outputMult: { economy: 1.2 }, dovolstvoDrift: -2 } } },
  { id: 'de_green_pioneer', name: 'Зеленый Авангард', type: 'state', description: 'Абсолютная опора на возобновляемую энергию.', effects: { modifiers: { outputMult: { science: 1.3, economy: 0.9 }, dovolstvoDrift: 1 } } },
  { id: 'de_ev_transition', name: 'Электро-Переход', type: 'state', description: 'Машины с ДВС объявлены вне закона.', effects: { modifiers: { outputMult: { science: 1.2, economy: 0.9 } } } },
  { id: 'de_ice_defender', name: 'Защитники ДВС', type: 'state', description: 'Традиционный немецкий автопром продолжает дымить.', effects: { modifiers: { outputMult: { economy: 1.3 }, dovolstvoDrift: -1 } } },
  { id: 'de_skilled_migrants', name: 'Квалифицированные Мигранты', type: 'state', description: 'Умы со всего мира едут работать к нам.', effects: { modifiers: { outputMult: { science: 1.1, economy: 1.1 }, dovolstvoDrift: -1 } } },
  { id: 'de_closed_borders', name: 'Крепость Европа', type: 'state', description: 'Границы на замке. Рабочих не хватает.', effects: { modifiers: { outputMult: { economy: 0.8 }, dovolstvoDrift: 2 } } },
  { id: 'de_eu_payer', name: 'Кошелек Европы', type: 'state', description: 'Мы оплачиваем долги других стран ЕС.', effects: { modifiers: { outputMult: { economy: 0.8 }, dovolstvoDrift: -2 } } },
  { id: 'de_eu_strict', name: 'Немецкая Строгость', type: 'state', description: 'Ни цента должникам.', effects: { modifiers: { outputMult: { economy: 1.2 }, dovolstvoDrift: 1 } } },
  { id: 'de_army_fund', name: 'Zeitenwende', type: 'state', description: 'Огромные бюджеты влиты в Бундесвер.', effects: { modifiers: { outputMult: { army: 1.5 }, dovolstvoDrift: -1 } } },

  // UK
  { id: 'uk_nhs_saved', name: 'Спасенный NHS', type: 'state', description: 'Медицина бесплатная, но налоги неподъемные.', effects: { modifiers: { outputMult: { economy: 0.8 }, dovolstvoDrift: 2 } } },
  { id: 'uk_private_health', name: 'Частная Медицина', type: 'state', description: 'Здоровье только для богатых.', effects: { modifiers: { outputMult: { economy: 1.2 }, dovolstvoDrift: -3 } } },
  { id: 'uk_tax_revolt', name: 'Налоговый Бунт', type: 'state', description: 'Средний класс отказывается платить налоги.', effects: { modifiers: { dovolstvoDrift: -3, outputMult: { economy: 0.9 } } } },
  { id: 'uk_scot_ref_active', name: 'Второй Референдум', type: 'state', description: 'Шотландия голосует за свое будущее.', effects: { modifiers: { outputMult: { economy: 0.9 }, dovolstvoDrift: 1 } } },
  { id: 'uk_scot_anger', name: 'Шотландский Гнев', type: 'state', description: 'Эдинбург кипит от отказа в референдуме.', effects: { modifiers: { dovolstvoDrift: -3 } } },
  { id: 'uk_border_crisis', name: 'Граница с Шотландией', type: 'state', description: 'Жесткая граница разрушает торговлю острова.', effects: { modifiers: { outputMult: { economy: 0.8 } } } },
  { id: 'uk_us_vassal', name: 'Вассал США', type: 'state', description: 'Торговая сделка разрушила наши стандарты.', effects: { modifiers: { outputMult: { economy: 1.3, science: 0.8 }, dovolstvoDrift: -2 } } },
  { id: 'uk_trade_iso', name: 'Торговая Изоляция', type: 'state', description: 'Мы отрезаны от ЕС и США.', effects: { modifiers: { outputMult: { economy: 0.7 }, dovolstvoDrift: 1 } } },
  { id: 'uk_us_trade_war', name: 'Торговая Война с США', type: 'state', description: 'Америка вводит тарифы в ответ на нашу защиту.', effects: { modifiers: { outputMult: { economy: 0.8 } } } },
  { id: 'uk_modern_monarchy', name: 'Скромная Монархия', type: 'state', description: 'Король ездит на велосипеде.', effects: { modifiers: { dovolstvoDrift: 2 } } },
  { id: 'uk_republican_rise', name: 'Республиканский Рост', type: 'state', description: 'Антимонархические настроения зашкаливают.', effects: { modifiers: { dovolstvoDrift: -2 } } },
  { id: 'uk_republic_vote', name: 'Голосование за Республику', type: 'state', description: 'Страна решает судьбу тысячелетней монархии.', effects: { modifiers: { dovolstvoDrift: 1 } } },
  { id: 'uk_rwanda_plan', name: 'Депортации в Руанду', type: 'state', description: 'Жесткий контроль нелегальной миграции.', effects: { modifiers: { outputMult: { siloviki: 1.2 }, dovolstvoDrift: 1 } } },
  { id: 'uk_open_doors', name: 'Открытые Двери', type: 'state', description: 'Все беженцы приветствуются.', effects: { modifiers: { outputMult: { economy: 1.1 }, dovolstvoDrift: -2 } } },
  { id: 'uk_pariah_state', name: 'Страна-Изгой', type: 'state', description: 'Правозащитники ввели против нас санкции.', effects: { modifiers: { outputMult: { economy: 0.9 }, dovolstvoDrift: -1 } } },

  // Уникальные перки стран (startStatuses)
`;

stCode = stCode.replace('// Уникальные перки стран (startStatuses)', newStatuses);
fs.writeFileSync(statusesFile, stCode);
console.log('Statuses updated for Ru, De, UK!');
