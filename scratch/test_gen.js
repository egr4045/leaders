const fs = require('fs');
const path = require('path');

const advisorsDir = path.join(__dirname, '..', 'content', 'advisors');

const decks = {
  russia: [
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
  ],
  usa: [
    {
      id: "us_silicon_valley",
      speaker: "CEO Бигтеха",
      situation: "Мы готовы профинансировать вашу кампанию, если вы не будете жестко регулировать ИИ.",
      weight: 1,
      choices: [
        { label: "Берем деньги. Технологии — наше будущее", addStatuses: ["us_tech_monopoly"], effects: { resources: { money: 2000 }, sectors: { science: 1 } }, newsLines: { state: "Инновации ведут страну вперед", liberal: "Корпорации скупили правительство" } },
        { label: "Ужесточить антимонопольное законодательство", effects: { sectors: { economy: -1, intel: 1 }, dovolstvo: 10 }, newsLines: { state: "Закон един для всех", liberal: "Техногиганты угрожают переездом" } }
      ]
    },
    {
      id: "us_ai_regulation",
      speaker: "Сенатор",
      situation: "Алгоритмы техногигантов формируют мнение избирателей. Нужно вмешаться.",
      requires: { statuses: ["us_tech_monopoly"] },
      weight: 1,
      choices: [
        { label: "Заставить их внедрить ESG и квоты разнообразия", addStatuses: ["us_woke_capitalism"], effects: { sectors: { smi: 1 }, dovolstvo: 5 }, newsLines: { state: "Новая этика в корпорациях", liberal: "Справедливость восторжествовала" } },
        { label: "Оставить алгоритмы в покое, свобода слова превыше всего", effects: { sectors: { intel: -1 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "us_cancel_culture",
      speaker: "Звезда Голливуда",
      situation: "Меня отменили за твит десятилетней давности! Общество расколото.",
      requires: { statuses: ["us_woke_capitalism"] },
      weight: 1,
      choices: [
        { label: "Поддержать культуру отмены. Никакой терпимости к нетерпимым", addStatuses: ["us_polarization"], effects: { sectors: { smi: 1 }, dovolstvo: -10 }, newsLines: { state: "Звезда уволена за неподобающие слова", liberal: "Очищение рядов продолжается" } },
        { label: "Выступить с речью о свободе мнений", removeStatuses: ["us_woke_capitalism"], effects: { dovolstvo: 15, resources: { influence: -50 } }, newsLines: { state: "Свобода слова защищена", liberal: "Президент поддерживает мракобесие" } }
      ]
    },
    {
      id: "us_fed_crisis",
      speaker: "Глава ФРС",
      situation: "Доллар теряет позиции, инфляция растет. Печатный станок перегрелся.",
      requires: { statuses: ["fed_printer"] },
      weight: 1,
      choices: [
        { label: "Легализовать крипту и обложить ее налогами", addStatuses: ["us_crypto_legal"], effects: { sectors: { economy: 1 }, resources: { money: 1000 } }, newsLines: { state: "Мы стали цифровой гаванью", liberal: "Отказ от доллара неизбежен" } },
        { label: "Печатать еще больше! Раздадим вертолетные деньги", effects: { resources: { money: 3000 }, modifiers: { inflationDelta: 0.1 }, dovolstvo: 20 }, newsLines: { state: "Выплаты каждому американцу", liberal: "Гиперинфляция стучится в двери" } }
      ]
    },
    {
      id: "us_crypto_bros",
      speaker: "Криптобро",
      situation: "Мы перенесли майнинг фермы в Техас. Дайте налоговые льготы.",
      requires: { statuses: ["us_crypto_legal"] },
      weight: 1,
      choices: [
        { label: "Дать льготы. Америка будет крипто-столицей", effects: { resources: { money: 1500 }, sectors: { economy: 1, science: 1 } }, newsLines: { state: "Инвестиции рекой текут в Техас", liberal: "Фермы сжигают энергию целых городов" } },
        { label: "Никаких поблажек", effects: { resources: { money: 500 } } }
      ]
    },
    {
      id: "us_border_wall",
      speaker: "Губернатор Техаса",
      situation: "Караваны мигрантов штурмуют границу. Пора строить стену.",
      weight: 1,
      choices: [
        { label: "Начать строительство Великой Стены", effects: { resources: { money: -2000 }, dovolstvo: 15, sectors: { economy: 1 } }, newsLines: { state: "Граница на замке", liberal: "Возведение памятника ксенофобии" } },
        { label: "Стена не нужна, пусть приезжают", addStatuses: ["us_border_crisis"], effects: { resources: { influence: 100 }, dovolstvo: -15 }, newsLines: { state: "США остается страной иммигрантов", liberal: "Гуманитарный кризис на южной границе" } }
      ]
    },
    {
      id: "us_cartels",
      speaker: "Глава DEA",
      situation: "Из-за кризиса на границе картели обнаглели.",
      requires: { statuses: ["us_border_crisis"] },
      weight: 1,
      choices: [
        { label: "Отправить армию на границу", removeStatuses: ["us_border_crisis"], effects: { sectors: { army: 1 }, resources: { money: -1000 }, dovolstvo: 20 }, newsLines: { state: "Армия навела порядок на границе", liberal: "Милитаризация границы недопустима" } },
        { label: "Это проблема местных властей", effects: { sectors: { intel: -1 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "us_2nd_amendment",
      speaker: "Глава Оружейной Ассоциации",
      situation: "Опять предлагают запретить штурмовые винтовки. Мы спонсируем вашу партию, не забывайте.",
      weight: 1,
      choices: [
        { label: "Защитить Вторую Поправку. Оружие для всех", addStatuses: ["us_gun_culture"], effects: { resources: { money: 1000 }, sectors: { army: 1 } }, newsLines: { state: "Священное право на оружие защищено", liberal: "Спонсоры важнее жизней" } },
        { label: "Ввести строгие проверки биографии", effects: { dovolstvo: 10, resources: { influence: 50, money: -500 } }, newsLines: { state: "Новый закон о контроле оружия", liberal: "Шаг в правильном направлении" } }
      ]
    },
    {
      id: "us_school_safety",
      speaker: "Министр Образования",
      situation: "Оружейная культура привела к кризису. Предлагают вооружить учителей.",
      requires: { statuses: ["us_gun_culture"] },
      weight: 1,
      choices: [
        { label: "Отличная идея, закупить автоматы для школ", effects: { resources: { money: -500 }, sectors: { army: 1 }, dovolstvo: -10 }, newsLines: { state: "Учителя теперь смогут защитить детей", liberal: "Школы превращаются в военные базы" } },
        { label: "Лучше нанять психологов и поставить рамки", effects: { resources: { money: -800 }, dovolstvo: 15 }, newsLines: { state: "Инвестиции в безопасность школ", liberal: "Проблема оружия всё ещё не решена" } }
      ]
    },
    {
      id: "us_medicare",
      speaker: "Министр Здравоохранения",
      situation: "Цены на инсулин запредельные. Страховки не покрывают базовые нужды.",
      weight: 1,
      choices: [
        { label: "Пусть рынок сам всё регулирует", addStatuses: ["us_healthcare_crisis"], effects: { resources: { money: 1500 }, dovolstvo: -15 }, newsLines: { state: "Свободный рынок снизит цены", liberal: "Люди умирают без страховки" } },
        { label: "Продавить систему Medicare for All", effects: { resources: { money: -3000 }, dovolstvo: 30, sectors: { science: 1 } }, newsLines: { state: "Историческая реформа медицины", liberal: "Наконец-то здоровье не роскошь" } }
      ]
    },
    {
      id: "us_pharma_lobby",
      speaker: "Лоббист БигФармы",
      situation: "Медицинский кризис выгоден нам. Если вы не будете вмешиваться, мы озолотим вас.",
      requires: { statuses: ["us_healthcare_crisis"] },
      weight: 1,
      choices: [
        { label: "Взять взнос в предвыборный фонд", effects: { resources: { money: 2500 }, dovolstvo: -20 }, newsLines: { state: "Сотрудничество государства и бизнеса", liberal: "Власти куплены БигФармой" } },
        { label: "Начать антимонопольное расследование", removeStatuses: ["us_healthcare_crisis"], effects: { dovolstvo: 25, sectors: { intel: 1 } }, newsLines: { state: "Цены на лекарства будут снижены", liberal: "Конец диктатуры фармацевтов" } }
      ]
    },
    {
      id: "us_nasa_vs_musk",
      speaker: "Глава NASA",
      situation: "Частники обгоняют нас в космосе. Нужно либо удвоить бюджет, либо отдать им контракты.",
      weight: 1,
      choices: [
        { label: "Удвоить бюджет NASA", effects: { resources: { money: -1500 }, sectors: { science: 2 } }, newsLines: { state: "Новая эра освоения космоса", liberal: "Налоги улетают в трубу" } },
        { label: "Отдать лунную программу эксцентричному миллиардеру", addStatuses: ["us_mars_program"], effects: { resources: { influence: 100 }, sectors: { science: 1 } }, newsLines: { state: "Частный капитал покоряет звезды", liberal: "Космос приватизирован" } }
      ]
    },
    {
      id: "us_space_force",
      speaker: "Генерал Космических Войск",
      situation: "Мы летим на Марс, но нам нужна защита. Предлагаю создать Космические Войска.",
      requires: { statuses: ["us_mars_program"] },
      weight: 1,
      choices: [
        { label: "Создать Космические Войска", effects: { resources: { money: -1000 }, sectors: { army: 2, science: 1 } }, newsLines: { state: "США доминируют в космосе", liberal: "Милитаризация орбиты" } },
        { label: "Космос должен быть мирным", effects: { resources: { influence: 100 } } }
      ]
    },
    {
      id: "us_proxy_war",
      speaker: "Генерал Пентагона",
      situation: "Наши союзники в Европе просят оружие. Военно-промышленный комплекс требует контрактов.",
      requires: { statuses: ["military_industrial_complex"] },
      weight: 1,
      choices: [
        { label: "Послать оружие на миллиарды долларов", effects: { resources: { money: -2000, influence: 300 }, sectors: { army: 1, economy: 1 } }, newsLines: { state: "Америка поддерживает союзников", liberal: "Очередная бесконечная война" } },
        { label: "Сконцентрироваться на внутренних проблемах", effects: { dovolstvo: 15, resources: { influence: -150 } }, newsLines: { state: "Америка на первом месте", liberal: "Мы бросаем партнеров на произвол судьбы" } }
      ]
    },
    {
      id: "us_hollywood_strike",
      speaker: "Глава Профсоюза",
      situation: "Голливуд бастует. Сценаристы боятся, что их заменят нейросети.",
      requires: { statuses: ["hollywood_softpower"] },
      weight: 1,
      choices: [
        { label: "Запретить студиям использовать ИИ", effects: { dovolstvo: 15, sectors: { science: -1, smi: 1 } }, newsLines: { state: "Права трудящихся защищены", liberal: "Конец креативного кризиса" } },
        { label: "ИИ это прогресс. Пусть бастуют", effects: { sectors: { science: 2, smi: -1 }, dovolstvo: -15 }, newsLines: { state: "Технологии не остановить", liberal: "Сценаристы остаются на улице" } }
      ]
    }
  ],
  china: [
    {
      id: "cn_evergrande",
      speaker: "Министр Строительства",
      situation: "Крупнейший застройщик страны не может выплатить долги. Миллионы дольщиков в панике.",
      requires: { statuses: ["world_factory"] },
      weight: 1,
      choices: [
        { label: "Спасти компанию за госсчет", effects: { resources: { money: -3000 }, sectors: { economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Партия не бросает своих", liberal: "Олигархи спасены за наш счет" } },
        { label: "Пусть лопнет, мы накажем виновных", addStatuses: ["cn_real_estate_crisis"], effects: { sectors: { intel: 1 }, dovolstvo: -10 }, newsLines: { state: "Борьба с коррупцией в строительстве", liberal: "Экономика начинает сыпаться" } }
      ]
    },
    {
      id: "cn_ghost_cities",
      speaker: "Губернатор Провинции",
      situation: "Из-за кризиса недвижимости у нас целые города стоят пустые.",
      requires: { statuses: ["cn_real_estate_crisis"] },
      weight: 1,
      choices: [
        { label: "Заселить туда бедняков бесплатно", removeStatuses: ["cn_real_estate_crisis"], effects: { resources: { money: -1000 }, dovolstvo: 30 }, newsLines: { state: "Беспрецедентная социальная программа", liberal: "Коммунизм в действии" } },
        { label: "Взорвать эти дома, чтобы поднять цены", effects: { sectors: { economy: 1 }, dovolstvo: -15 }, newsLines: { state: "Регулирование рынка недвижимости", liberal: "Уничтожение ресурсов ради цифр ВВП" } }
      ]
    },
    {
      id: "cn_belt_road_init",
      speaker: "Министр Иностранных Дел",
      situation: "Нам нужны новые рынки сбыта. Предлагаю глобальный инфраструктурный проект.",
      weight: 1,
      choices: [
        { label: "Запустить 'Один пояс — один путь'", addStatuses: ["cn_belt_and_road"], effects: { resources: { money: -2000, influence: 200 } }, newsLines: { state: "Глобальное лидерство Китая", liberal: "Долговая ловушка для бедных стран" } },
        { label: "Сосредоточиться на внутреннем потреблении", effects: { sectors: { economy: 1 }, dovolstvo: 10 } }
      ]
    },
    {
      id: "cn_african_debt",
      speaker: "Дипломат в Африке",
      situation: "Африканская страна не может выплатить долг за построенный нами порт.",
      requires: { statuses: ["cn_belt_and_road"] },
      weight: 1,
      choices: [
        { label: "Забрать порт в аренду на 99 лет", effects: { resources: { influence: 150 }, sectors: { economy: 1 } }, newsLines: { state: "Расширение стратегических активов", liberal: "Неоколониализм 21 века" } },
        { label: "Простить долг ради дружбы", effects: { resources: { money: -1000, influence: 50 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "cn_gaming_ban",
      speaker: "Министр Образования",
      situation: "Дети слишком много играют в видеоигры. Это духовный опиум!",
      requires: { statuses: ["social_credit"] },
      weight: 1,
      choices: [
        { label: "Ограничить игры до 3 часов в неделю", addStatuses: ["cn_tech_crackdown"], effects: { sectors: { science: -1 }, dovolstvo: -20 }, newsLines: { state: "Молодежь будет больше учиться", liberal: "Уничтожение киберспорта" } },
        { label: "Создать патриотичные игры от государства", effects: { resources: { money: -500 }, sectors: { smi: 1 } } }
      ]
    },
    {
      id: "cn_jack_ma",
      speaker: "Комитет Безопасности",
      situation: "Глава крупнейшей IT-компании слишком много болтает и критикует регуляторов.",
      requires: { statuses: ["cn_tech_crackdown"] },
      weight: 1,
      choices: [
        { label: "Отправить его на перевоспитание (он исчезнет на 3 месяца)", effects: { sectors: { intel: 1, economy: -2 }, dovolstvo: 10 }, newsLines: { state: "Никто не выше закона", liberal: "Миллиардеры пропадают без следа" } },
        { label: "Штрафануть на 3 миллиарда долларов", effects: { resources: { money: 3000 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "cn_firewall_upgrade",
      speaker: "Глава Цензуры",
      situation: "Люди научились обходить Великий Файрвол с помощью новых VPN.",
      requires: { statuses: ["great_firewall"] },
      weight: 1,
      choices: [
        { label: "Инвестировать в нейросети-цензоры", effects: { resources: { money: -1000 }, sectors: { intel: 2, science: 1 }, dovolstvo: -15 }, newsLines: { state: "Цифровая стена стала надежнее", liberal: "Интернет превращается в интранет" } },
        { label: "Отключить зарубежный интернет вообще", effects: { sectors: { economy: -3, intel: 3 }, dovolstvo: -30 } }
      ]
    },
    {
      id: "cn_one_child_legacy",
      speaker: "Министр Демографии",
      situation: "Политика одного ребенка привела к старению нации. Молодежь не хочет заводить детей.",
      weight: 1,
      choices: [
        { label: "Признать демографический кризис", addStatuses: ["cn_demographic_crisis"], effects: { dovolstvo: -10 }, newsLines: { state: "Необходимы меры стимулирования", liberal: "Мы постареем раньше, чем разбогатеем" } },
        { label: "Запретить аборты", effects: { dovolstvo: -30, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "cn_three_children_policy",
      speaker: "ЦК Партии",
      situation: "Чтобы исправить яму, нужно заставить людей рожать троих.",
      requires: { statuses: ["cn_demographic_crisis"] },
      weight: 1,
      choices: [
        { label: "Выдавать бесплатные квартиры за третьего", removeStatuses: ["cn_demographic_crisis"], effects: { resources: { money: -3000 }, dovolstvo: 30 }, newsLines: { state: "Семья — основа государства", liberal: "Бюджет трещит по швам" } },
        { label: "Ввести налог на бездетность", effects: { resources: { money: 1000 }, dovolstvo: -25 } }
      ]
    },
    {
      id: "cn_aging_workforce",
      speaker: "Директор Фабрики",
      situation: "Рабочие стареют, а молодые хотят быть блогерами, а не стоять у станка.",
      requires: { statuses: ["cn_demographic_crisis"] },
      weight: 1,
      choices: [
        { label: "Массовая роботизация производства", effects: { resources: { money: -2000 }, sectors: { science: 2, economy: 1 } }, newsLines: { state: "Переход к Индустрии 4.0", liberal: "Рабочие боятся увольнений" } },
        { label: "Завезти мигрантов из Африки", effects: { sectors: { economy: 1 }, dovolstvo: -15 } }
      ]
    },
    {
      id: "cn_wolf_diplomacy",
      speaker: "Министр Пропаганды",
      situation: "Западные страны обвиняют нас во всех грехах. Как будем отвечать?",
      weight: 1,
      choices: [
        { label: "Отвечать агрессивно! Мы никому не позволим диктовать условия", addStatuses: ["cn_wolf_warrior"], effects: { resources: { influence: 50 }, sectors: { smi: 1 }, dovolstvo: 15 }, newsLines: { state: "Наш голос звучит громко", liberal: "Дипломаты ведут себя как хулиганы" } },
        { label: "Улыбаться и махать. Деньги любят тишину", effects: { sectors: { economy: 1 }, resources: { influence: -50 } } }
      ]
    },
    {
      id: "cn_taiwan_blockade",
      speaker: "Генерал НОАК",
      situation: "Американский политик прилетел на Мятежный Остров. Это оскорбление!",
      requires: { statuses: ["cn_wolf_warrior"] },
      weight: 1,
      choices: [
        { label: "Начать военные учения и блокаду", addStatuses: ["cn_taiwan_tension"], effects: { resources: { money: -1000 }, sectors: { army: 2 }, dovolstvo: 20 }, newsLines: { state: "Армия демонстрирует мощь", liberal: "Мир на пороге Третьей мировой" } },
        { label: "Выразить 'решительный протест'", effects: { resources: { influence: -100 }, dovolstvo: -20 } }
      ]
    },
    {
      id: "cn_chip_war",
      speaker: "Глава Минтеха",
      situation: "Из-за кризиса нам перекрыли доступ к передовым микрочипам.",
      requires: { statuses: ["cn_taiwan_tension"] },
      weight: 1,
      choices: [
        { label: "Влить триллионы в собственное производство", effects: { resources: { money: -3000 }, sectors: { science: 2 } }, newsLines: { state: "Полная технологическая независимость близка", liberal: "Деньги уходят в коррупционные схемы" } },
        { label: "Покупать чипы через серые схемы", effects: { resources: { money: -1000 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "cn_new_virus",
      speaker: "Министр Здравоохранения",
      situation: "В Ухане снова кто-то съел летучую мышь. Новый вирус распространяется.",
      weight: 1,
      choices: [
        { label: "Закрыть всех по домам! Заварить двери!", addStatuses: ["cn_zero_covid"], effects: { sectors: { economy: -2, science: 1 }, dovolstvo: -15 }, newsLines: { state: "Жизнь людей важнее экономики", liberal: "Тотальный концлагерь под предлогом здоровья" } },
        { label: "Это просто грипп, не останавливаем фабрики", effects: { sectors: { economy: 1 }, dovolstvo: -20, modifiers: { populationMult: -0.05 } } }
      ]
    },
    {
      id: "cn_white_paper_protests",
      speaker: "Глава Полиции",
      situation: "Люди устали сидеть взаперти 3 года. Они вышли на улицы с белыми листами бумаги.",
      requires: { statuses: ["cn_zero_covid"] },
      weight: 1,
      choices: [
        { label: "Снять все ограничения немедленно", removeStatuses: ["cn_zero_covid"], effects: { sectors: { economy: 2 }, dovolstvo: 30 }, newsLines: { state: "Партия слышит народ", liberal: "Протесты сработали" } },
        { label: "Подавить бунт! Танки на улицы", effects: { sectors: { army: 1, intel: 1 }, dovolstvo: -40 } }
      ]
    }
  ],
  dprk: [
    {
      id: "kp_bad_harvest",
      speaker: "Министр Сельского Хозяйства",
      situation: "Из-за засухи урожай погиб. Нам нечем кормить народ.",
      requires: { statuses: ["chuchhe"] },
      weight: 1,
      choices: [
        { label: "Ввести строгий рацион: 200 грамм риса на человека", addStatuses: ["kp_famine"], effects: { resources: { food: 500 }, dovolstvo: -30 }, newsLines: { state: "Трудный поход закаляет наш дух", liberal: "Люди падают в обморок от истощения" } },
        { label: "Умолять ООН о гуманитарной помощи", effects: { resources: { food: 2000, influence: -100 }, dovolstvo: 10 }, newsLines: { state: "Враги признали наше величие и платят дань", liberal: "Без подачек Запада они бы вымерли" } }
      ]
    },
    {
      id: "kp_black_market",
      speaker: "Начальник Службы Безопасности",
      situation: "Из-за голода на границе с Китаем расцвел черный рынок (Чанмадан).",
      requires: { statuses: ["kp_famine"] },
      weight: 1,
      choices: [
        { label: "Закрыть глаза. Пусть люди выживают как могут", addStatuses: ["kp_smuggling"], removeStatuses: ["kp_famine"], effects: { sectors: { economy: 1 }, dovolstvo: 20 }, newsLines: { state: "Стихийные рынки демонстрируют инициативу масс", liberal: "Капитализм просачивается сквозь щели" } },
        { label: "Расстрелять спекулянтов на площади", effects: { sectors: { intel: 1 }, dovolstvo: -20 }, newsLines: { state: "Беспощадная борьба с предателями социализма", liberal: "Кровавый террор продолжается" } }
      ]
    },
    {
      id: "kp_smuggler_crackdown",
      speaker: "Генерал-Инспектор",
      situation: "Контрабандисты обнаглели. Они завозят южнокорейские сериалы и джинсы!",
      requires: { statuses: ["kp_smuggling"] },
      weight: 1,
      choices: [
        { label: "Очистить границу! Жесточайшие репрессии!", removeStatuses: ["kp_smuggling"], effects: { sectors: { intel: 2, economy: -1 }, dovolstvo: -30 }, newsLines: { state: "Граница на замке от тлетворного влияния", liberal: "Единственная отдушина закрыта" } },
        { label: "Брать с них дань в твердой валюте", effects: { resources: { money: 1000 }, sectors: { economy: 1 } }, newsLines: { state: "Партия контролирует неофициальные доходы", liberal: "Коррупция пронизала всю вертикаль" } }
      ]
    },
    {
      id: "kp_new_statue",
      speaker: "Главный Архитектор",
      situation: "Нам нужен новый 100-метровый бронзовый памятник Великому Вождю.",
      requires: { statuses: ["supreme_leader"] },
      weight: 1,
      choices: [
        { label: "Построить! И заставить всех поклоняться!", addStatuses: ["kp_personality_cult_max"], effects: { resources: { money: -1500 }, sectors: { smi: 2 }, dovolstvo: -10 }, newsLines: { state: "Солнце Нации сияет в бронзе", liberal: "Миллионы долларов на статую в нищей стране" } },
        { label: "У нас нет на это бронзы", effects: { resources: { influence: -50 }, dovolstvo: 5 } }
      ]
    },
    {
      id: "kp_tears_of_joy",
      speaker: "Глава Пропаганды",
      situation: "Вождь едет по столице. Толпа должна плакать от счастья.",
      requires: { statuses: ["kp_personality_cult_max"] },
      weight: 1,
      choices: [
        { label: "Кто не плачет достаточно искренне — в лагеря!", effects: { sectors: { intel: 1 }, dovolstvo: -20 }, newsLines: { state: "Слезы радости затопили улицы Пхеньяна", liberal: "Оскароносная игра под дулом автомата" } },
        { label: "Раздать всем по луковице перед парадом", effects: { resources: { money: -100 }, dovolstvo: 5 } }
      ]
    },
    {
      id: "kp_usb_drives",
      speaker: "Офицер Полиции",
      situation: "Мы перехватили партию USB-флешек с южнокорейской музыкой.",
      requires: { statuses: ["kp_smuggling"] },
      weight: 1,
      choices: [
        { label: "Проигнорировать. Молодежи нужно развлекаться", addStatuses: ["kp_kpop_influence"], effects: { sectors: { smi: -1 }, dovolstvo: 15 }, newsLines: { state: "Послабления в культурной сфере", liberal: "Режим теряет хватку" } },
        { label: "Устроить показательные суды над слушателями", effects: { sectors: { intel: 2 }, dovolstvo: -25 }, newsLines: { state: "Идеологическая зараза остановлена", liberal: "Смертная казнь за прослушивание песни" } }
      ]
    },
    {
      id: "kp_public_execution",
      speaker: "Глава Суда",
      situation: "Западная культура слишком глубоко проникла в общество. Нужен пример.",
      requires: { statuses: ["kp_kpop_influence"] },
      weight: 1,
      choices: [
        { label: "Публично расстрелять распространителей флешек", removeStatuses: ["kp_kpop_influence"], effects: { sectors: { intel: 1 }, dovolstvo: -30, resources: { influence: -100 } }, newsLines: { state: "Враги народа уничтожены зенитными пулеметами", liberal: "Средневековое варварство в 21 веке" } },
        { label: "Отправить их в шахты на 15 лет", effects: { resources: { money: 500 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "kp_missile_parade",
      speaker: "Генерал Армии",
      situation: "Мы собрали новую межконтинентальную ракету. Нужно показать её миру.",
      requires: { statuses: ["red_button"] },
      weight: 1,
      choices: [
        { label: "Провести подземные ядерные испытания!", addStatuses: ["kp_nuke_testing"], effects: { resources: { money: -2000 }, sectors: { army: 2 }, dovolstvo: 15 }, newsLines: { state: "Земля содрогнулась от нашей мощи", liberal: "Ядерный шантаж продолжается" } },
        { label: "Просто провезти муляж на параде", effects: { resources: { influence: 50 }, dovolstvo: 5 } }
      ]
    },
    {
      id: "kp_un_sanctions",
      speaker: "Дипломат в ООН",
      situation: "В ответ на наши испытания Совбез ООН ввел тотальное эмбарго на нефть.",
      requires: { statuses: ["kp_nuke_testing"] },
      weight: 1,
      choices: [
        { label: "Перевести весь транспорт на дрова", effects: { sectors: { economy: -2, science: -1 }, dovolstvo: -20 }, newsLines: { state: "Грузовики на древесном газе спасают логистику", liberal: "Возврат в 19 век" } },
        { label: "Попросить Китай нарушить санкции", effects: { resources: { influence: -150, money: 1000 }, sectors: { economy: 1 } } }
      ]
    },
    {
      id: "kp_dmz_speakers",
      speaker: "Командир Погранзаставы",
      situation: "Южане поставили огромные колонки на границе и транслируют пропаганду.",
      requires: { statuses: ["kp_nuke_testing"] },
      weight: 1,
      choices: [
        { label: "Привести артиллерию в боевую готовность", addStatuses: ["kp_border_skirmish"], effects: { sectors: { army: 1 }, dovolstvo: 10 }, newsLines: { state: "Мы готовы стереть Сеул с лица земли", liberal: "Эскалация на полуострове" } },
        { label: "Поставить свои колонки и включить патриотичные марши", effects: { sectors: { smi: 1 }, resources: { money: -200 } } }
      ]
    },
    {
      id: "kp_artillery_fire",
      speaker: "Министр Обороны",
      situation: "Стычки на границе переросли в перестрелку. Южане обстреляли наш патруль.",
      requires: { statuses: ["kp_border_skirmish"] },
      weight: 1,
      choices: [
        { label: "Ударить артиллерией по южному острову Енпхендо!", effects: { resources: { influence: 200 }, sectors: { army: 2, economy: -1 }, dovolstvo: 30 }, newsLines: { state: "Адекватный ответ на провокации", liberal: "Они обстреляли мирных жителей" } },
        { label: "Отступить и подать жалобу", removeStatuses: ["kp_border_skirmish"], effects: { sectors: { army: -1 }, dovolstvo: -15 }, newsLines: { state: "Мы проявили дипломатическую сдержанность", liberal: "Режим испугался настоящей войны" } }
      ]
    },
    {
      id: "kp_cyber_unit",
      speaker: "Министр Информатики",
      situation: "Мы не можем победить США в прямой войне, но мы можем разрушить их сети.",
      weight: 1,
      choices: [
        { label: "Создать элитное подразделение хакеров (Отряд 121)", addStatuses: ["kp_hacker_army"], effects: { resources: { money: -1000 }, sectors: { intel: 2, science: 1 } }, newsLines: { state: "Невидимый фронт нашей революции", liberal: "Создание государственной ОПГ" } },
        { label: "Интернет нам не нужен, это зло", effects: { sectors: { intel: -1, science: -1 } } }
      ]
    },
    {
      id: "kp_crypto_heist",
      speaker: "Командир Отряда 121",
      situation: "Мы нашли уязвимость в западной криптобирже. Можно украсть полмиллиарда.",
      requires: { statuses: ["kp_hacker_army"] },
      weight: 1,
      choices: [
        { label: "Взламывайте! Деньги пойдут на ракетную программу", effects: { resources: { money: 5000 }, sectors: { army: 1, economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Наши гении добывают валюту", liberal: "Государство-хакер спонсирует терроризм" } },
        { label: "Это слишком рискованно", effects: { resources: { influence: 50 } } }
      ]
    },
    {
      id: "kp_sony_hack",
      speaker: "Глава Пропаганды",
      situation: "В Голливуде сняли комедию про убийство нашего Вождя! Это возмутительно!",
      requires: { statuses: ["kp_hacker_army"] },
      weight: 1,
      choices: [
        { label: "Уничтожить их сервера и слить фильмы в сеть!", effects: { resources: { influence: 300 }, sectors: { intel: 1, smi: 1 }, dovolstvo: 25 }, newsLines: { state: "Справедливое возмездие клеветникам", liberal: "Атака на свободу слова" } },
        { label: "Запретить этот фильм к просмотру у нас", effects: { dovolstvo: -5 } }
      ]
    },
    {
      id: "kp_train_ride",
      speaker: "Служба Протокола",
      situation: "Вождь собирается на встречу с союзником. На самолете лететь опасно.",
      weight: 1,
      choices: [
        { label: "Снарядить бронепоезд! Ехать неделю со скоростью 40 км/ч", effects: { resources: { money: -500, influence: 150 }, sectors: { army: 1 }, dovolstvo: 15 }, newsLines: { state: "Исторический визит на высшем уровне", liberal: "Паранойя Вождя парализует ЖД пути" } },
        { label: "Послать делегатов по Зуму", effects: { sectors: { intel: -1 }, dovolstvo: -10 } }
      ]
    }
  ],
  germany: [
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
  ],
  india: [
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
  ],
  japan: [
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
  ],
  israel: [
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
  ],
  armenia: [
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
  ],
};


// REBALANCE
const buffAmounts = { china: 13, usa: 3, armenia: 2 };
for (const country of ['china', 'usa', 'armenia']) {
    if (decks[country]) {
        for (const card of decks[country]) {
            for (const choice of card.choices) {
                if (!choice.effects) choice.effects = {  uk: [
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
  ],
};
                choice.effects.dovolstvo = (choice.effects.dovolstvo || 0) + buffAmounts[country];
            }
        }
    }
}

let patchData = {};
try {
  patchData = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/news_lines_patch.json'), 'utf8'));
} catch(e) {}
for (const countryId in decks) {
  for (const card of decks[countryId]) {
    if (card.id==='uk_nhs_crisis') console.log('FOUND UK NHS CRISIS!'); if (patchData[card.id]) {
      card.choices.forEach((c, idx) => {
        if (patchData[card.id][idx]) {
          c.newsLines = patchData[card.id][idx];
        }
      });
    }
  }
}

for (const [countryId, cards] of Object.entries(decks)) {
  const deck = {
    country: countryId,
    cards: cards
  };
  fs.writeFileSync(path.join(advisorsDir, countryId + '.json'), JSON.stringify(deck, null, 2));
}

console.log('Created 10 unique decks.');
