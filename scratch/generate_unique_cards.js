const fs = require('fs');
const path = require('path');

const advisorsDir = path.join(__dirname, '..', 'content', 'advisors');

const decks = {
  russia: [
    {
      id: "ru_import",
      speaker: "Министр Промышленности",
      situation: "Запад перестал поставлять нам запчасти для самолетов. Что будем делать?",
      requires: { statuses: ["smekalochka"] },
      weight: 1,
      choices: [
        {
          label: "Применим Смекалочку! Пересоберем из стиральных машин",
          addStatuses: ["ru_washing_planes"],
          effects: { dovolstvo: 5 },
          newsLines: { state: "Отечественный авиапром совершил прорыв", liberal: "Пилоты молятся перед каждым взлетом" }
        },
        {
          label: "Купим втридорога через соседей",
          effects: { resources: { money: -500 }, sectors: { economy: 1 } },
          newsLines: { state: "Серый импорт работает как часы", liberal: "Мы переплачиваем за свои же ошибки" }
        }
      ]
    },
    {
      id: "ru_washing_shortage",
      speaker: "Глава РосПотребНадзора",
      situation: "Из-за пересборки самолетов в стране кончились стиральные машины. Народ жалуется.",
      requires: { statuses: ["ru_washing_planes"] },
      weight: 1,
      choices: [
        {
          label: "Пусть стирают на речке! Это наши скрепы",
          effects: { dovolstvo: -15, sectors: { economy: -1 } },
          newsLines: { state: "Возвращение к корням: польза стирки в проруби", liberal: "Мы официально в каменном веке" }
        },
        {
          label: "Закупить партию «стиралок» в Китае",
          effects: { resources: { money: -300, influence: -50 }, dovolstvo: 10 },
          newsLines: { state: "Дружба народов решает бытовые проблемы", liberal: "Зависимость от Китая растет" }
        }
      ]
    },
    {
      id: "ru_rutube",
      speaker: "Министр Связи",
      situation: "Иностранный видеохостинг работает слишком быстро и показывает плохие видео. Что делаем?",
      weight: 1,
      choices: [
        {
          label: "Замедлить до скорости диалапа! Развиваем свой аналог",
          addStatuses: ["ru_slow_internet"],
          effects: { sectors: { smi: 2, science: -1 }, dovolstvo: -10 },
          newsLines: { state: "Отечественные платформы бьют рекорды посещаемости", liberal: "YouTube грузится в 144p. Мы отрезаны от мира" }
        },
        {
          label: "Оставить как есть, пусть смотрят котиков",
          effects: { sectors: { intel: -1 }, dovolstvo: 5 },
          newsLines: { state: "Государство не лезет в интернет", liberal: "Свобода слова пока еще жива" }
        }
      ]
    },
    {
      id: "ru_cyber_cossacks",
      speaker: "Атаман Кибер-Войска",
      situation: "Интернет замедлили, но люди используют VPN. Мы готовы патрулировать сеть с цифровыми нагайками.",
      requires: { statuses: ["ru_slow_internet"] },
      weight: 1,
      choices: [
        {
          label: "Выделить бюджет на кибер-казаков!",
          effects: { resources: { money: -200 }, sectors: { intel: 1, smi: 1 }, dovolstvo: -10 },
          newsLines: { state: "В сети стало безопаснее и чище", liberal: "Казаки бьют роутеры нагайками" }
        },
        {
          label: "Это уже перебор, обойдемся без казаков",
          effects: { resources: { influence: -20 } }
        }
      ]
    },
    {
      id: "ru_bloggers",
      speaker: "Глава Налоговой",
      situation: "Блогеры и продавцы марафонов желаний зарабатывают миллиарды и не платят налоги.",
      weight: 1,
      choices: [
        {
          label: "Посадить парочку для острастки, остальных заставить платить",
          effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: 5 },
          newsLines: { state: "Конец эпохи инфоцыган", liberal: "Давление на малый бизнес и лидеров мнений" }
        },
        {
          label: "Не трогать их, они же смешные",
          effects: { dovolstvo: 10, sectors: { economy: -1 } }
        }
      ]
    },
    {
      id: "ru_gas",
      speaker: "Глава Нефтегаза",
      situation: "Зима близко. Европа мерзнет, а у нас газа завались.",
      requires: { statuses: ["gas_needle"] },
      weight: 1,
      choices: [
        {
          label: "Перекрыть вентиль! Пусть померзнут",
          effects: { resources: { influence: 100 }, dovolstvo: 10, sectors: { economy: -1 } },
          newsLines: { state: "Европа готовится топить дровами", liberal: "Газпром теряет ключевой рынок" }
        },
        {
          label: "Продать, но только за рубли",
          effects: { resources: { money: 500, influence: 50 }, sectors: { economy: 1 } },
          newsLines: { state: "Рубль укрепляется на мировой арене", liberal: "Хитрая схема обхода санкций" }
        }
      ]
    },
    {
      id: "ru_eastern_pipeline",
      speaker: "Главный Строитель",
      situation: "Европа не берет газ. Нужно срочно строить «Силу Сибири 3» на Восток, но это очень дорого.",
      requires: { statuses: ["gas_needle"] },
      weight: 1,
      choices: [
        {
          label: "Начать мега-стройку! Будущее за Востоком",
          addStatuses: ["ru_eastern_partner"],
          effects: { resources: { money: -1500 } },
          newsLines: { state: "Грандиозная стройка века стартовала", liberal: "Мы продаем ресурсы Китаю за бесценок" }
        },
        {
          label: "Денег нет, пусть газ остается в земле",
          effects: { sectors: { economy: -2 }, dovolstvo: -10 }
        }
      ]
    },
    {
      id: "ru_digital_ruble",
      speaker: "Глава Центробанка",
      situation: "Запуск цифрового рубля! Но пенсионеры боятся, что их чипируют.",
      weight: 1,
      choices: [
        {
          label: "Внедрить принудительно (плюс к экономике, минус довольство)",
          effects: { sectors: { economy: 2, intel: 1 }, dovolstvo: -20 },
          newsLines: { state: "Финансовая система стала прозрачной", liberal: "Цифровой концлагерь построен" }
        },
        {
          label: "Запустить добровольно и провести рекламу",
          effects: { resources: { money: -300 }, sectors: { economy: 1 }, dovolstvo: 5 },
          newsLines: { state: "Успешный запуск удобной валюты", liberal: "Никто не хочет пользоваться цифровым рублем" }
        }
      ]
    },
    {
      id: "ru_avtovaz",
      speaker: "Директор АвтоВАЗа",
      situation: "Завод в кризисе. Мы можем выпустить 'Ладу Киберпанк' без АБС и подушек безопасности.",
      weight: 1,
      choices: [
        {
          label: "Выпускайте! Главное, чтобы ехала",
          effects: { resources: { money: 500 }, sectors: { economy: 1, science: -1 }, dovolstvo: -10 },
          newsLines: { state: "Отечественный автопром возрождается", liberal: "Машины без безопасности по цене крыла самолета" }
        },
        {
          label: "Отдайте конвейер китайцам для сборки их машин",
          addStatuses: ["ru_eastern_partner"],
          effects: { resources: { money: 200 }, sectors: { economy: 2 } },
          newsLines: { state: "Новое дыхание завода под руководством партнеров", liberal: "АвтоВАЗ окончательно стал филиалом Китая" }
        }
      ]
    },
    {
      id: "ru_vodka_monopoly",
      speaker: "Министр Финансов",
      situation: "Бюджету нужны деньги. Предлагаю ввести жесткую госмонополию на алкоголь и поднять цены.",
      weight: 1,
      choices: [
        {
          label: "Утвердить! Пьянству бой, бюджету деньги",
          effects: { resources: { money: 1000 }, sectors: { economy: 1 }, dovolstvo: -20 },
          newsLines: { state: "Забота о здоровье нации пополнит казну", liberal: "Люди переходят на суррогат" }
        },
        {
          label: "Народ не простит. Оставим как есть",
          effects: { dovolstvo: 10, resources: { money: -200 } }
        }
      ]
    },
    {
      id: "ru_dacha",
      speaker: "Председатель Союза Садоводов",
      situation: "Майские праздники на носу. Народ массово выезжает на шашлыки и посадку картошки.",
      requires: { statuses: ["dacha_culture"] },
      weight: 1,
      choices: [
        {
          label: "Выдать всем по 6 соток и лопаты!",
          addStatuses: ["ru_dacha_boom"],
          effects: { resources: { food: 500 }, dovolstvo: 15 },
          newsLines: { state: "Агропромышленный бум на дачах", liberal: "Люди вынуждены сами сажать еду от бедности" }
        },
        {
          label: "Обложить налогами теплицы и бани",
          effects: { resources: { money: 300 }, dovolstvo: -25 },
          newsLines: { state: "Очередная инициатива по легализации построек", liberal: "Государство добралось до дачных туалетов" }
        }
      ]
    },
    {
      id: "ru_harvest_battle",
      speaker: "Министр Сельского Хозяйства",
      situation: "Урожай гниет на полях, рабочих рук не хватает. Дачный бум не спас ситуацию.",
      requires: { statuses: ["ru_dacha_boom"], conditions: ["golod"] },
      weight: 1,
      choices: [
        {
          label: "Отправить студентов и бюджетников на картошку!",
          effects: { resources: { food: 1000 }, sectors: { science: -1, economy: -1 }, dovolstvo: -15 },
          newsLines: { state: "Всенародная битва за урожай увенчалась успехом", liberal: "Принудительный труд возвращается" }
        },
        {
          label: "Закупить зерно за границей",
          effects: { resources: { money: -800, food: 1500 } },
          newsLines: { state: "Запасы продовольствия обеспечены", liberal: "Великая аграрная держава не может прокормить себя" }
        }
      ]
    },
    {
      id: "ru_demography",
      speaker: "Министр Демографии",
      situation: "Рождаемость падает. Предлагают давать гектар земли в Сибири за рождение третьего ребенка.",
      weight: 1,
      choices: [
        {
          label: "Утвердить 'Сибирский гектар'!",
          effects: { resources: { money: -400 }, sectors: { economy: 1 }, dovolstvo: 10 },
          newsLines: { state: "Беспрецедентная поддержка многодетных семей", liberal: "Дают кусок тайги без дорог и света" }
        },
        {
          label: "Просто запретить идеологию 'чайлдфри'",
          effects: { sectors: { smi: 1 }, dovolstvo: -10 },
          newsLines: { state: "Защита традиционных ценностей в законе", liberal: "Очередной запрет вместо реальной помощи" }
        }
      ]
    },
    {
      id: "ru_shaman",
      speaker: "Министр Культуры",
      situation: "Народу нужен патриотический подъем. Популярный певец готов выпустить новый хит 'Я — Гражданин'.",
      weight: 1,
      choices: [
        {
          label: "Включить во всех утюгах! Спонсируем тур по стране",
          effects: { resources: { money: -300 }, sectors: { army: 1, smi: 1 }, dovolstvo: 15 },
          newsLines: { state: "Новый хит бьет рекорды прослушиваний", liberal: "Кринж года: бюджетные миллионы на пропаганду" }
        },
        {
          label: "Музыка вне политики. Отказать в бюджете",
          effects: { resources: { influence: -20 }, dovolstvo: -5 }
        }
      ]
    },
    {
      id: "ru_bear_cavalry",
      speaker: "Безумный Генерал",
      situation: "Мой фюре... то есть, господин Президент! Мы можем выпустить на поле боя Боевых Медведей!",
      requires: { conditions: ["siloviki_dominate"] },
      weight: 1,
      choices: [
        {
          label: "Это безумие. Делайте! (Секретное оружие)",
          effects: { resources: { money: -2000, influence: 500 }, sectors: { army: 3, science: 1 } },
          newsLines: { state: "Наше новое оружие повергло мир в шок", liberal: "Они там окончательно сошли с ума" }
        },
        {
          label: "Отправьте генерала в отставку",
          effects: { sectors: { army: -1 }, dovolstvo: 5 }
        }
      ]
    },
    {
      id: "ru_chinese_cars",
      speaker: "Министр Транспорта",
      situation: "После прихода восточных партнеров на рынке остались только их машины. У них отваливаются рули на морозе.",
      requires: { statuses: ["ru_eastern_partner"] },
      weight: 1,
      choices: [
        {
          label: "Запретить критику! Ввести соц. рейтинг для водителей",
          addStatuses: ["ru_social_credit_lite"],
          effects: { sectors: { smi: -1 }, dovolstvo: -15 },
          newsLines: { state: "Внедрена передовая система оценки вождения", liberal: "Цифровой ГУЛАГ за рулем" }
        },
        {
          label: "Субсидировать покупку теплого белья для водителей",
          effects: { resources: { money: -500 }, dovolstvo: 5 },
          newsLines: { state: "Забота о комфорте автолюбителей", liberal: "Машины из фольги утепляют за счет бюджета" }
        }
      ]
    },
    {
      id: "ru_social_rating_event",
      speaker: "Глава Цифровизации",
      situation: "Система соц. рейтинга водителей работает! Китайские партнеры предлагают расширить ее на всех граждан.",
      requires: { statuses: ["ru_social_credit_lite"] },
      weight: 1,
      choices: [
        {
          label: "Отличная идея! Каждому по миске риса за хорошее поведение",
          effects: { sectors: { intel: 2, economy: 1 }, dovolstvo: -30 },
          newsLines: { state: "Порядок и дисциплина - залог процветания", liberal: "Мы стали провинцией Китая" }
        },
        {
          label: "Наш народ такого не потерпит, остановитесь",
          effects: { resources: { influence: -50 }, dovolstvo: 10 },
          newsLines: { state: "Правительство прислушалось к гражданам", liberal: "Власти испугались бунта" }
        }
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
    {
      id: "de_coal_plants",
      speaker: "Министр Экологии",
      situation: "Партия Зеленых требует немедленно закрыть все угольные электростанции ради спасения климата.",
      requires: { statuses: ["eco_bureaucracy"] },
      weight: 1,
      choices: [
        { label: "Закрыть заводы! Перейдем на ветер и солнце", addStatuses: ["de_green_energy"], effects: { resources: { influence: 150 }, sectors: { economy: -1, science: 1 }, dovolstvo: 10 }, newsLines: { state: "Германия — лидер зеленого перехода!", liberal: "Историческое решение для планеты" } },
        { label: "Нам нужна дешевая энергия для индустрии", effects: { sectors: { economy: 1 }, dovolstvo: -15 }, newsLines: { state: "Прагматичный подход к энергетике", liberal: "Правительство предает будущие поколения" } }
      ]
    },
    {
      id: "de_nordstream_cut",
      speaker: "Министр Экономики",
      situation: "Поставки дешевого газа с Востока прекращены. Нам грозит остановка заводов.",
      requires: { statuses: ["de_green_energy"] },
      weight: 1,
      choices: [
        { label: "Закупать дорогой СПГ, заводы не должны встать", addStatuses: ["de_energy_dependence"], effects: { resources: { money: -2000 }, sectors: { economy: -1 }, dovolstvo: -10 }, newsLines: { state: "Мы обеспечили энергонезависимость", liberal: "Цены на энергоносители взлетели в космос" } },
        { label: "Вернуть в строй угольные станции (отмена Зеленого курса)", removeStatuses: ["de_green_energy"], effects: { sectors: { economy: 1, science: -1 }, dovolstvo: -20 }, newsLines: { state: "Вынужденное возвращение к углю", liberal: "Зеленая мечта разбилась о реальность" } }
      ]
    },
    {
      id: "de_winter_blackouts",
      speaker: "Канцлер",
      situation: "Зима близко. Газа мало, цены космические. Возможны веерные отключения света.",
      requires: { statuses: ["de_energy_dependence"] },
      weight: 1,
      choices: [
        { label: "Влить миллиарды евро субсидий в компенсации гражданам", removeStatuses: ["de_energy_dependence"], effects: { resources: { money: -3000 }, dovolstvo: 25 }, newsLines: { state: "Правительство защищает народ от холода", liberal: "Бюджетный дефицит бьет рекорды" } },
        { label: "Призвать немцев мыться холодной водой и надевать свитера", effects: { dovolstvo: -40 }, newsLines: { state: "Экономия — гражданский долг каждого", liberal: "Люди замерзают в собственных квартирах" } }
      ]
    },
    {
      id: "de_euro_bailout",
      speaker: "Еврокомиссар",
      situation: "Южные страны Евросоюза снова на грани дефолта. Они просят 'Локомотив' скинуться.",
      requires: { statuses: ["eu_locomotive"] },
      weight: 1,
      choices: [
        { label: "Мы обязаны спасти еврозону! Выделить кредиты", effects: { resources: { money: -1500, influence: 300 }, dovolstvo: -15 }, newsLines: { state: "Германия — надежный лидер Европы", liberal: "Немецкие налогоплательщики снова платят за чужие долги" } },
        { label: "Пусть объявляют дефолт! Больше никаких подачек", effects: { resources: { money: 1000, influence: -250 }, sectors: { economy: -1 }, dovolstvo: 20 }, newsLines: { state: "Справедливость восстановлена", liberal: "Угроза распада Европейского Союза" } }
      ]
    },
    {
      id: "de_chinese_evs",
      speaker: "Глава Союза Автопроизводителей",
      situation: "Китайские электромобили захватывают наш рынок. Они дешевле и технологичнее.",
      weight: 1,
      choices: [
        { label: "Защитить наш автопром пошлинами в 40%!", addStatuses: ["de_auto_crisis"], effects: { resources: { influence: -100 }, sectors: { economy: -1 }, dovolstvo: 10 }, newsLines: { state: "Защита отечественного производителя", liberal: "Торговая война с Пекином началась" } },
        { label: "Пусть конкурируют честно! Это свободный рынок", effects: { sectors: { economy: 1, science: -1 }, dovolstvo: -10 }, newsLines: { state: "Свободная торговля превыше всего", liberal: "Немецкий автопром на грани коллапса" } }
      ]
    },
    {
      id: "de_vw_strike",
      speaker: "Лидер Профсоюза IG Metall",
      situation: "Из-за кризиса автопрома заводы сокращают рабочую неделю. Рабочие бастуют!",
      requires: { statuses: ["de_auto_crisis"] },
      weight: 1,
      choices: [
        { label: "Субсидировать зарплаты из госбюджета", removeStatuses: ["de_auto_crisis"], effects: { resources: { money: -2000 }, sectors: { economy: 1 }, dovolstvo: 20 }, newsLines: { state: "Мир на заводах восстановлен", liberal: "Государство спонсирует неэффективность" } },
        { label: "Жесткая реструктуризация. Кто-то должен быть уволен", effects: { sectors: { intel: 1 }, dovolstvo: -35 }, newsLines: { state: "Болезненные, но необходимые реформы", liberal: "Сотни тысяч выброшены на улицу" } }
      ]
    },
    {
      id: "de_syrian_refugees",
      speaker: "Канцлер",
      situation: "Война на Ближнем Востоке. Миллион беженцев идут пешком через Европу. Мы справимся?",
      weight: 1,
      choices: [
        { label: "Wir schaffen das! (Мы справимся!) Открыть границы", addStatuses: ["de_gastarbeiter"], effects: { resources: { money: -1500, influence: 200 }, dovolstvo: -20 }, newsLines: { state: "Германия показывает гуманизм всему миру", liberal: "Социальная система не выдержит нагрузки" } },
        { label: "Закрыть границы. Отправить полицию", effects: { sectors: { intel: 1 }, resources: { influence: -150 }, dovolstvo: 15 }, newsLines: { state: "Национальная безопасность на первом месте", liberal: "Темные времена возвращаются в Европу" } }
      ]
    },
    {
      id: "de_right_wing_march",
      speaker: "Глава Полиции",
      situation: "На фоне миграционного кризиса правые радикалы (AfD) собирают огромные митинги.",
      requires: { statuses: ["de_gastarbeiter"] },
      weight: 1,
      choices: [
        { label: "Они имеют право на протест (Свобода слова)", addStatuses: ["de_afd_rise"], effects: { sectors: { smi: -1 }, dovolstvo: -10 }, newsLines: { state: "Демократические свободы соблюдаются", liberal: "Крайне правые рвутся к власти" } },
        { label: "Разогнать водометами как экстремистов!", effects: { sectors: { intel: 2 }, dovolstvo: -25 }, newsLines: { state: "Государство защищает конституционный строй", liberal: "Полицейское насилие на улицах городов" } }
      ]
    },
    {
      id: "de_ban_afd",
      speaker: "Судья Конституционного Суда",
      situation: "Правые популисты стали второй партией в стране. Звучат призывы запретить их через суд.",
      requires: { statuses: ["de_afd_rise"] },
      weight: 1,
      choices: [
        { label: "Подать иск о запрете партии!", removeStatuses: ["de_afd_rise"], effects: { sectors: { intel: 1, smi: 1 }, dovolstvo: -30, resources: { influence: -100 } }, newsLines: { state: "Демократия умеет защищаться", liberal: "Миллионы избирателей лишены голоса" } },
        { label: "Мы победим их в политической дискуссии, а не в суде", effects: { dovolstvo: 15 }, newsLines: { state: "Уважение к выбору граждан", liberal: "Власть трусливо отступает перед радикалами" } }
      ]
    },
    {
      id: "de_berlin_airport",
      speaker: "Главный Аудитор",
      situation: "Строительство аэропорта Берлина отстает от графика на 10 лет и превысило бюджет в 3 раза.",
      requires: { statuses: ["ordnung"] },
      weight: 1,
      choices: [
        { label: "Все переделать по стандартам Орднанга! Безопасность важнее сроков", effects: { resources: { money: -1000 }, sectors: { science: 1 }, dovolstvo: -10 }, newsLines: { state: "Немецкие стандарты качества не подлежат торгу", liberal: "Стройка века стала посмешищем для всего мира" } },
        { label: "Срезать углы и открыть как есть!", effects: { sectors: { economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Прагматизм победил бюрократию", liberal: "Пожарная сигнализация не работает, но ленточка перерезана" } }
      ]
    },
    {
      id: "de_fax_machines",
      speaker: "Министр Цифровизации",
      situation: "Минздрав до сих пор передает данные о зараженных коронавирусом по факсу. Это позор.",
      requires: { statuses: ["ordnung"] },
      weight: 1,
      choices: [
        { label: "Выделить 2 миллиарда на немедленную цифровизацию!", effects: { resources: { money: -2000 }, sectors: { science: 2, economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Прыжок в цифровую эру состоялся", liberal: "Миллиарды распилены IT-консультантами" } },
        { label: "Факс работает надежно и секьюрно. Оставить всё как есть", effects: { sectors: { science: -1 }, dovolstvo: -5 }, newsLines: { state: "Защита персональных данных гарантирована", liberal: "Германия застряла в 1980-х" } }
      ]
    },
    {
      id: "de_db_delays",
      speaker: "Глава Deutsche Bahn",
      situation: "Поезда постоянно опаздывают. Немецкая пунктуальность стала мемом.",
      weight: 1,
      choices: [
        { label: "Национализировать инфраструктуру и влить инвестиции", effects: { resources: { money: -2500 }, sectors: { economy: 1 }, dovolstvo: 20 }, newsLines: { state: "Возвращение былого величия железных дорог", liberal: "Государство плохой менеджер" } },
        { label: "Просто изменить определение 'опоздания' на 'до 30 минут'", effects: { sectors: { smi: 1 }, dovolstvo: -20 }, newsLines: { state: "Статистика прибытия поездов улучшилась вдвое", liberal: "Жалкие манипуляции с цифрами" } }
      ]
    },
    {
      id: "de_zeitenwende",
      speaker: "Министр Обороны",
      situation: "Война вернулась в Европу. Канцлер объявил 'Zeitenwende' (смену эпох).",
      weight: 1,
      choices: [
        { label: "Выделить 100 миллиардов евро на перевооружение Бундесвера!", effects: { resources: { money: -3000, influence: 200 }, sectors: { army: 3 }, dovolstvo: 10 }, newsLines: { state: "Германия снова становится военной державой", liberal: "Огромные долги ради оружия" } },
        { label: "Продолжать пацифистскую политику. Мы усвоили уроки истории", effects: { resources: { influence: -150 }, sectors: { army: -1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "de_leopard_tanks",
      speaker: "Глава МИД",
      situation: "Союзники давят на нас, требуя разрешить экспорт танков 'Леопард' в зону конфликта.",
      weight: 1,
      choices: [
        { label: "Разрешить отправку танков (Free the Leopards!)", effects: { resources: { influence: 250 }, sectors: { army: 1 }, dovolstvo: 5 }, newsLines: { state: "Германия выполняет союзнический долг", liberal: "Риск эскалации с ядерной державой" } },
        { label: "Тянуть время, предлагая прислать каски", effects: { resources: { influence: -200 }, dovolstvo: -5 }, newsLines: { state: "Осторожность — признак мудрости", liberal: "Весь мир смеется над нашими 'касками'" } }
      ]
    },
    {
      id: "de_oktoberfest",
      speaker: "Премьер Баварии",
      situation: "Из-за инфляции кружка пива на Октоберфесте стоит уже 15 евро. Люди возмущены.",
      weight: 1,
      choices: [
        { label: "Ввести ценовой потолок на пиво (Пивной тормоз)!", effects: { resources: { money: -500 }, sectors: { economy: -1 }, dovolstvo: 30 }, newsLines: { state: "Святое право на пиво защищено!", liberal: "Вмешательство в рынок ради популизма" } },
        { label: "Рынок есть рынок. Пусть пьют меньше", effects: { dovolstvo: -25 }, newsLines: { state: "Здоровый образ жизни выходит на первый план", liberal: "Даже традиции стали роскошью" } }
      ]
    }
  ],
  india: [
    {
      id: "in_ayodhya_temple",
      speaker: "Лидер Правящей Партии",
      situation: "Мы готовы открыть грандиозный индуистский храм на месте исторической мечети. Это сплотит нацию.",
      weight: 1,
      choices: [
        { label: "Открыть храм с размахом! Национальная гордость!", addStatuses: ["in_hindu_nationalism"], effects: { sectors: { smi: 2 }, dovolstvo: 20 }, newsLines: { state: "Историческая справедливость восстановлена", liberal: "Светский характер государства под угрозой" } },
        { label: "Отложить церемонию, чтобы не злить меньшинства", effects: { resources: { influence: -100 }, dovolstvo: -15 }, newsLines: { state: "Осторожность важнее амбиций", liberal: "Правительство проявило благоразумие" } }
      ]
    },
    {
      id: "in_minority_protests",
      speaker: "Министр Внутренних Дел",
      situation: "Новый закон о гражданстве вызвал массовые протесты мусульманского меньшинства.",
      requires: { statuses: ["in_hindu_nationalism"] },
      weight: 1,
      choices: [
        { label: "Подавить протесты железной рукой", effects: { sectors: { intel: 2, army: 1 }, dovolstvo: -10 }, newsLines: { state: "Порядок на улицах восстановлен", liberal: "Жестокость полиции не знает границ" } },
        { label: "Пойти на уступки и смягчить закон", removeStatuses: ["in_hindu_nationalism"], effects: { sectors: { intel: -1 }, dovolstvo: 15 }, newsLines: { state: "Демократия и диалог победили", liberal: "Власть испугалась собственного народа" } }
      ]
    },
    {
      id: "in_dalit_quota",
      speaker: "Министр Образования",
      situation: "Низшие касты (далиты) требуют увеличить для них квоты в университетах и на госслужбе.",
      weight: 1,
      choices: [
        { label: "Увеличить квоты. Это социальная справедливость", addStatuses: ["in_caste_conflict"], effects: { sectors: { economy: -1 }, dovolstvo: 10 }, newsLines: { state: "Шаг к равенству для всех каст", liberal: "Умные студенты не могут поступить из-за квот" } },
        { label: "Отменить квоты! Только меритократия", effects: { sectors: { science: 1 }, dovolstvo: -30 }, newsLines: { state: "Талант важнее происхождения", liberal: "Миллионы людей лишены социального лифта" } }
      ]
    },
    {
      id: "in_caste_riots",
      speaker: "Глава Полиции",
      situation: "Из-за споров о квотах начались столкновения между студентами разных каст. Жгут автобусы.",
      requires: { statuses: ["in_caste_conflict"] },
      weight: 1,
      choices: [
        { label: "Ввести комендантский час и отключить интернет", effects: { sectors: { intel: 1, economy: -1 }, dovolstvo: -20 }, newsLines: { state: "Цифровая блокада ради безопасности", liberal: "Нарушение базовых прав человека" } },
        { label: "Заплатить компенсации всем пострадавшим", removeStatuses: ["in_caste_conflict"], effects: { resources: { money: -1500 }, dovolstvo: 20 }, newsLines: { state: "Щедрость правительства успокоила толпу", liberal: "Деньги налогоплательщиков потрачены на усмирение бунтовщиков" } }
      ]
    },
    {
      id: "in_ai_outsourcing",
      speaker: "Глава IT-Корпорации",
      situation: "Западные компании всё чаще используют ИИ вместо наших дешевых программистов. Мы теряем контракты.",
      requires: { statuses: ["it_kasty"] },
      weight: 1,
      choices: [
        { label: "Влить миллиарды в обучение своих ИИ-моделей", effects: { resources: { money: -2500 }, sectors: { science: 2, economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Индия становится супердержавой искусственного интеллекта", liberal: "Огромные траты без гарантии успеха" } },
        { label: "Демпинговать цены! Пусть наши кодеры работают за еду", effects: { sectors: { economy: 1 }, dovolstvo: -25 }, newsLines: { state: "Наши услуги остаются самыми конкурентоспособными", liberal: "Цифровое рабство и потогонки" } }
      ]
    },
    {
      id: "in_chandrayaan_moon",
      speaker: "Глава Космического Агентства",
      situation: "Мы готовы посадить луноход на южный полюс Луны. Бюджет миссии меньше, чем у фильма в Голливуде.",
      weight: 1,
      choices: [
        { label: "Запуск! Это докажет величие Индии", addStatuses: ["in_space_power"], effects: { resources: { money: -500, influence: 300 }, sectors: { science: 2 }, dovolstvo: 25 }, newsLines: { state: "Исторический триумф индийской науки!", liberal: "В стране нет туалетов, зато мы на Луне" } },
        { label: "Отменить запуск, раздать деньги бедным", effects: { resources: { money: -500 }, dovolstvo: 15, sectors: { science: -1 } }, newsLines: { state: "Забота о гражданах важнее космоса", liberal: "Мы навсегда отстали в технологической гонке" } }
      ]
    },
    {
      id: "in_mars_mission",
      speaker: "Главный Конструктор",
      situation: "После успеха на Луне, Китай планирует миссию на Марс. Мы должны обогнать их!",
      requires: { statuses: ["in_space_power"] },
      weight: 1,
      choices: [
        { label: "Выделить огромный бюджет на полет к Марсу", effects: { resources: { money: -3000, influence: 400 }, sectors: { science: 3 }, dovolstvo: 10 }, newsLines: { state: "Индия устремляется к звездам", liberal: "Космическая гонка истощает экономику" } },
        { label: "Сотрудничать с США для удешевления миссии", effects: { resources: { influence: -100 }, sectors: { science: 1 } }, newsLines: { state: "Прагматичное партнерство с NASA", liberal: "Мы отдаем наши секреты американцам" } }
      ]
    },
    {
      id: "in_kashmir_skirmish",
      speaker: "Командир Погранвойск",
      situation: "Артиллерийская дуэль в Кашмире. Соседняя страна обвиняет нас в агрессии.",
      weight: 1,
      choices: [
        { label: "Ответить массированным ударом! Ни шагу назад", addStatuses: ["in_pakistan_tension"], effects: { resources: { influence: -100 }, sectors: { army: 2 }, dovolstvo: 15 }, newsLines: { state: "Врагу дан жесткий отпор", liberal: "Риск ядерной войны в регионе" } },
        { label: "Пригласить ООН для деэскалации", effects: { resources: { influence: -200 }, sectors: { army: -1 }, dovolstvo: -10 }, newsLines: { state: "Мирное решение конфликта", liberal: "Слабость перед лицом врага" } }
      ]
    },
    {
      id: "in_nuclear_threat",
      speaker: "Министр Обороны",
      situation: "Напряженность достигла пика. Соседи привели в готовность тактическое ядерное оружие.",
      requires: { statuses: ["in_pakistan_tension"] },
      weight: 1,
      choices: [
        { label: "Привести в готовность наши ракеты (Взаимное гарантированное уничтожение)", effects: { sectors: { army: 3, intel: 1 }, dovolstvo: -30, resources: { influence: -300 } }, newsLines: { state: "Мы готовы защитить себя любой ценой", liberal: "Мир в пяти минутах от Армагеддона" } },
        { label: "Инициировать прямые переговоры лидеров", removeStatuses: ["in_pakistan_tension"], effects: { resources: { influence: 200 }, dovolstvo: 20 }, newsLines: { state: "Историческое рукопожатие отвело угрозу", liberal: "Разум восторжествовал над гордыней" } }
      ]
    },
    {
      id: "in_russian_oil",
      speaker: "Министр Энергетики",
      situation: "Запад ввел санкции против нефти, но мы можем скупать её с огромной скидкой.",
      weight: 1,
      choices: [
        { label: "Покупать всё! Нам нужна энергия", effects: { resources: { money: 2500, influence: -150 }, sectors: { economy: 2 }, dovolstvo: 15 }, newsLines: { state: "Блестящая экономическая дипломатия", liberal: "Индия спонсирует чужие войны" } },
        { label: "Поддержать санкции Запада", effects: { resources: { influence: 200 }, sectors: { economy: -2 }, dovolstvo: -20 }, newsLines: { state: "Мы на правильной стороне истории", liberal: "Цены на бензин взлетели в небеса" } }
      ]
    },
    {
      id: "in_farmer_protests",
      speaker: "Глава Профсоюза Фермеров",
      situation: "Миллионы фермеров на тракторах перекрыли дороги в Дели из-за новых аграрных законов.",
      requires: { statuses: ["overpopulation"] },
      weight: 1,
      choices: [
        { label: "Отменить реформы, субсидировать сельское хозяйство", effects: { resources: { money: -2000 }, sectors: { economy: -1 }, dovolstvo: 25 }, newsLines: { state: "Фермеры — кормильцы нации", liberal: "Необходимые реформы отложены на десятилетия" } },
        { label: "Не уступать! Пусть бастуют", effects: { sectors: { economy: 1 }, dovolstvo: -40 }, newsLines: { state: "Закон един для всех", liberal: "Столица парализована, продукты гниют" } }
      ]
    },
    {
      id: "in_make_in_india",
      speaker: "Министр Торговли",
      situation: "Apple хочет перенести сборку iPhone из Китая к нам. Нужно дать им льготы.",
      weight: 1,
      choices: [
        { label: "Обеспечить им бесплатную землю и отсутствие налогов!", effects: { resources: { money: -1000 }, sectors: { economy: 2, science: 1 }, dovolstvo: 15 }, newsLines: { state: "Программа 'Make in India' работает!", liberal: "Транснациональные корпорации грабят страну" } },
        { label: "Пусть платят налоги как все местные компании", effects: { resources: { money: 500 }, sectors: { economy: -1 }, dovolstvo: -5 }, newsLines: { state: "Равные условия для бизнеса", liberal: "Apple переносит заводы во Вьетнам" } }
      ]
    },
    {
      id: "in_rrr_oscars",
      speaker: "Режиссер Болливуда",
      situation: "Наш эпический блокбастер с танцами и тиграми выиграл Оскар! Мягкая сила на подъеме.",
      requires: { statuses: ["bollywood"] },
      weight: 1,
      choices: [
        { label: "Вложить миллиард в продвижение индийского кино по миру", effects: { resources: { money: -1000, influence: 300 }, sectors: { smi: 2 }, dovolstvo: 20 }, newsLines: { state: "Индийская культура покоряет планету", liberal: "Кино важнее, чем чистая вода?" } },
        { label: "Запретить западным критикам обсуждать наши фильмы", effects: { sectors: { smi: -1 }, dovolstvo: -10 } }
      ]
    },
    {
      id: "in_delhi_smog",
      speaker: "Министр Экологии",
      situation: "Смог в Дели такой густой, что не видно солнца. Люди задыхаются.",
      weight: 1,
      choices: [
        { label: "Запретить сжигание стерни на полях и старые авто", effects: { sectors: { economy: -1 }, dovolstvo: -25 }, newsLines: { state: "Радикальные меры для чистого неба", liberal: "Фермеры и таксисты остались без средств к существованию" } },
        { label: "Раздать всем маски, это скоро пройдет само", effects: { resources: { money: -200 }, dovolstvo: 5 }, newsLines: { state: "Сезонное явление, причин для паники нет", liberal: "Экологическая катастрофа в столице" } }
      ]
    },
    {
      id: "in_cow_vigilantes",
      speaker: "Лидер Радикалов",
      situation: "Священные коровы! Наши отряды проверяют грузовики на трассах и линчуют тех, кто везет говядину.",
      weight: 1,
      choices: [
        { label: "Священную корову нужно защищать! Закрыть глаза на самосуд", effects: { sectors: { intel: -2 }, dovolstvo: -15, resources: { influence: -150 } }, newsLines: { state: "Традиции предков неприкосновенны", liberal: "Страна скатывается в религиозное средневековье" } },
        { label: "Арестовать вигилантов! Закон выше религии", effects: { sectors: { intel: 2 }, dovolstvo: -10 }, newsLines: { state: "Монополия на насилие принадлежит государству", liberal: "Орды фанатиков наконец-то за решеткой" } }
      ]
    }
  ],
  japan: [
    {
      id: "jp_karoshi",
      speaker: "Министр Труда",
      situation: "Люди умирают от переутомления прямо на рабочих местах. Нам нужно ограничить рабочие часы.",
      requires: { statuses: ["workaholics"] },
      weight: 1,
      choices: [
        { label: "Ввести строгий запрет на переработки (Уход домой в 18:00)", addStatuses: ["jp_deflation"], effects: { sectors: { economy: -2 }, dovolstvo: 20 }, newsLines: { state: "Здоровье нации превыше всего", liberal: "Корпоративная культура разрушена" } },
        { label: "Поставить больше кроватей и автоматов с кофе в офисах", effects: { sectors: { economy: 1 }, dovolstvo: -20 }, newsLines: { state: "Преданность компании — долг каждого", liberal: "Современное рабство продолжается" } }
      ]
    },
    {
      id: "jp_negative_rates",
      speaker: "Глава Центробанка",
      situation: "Экономика в стагнации, люди копят деньги и ничего не покупают. Ставка уже отрицательная.",
      requires: { statuses: ["jp_deflation"] },
      weight: 1,
      choices: [
        { label: "Напечатать еще триллион йен (Количественное смягчение)!", effects: { resources: { money: -1000 }, sectors: { economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Банк Японии стимулирует рост", liberal: "Цены на импорт взлетят в небеса" } },
        { label: "Поднять ставку! Хватит бесплатных денег", removeStatuses: ["jp_deflation"], effects: { sectors: { economy: -2 }, dovolstvo: -15 }, newsLines: { state: "Конец эпохи нулевых ставок", liberal: "Малый бизнес массово банкротится" } }
      ]
    },
    {
      id: "jp_yen_crash",
      speaker: "Министр Финансов",
      situation: "Йена пробила историческое дно. Импорт энергоносителей становится слишком дорогим.",
      weight: 1,
      choices: [
        { label: "Провести валютные интервенции", effects: { resources: { money: -2500 }, sectors: { economy: 1 } }, newsLines: { state: "Правительство защищает национальную валюту", liberal: "Сжигание резервов без долгосрочного плана" } },
        { label: "Отличный шанс для экспорта! Завалим мир нашими товарами", effects: { resources: { money: 1500 }, sectors: { economy: 2 }, dovolstvo: -10 }, newsLines: { state: "Toyota бьет рекорды продаж", liberal: "Простые японцы беднеют с каждым днем" } }
      ]
    },
    {
      id: "jp_ghost_villages",
      speaker: "Министр Демографии",
      situation: "В провинции тысячи заброшенных домов (акия). Молодежь уехала в Токио, старики вымерли.",
      requires: { statuses: ["aging_population"] },
      weight: 1,
      choices: [
        { label: "Раздавать дома бесплатно семьям с детьми!", effects: { resources: { money: -500 }, dovolstvo: 15 }, newsLines: { state: "Возрождение регионов", liberal: "Никто не хочет жить в глуши даже бесплатно" } },
        { label: "Снести их и построить автоматизированные фермы", addStatuses: ["jp_robot_revolution"], effects: { sectors: { economy: 1, science: 1 } }, newsLines: { state: "Агро-инновации спасают деревни", liberal: "Уничтожение традиционного ландшафта" } }
      ]
    },
    {
      id: "jp_ai_mayor",
      speaker: "Житель Киото",
      situation: "В одном из городов на выборах победил ИИ. Люди говорят, что он честнее политиков.",
      requires: { statuses: ["jp_robot_revolution"] },
      weight: 1,
      choices: [
        { label: "Утвердить ИИ-мэра! Это прорыв в управлении", effects: { sectors: { science: 3, intel: 1 }, dovolstvo: 20 }, newsLines: { state: "Абсолютно неподкупная власть", liberal: "Мы отдаем свою судьбу алгоритмам" } },
        { label: "Отменить результаты. Машина не может править людьми", effects: { sectors: { science: -1 }, dovolstvo: -10 }, newsLines: { state: "Защита человеческого достоинства", liberal: "Власть боится конкуренции с ИИ" } }
      ]
    },
    {
      id: "jp_immigration_taboo",
      speaker: "Глава Ассоциации Больниц",
      situation: "У нас не хватает сиделок для стариков. Может, всё-таки пустим мигрантов?",
      weight: 1,
      choices: [
        { label: "Создать спецвизы для иностранных рабочих", effects: { sectors: { economy: 1 }, dovolstvo: -20, resources: { influence: 100 } }, newsLines: { state: "Прагматичное решение кадрового голода", liberal: "Конец гомогенного общества" } },
        { label: "Нет! Мы справимся своими силами (и роботами)", effects: { sectors: { science: 1 }, dovolstvo: 10 }, newsLines: { state: "Сохранение уникальной японской культуры", liberal: "Старикам некому принести стакан воды" } }
      ]
    },
    {
      id: "jp_senkaku_boats",
      speaker: "Командир Береговой Охраны",
      situation: "Сотни 'рыбацких' лодок соседа вошли в наши территориальные воды возле спорных островов.",
      weight: 1,
      choices: [
        { label: "Выслать эсминцы и оттеснить их водометами!", addStatuses: ["jp_island_dispute"], effects: { sectors: { army: 1 }, dovolstvo: 15, resources: { influence: -100 } }, newsLines: { state: "Решительная защита наших границ", liberal: "Опасная эскалация в Восточно-Китайском море" } },
        { label: "Подать ноту протеста и не провоцировать", effects: { resources: { influence: -150 }, dovolstvo: -15 }, newsLines: { state: "Дипломатия прежде всего", liberal: "Нас вытесняют с наших же территорий" } }
      ]
    },
    {
      id: "jp_article_9",
      speaker: "Премьер-Министр",
      situation: "Из-за угроз соседей пора пересмотреть 9-ю статью Конституции и создать полноценную армию.",
      requires: { statuses: ["jp_island_dispute"] },
      weight: 1,
      choices: [
        { label: "Переписать Конституцию! Воссоздать Императорский Флот", removeStatuses: ["jp_island_dispute"], effects: { sectors: { army: 3 }, resources: { money: -2000, influence: -200 }, dovolstvo: -20 }, newsLines: { state: "Япония снова нормальная военная держава", liberal: "Призрак милитаризма возвращается" } },
        { label: "Остаться пацифистской страной", effects: { resources: { influence: 100 }, dovolstvo: 10 }, newsLines: { state: "Верность идеалам мира", liberal: "Мы беззащитны перед агрессорами" } }
      ]
    },
    {
      id: "jp_us_bases",
      speaker: "Губернатор Окинавы",
      situation: "Снова скандал с американскими морпехами. Местные жители требуют убрать базы США с острова.",
      weight: 1,
      choices: [
        { label: "Попросить США перенести базу (Обидеть союзника)", effects: { resources: { influence: -250 }, sectors: { army: -1 }, dovolstvo: 25 }, newsLines: { state: "Правительство слышит голос народа", liberal: "Трещина в альянсе безопасности" } },
        { label: "Подавить протесты. Базы нужны для защиты", effects: { sectors: { intel: 1 }, dovolstvo: -20, resources: { influence: 100 } }, newsLines: { state: "Безопасность требует жертв", liberal: "Окинава — колония Токио и Вашингтона" } }
      ]
    },
    {
      id: "jp_vtuber_scandal",
      speaker: "Глава Агентства Идолов",
      situation: "Наша главная виртуальная ютуберша (VTuber) случайно показала в эфире, что у неё есть парень. Акции рухнули.",
      requires: { statuses: ["anime_softpower"] },
      weight: 1,
      choices: [
        { label: "Заставить её публично извиняться в слезах", effects: { sectors: { smi: 1 }, dovolstvo: -10 }, newsLines: { state: "Идол принадлежит только фанатам", liberal: "Токсичная культура отаку переходит границы" } },
        { label: "Защитить её. Виртуальный аватар — это просто работа", effects: { sectors: { smi: -1 }, dovolstvo: 15 }, newsLines: { state: "Новая эра: идолы тоже люди", liberal: "Индустрия развлечений меняет правила" } }
      ]
    },
    {
      id: "jp_cool_japan",
      speaker: "Министр Культуры",
      situation: "Программа 'Cool Japan' провалилась. Чиновники не умеют продвигать аниме и игры.",
      requires: { statuses: ["anime_softpower"] },
      weight: 1,
      choices: [
        { label: "Отдать бюджет самим студиям и творцам", effects: { resources: { money: -1000, influence: 300 }, sectors: { smi: 2 }, dovolstvo: 20 }, newsLines: { state: "Японский контент захватывает мир", liberal: "Государство больше не вмешивается в искусство" } },
        { label: "Продолжать выделять гранты друзьям министра", effects: { resources: { money: -500 }, sectors: { smi: -1 }, dovolstvo: -15 }, newsLines: { state: "Поддержка традиционных медиа", liberal: "Бюджетные деньги сливаются в трубу" } }
      ]
    },
    {
      id: "jp_fax_obsession",
      speaker: "Министр Цифровизации",
      situation: "Наши чиновники требуют приносить документы на дискетах и отправлять по факсу. В 2026 году!",
      weight: 1,
      choices: [
        { label: "Уничтожить все факсы и перейти в облако!", effects: { resources: { money: -1500 }, sectors: { science: 2, economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Болезненный прыжок в XXI век", liberal: "Тысячи старых чиновников ушли в отставку" } },
        { label: "Дискета — это безопасность. Хакеры не взломают факс", effects: { sectors: { science: -1, intel: 1 }, dovolstvo: -5 }, newsLines: { state: "Аналоговая защита данных", liberal: "Галапагосский синдром в IT" } }
      ]
    },
    {
      id: "jp_fukushima_water",
      speaker: "Директор TEPCO",
      situation: "Резервуары переполнены. Нам нужно слить очищенную воду с Фукусимы в океан. Соседи в ярости.",
      weight: 1,
      choices: [
        { label: "Слить воду! МАГАТЭ разрешило", effects: { resources: { influence: -200 }, sectors: { economy: 1 }, dovolstvo: -10 }, newsLines: { state: "Научный подход победил страхи", liberal: "Китай полностью запретил импорт наших морепродуктов" } },
        { label: "Строить новые резервуары (очень дорого)", effects: { resources: { money: -1500 }, dovolstvo: 10 }, newsLines: { state: "Экология океана в безопасности", liberal: "Пустая трата миллиардов из-за паники" } }
      ]
    },
    {
      id: "jp_nuclear_restart",
      speaker: "Министр Энергетики",
      situation: "Чтобы не покупать дорогой СПГ, нам нужно перезапустить остановленные АЭС. Но люди боятся.",
      weight: 1,
      choices: [
        { label: "Перезапустить реакторы! Нам нужна дешевая энергия", effects: { sectors: { economy: 2 }, dovolstvo: -25 }, newsLines: { state: "Энергетическая независимость восстановлена", liberal: "Правительство забыло уроки Фукусимы" } },
        { label: "Продолжать импортировать газ", effects: { resources: { money: -2000 }, sectors: { economy: -1 }, dovolstvo: 10 }, newsLines: { state: "Безопасность населения важнее экономики", liberal: "Счета за свет разоряют предприятия" } }
      ]
    },
    {
      id: "jp_whale_hunting",
      speaker: "Глава Союза Рыбаков",
      situation: "Международное сообщество требует запретить коммерческий забой китов. Но это наша традиция!",
      weight: 1,
      choices: [
        { label: "Продолжать гарпунить китов! Мы выходим из комиссии", effects: { resources: { influence: -150 }, dovolstvo: 15 }, newsLines: { state: "Защита национальных традиций", liberal: "Япония стала страной-изгоем для экологов" } },
        { label: "Запретить китобойный промысел навсегда", effects: { resources: { influence: 150 }, dovolstvo: -20 }, newsLines: { state: "Победа защитников животных", liberal: "Целые прибрежные города лишились работы" } }
      ]
    }
  ],
  armenia: [
    {
      id: "am_diaspora",
      speaker: "Представитель Диаспоры",
      situation: "Ахпер джан, мы собрали фонды в Калифорнии и Париже. Куда перевести деньги?",
      requires: { statuses: ["diaspora"] },
      weight: 1,
      choices: [
        {
          label: "Отправить на строительство дорог! [СМИ: Инфраструктура обновляется]",
          effects: { resources: { money: 1500 }, sectors: { economy: 1 } }
        },
        {
          label: "Потратить на праздник! Шашлык всем! [СМИ: Народ гуляет до утра]",
          effects: { dovolstvo: 30 }
        }
      ]
    },
    {
      id: "am_nardy",
      speaker: "Чемпион по Нардам",
      situation: "Назревает дипломатический конфликт с соседями. Я предлагаю решить его броском зар.",
      requires: { statuses: ["nardy"] },
      weight: 1,
      choices: [
        {
          label: "Выпускайте мастера! Шеш-Беш! [СМИ: Спор разрешен за игровой доской]",
          effects: { resources: { influence: 150 }, dovolstvo: 10 }
        },
        {
          label: "Мы проиграли партию... Придется уступить. [СМИ: Дипломатическое фиаско]",
          effects: { resources: { influence: -100 }, dovolstvo: -10 }
        }
      ]
    },
    {
      id: "am_radio",
      speaker: "Ведущий Армянского Радио",
      situation: "Нас спрашивают: 'Правда ли, что экономика падает?'",
      requires: { statuses: ["radio_erevan"] },
      weight: 1,
      choices: [
        {
          label: "Ответить шуткой! [СМИ: Армянское радио снова жжет глаголом]",
          effects: { sectors: { smi: 1 }, dovolstvo: 15 }
        },
        {
          label: "Ответить честно [СМИ: Унылые новости огорчают граждан]",
          effects: { dovolstvo: -10 }
        }
      ]
    }
  ],
  israel: [
    {
      id: "il_new_election",
      speaker: "Спикер Кнессета",
      situation: "Правительство снова развалилось. Это уже пятые выборы за 3 года.",
      weight: 1,
      choices: [
        { label: "Собрать коалицию из 11 мелких партий", addStatuses: ["il_coalition_chaos"], effects: { sectors: { intel: -1 }, dovolstvo: -10 }, newsLines: { state: "Широкое представительство народа!", liberal: "Франкенштейн вместо правительства" } },
        { label: "Провести новые выборы", effects: { resources: { money: -500 }, dovolstvo: -15 }, newsLines: { state: "Демократия в действии", liberal: "Бесконечный политический кризис" } }
      ]
    },
    {
      id: "il_supreme_court",
      speaker: "Министр Юстиции",
      situation: "Коалиционные партнеры требуют провести судебную реформу и ограничить власть Верховного Суда.",
      requires: { statuses: ["il_coalition_chaos"] },
      weight: 1,
      choices: [
        { label: "Провести реформу! Судьи не избирались народом", addStatuses: ["il_judicial_reform"], effects: { sectors: { intel: 1 }, dovolstvo: -20 }, newsLines: { state: "Возврат власти парламенту", liberal: "Конец израильской демократии" } },
        { label: "Заморозить проект из-за протестов", effects: { resources: { influence: -100 }, dovolstvo: 15 }, newsLines: { state: "Власть прислушалась к народу", liberal: "Победа гражданского общества" } }
      ]
    },
    {
      id: "il_reservist_strike",
      speaker: "Начальник Генштаба",
      situation: "В знак протеста против реформы тысячи пилотов-резервистов отказываются являться на сборы.",
      requires: { statuses: ["il_judicial_reform"] },
      weight: 1,
      choices: [
        { label: "Отменить реформу. Армия важнее", removeStatuses: ["il_judicial_reform"], effects: { sectors: { army: 2 }, dovolstvo: 25 }, newsLines: { state: "Единство нации сохранено", liberal: "Армия спасла страну от диктатуры" } },
        { label: "Уволить их всех! Никакого шантажа", effects: { sectors: { army: -3 }, dovolstvo: -30 }, newsLines: { state: "Дисциплина в рядах ЦАХАЛ", liberal: "Обороноспособность страны уничтожена" } }
      ]
    },
    {
      id: "il_rocket_barrage",
      speaker: "Генерал ПВО",
      situation: "Соседи запустили 1000 ракет за один час. Купол перегревается.",
      requires: { statuses: ["iron_dome"] },
      weight: 1,
      choices: [
        { label: "Сбивать всё! Тратим миллионы на перехватчики", effects: { resources: { money: -2000 }, sectors: { army: 1 }, dovolstvo: 15 }, newsLines: { state: "Железный Купол снова доказал эффективность", liberal: "Золотые ракеты против водопроводных труб" } },
        { label: "Немедленно начать наземную операцию в ответ!", addStatuses: ["il_intifada"], effects: { resources: { influence: -150 }, sectors: { army: 2 }, dovolstvo: -10 }, newsLines: { state: "ЦАХАЛ начал зачистку инфраструктуры террора", liberal: "Очередной виток бесконечного насилия" } }
      ]
    },
    {
      id: "il_settlement_expansion",
      speaker: "Лидер Поселенцев",
      situation: "Мы хотим построить еще 5000 домов на спорных территориях. Это наша земля.",
      weight: 1,
      choices: [
        { label: "Одобрить строительство", addStatuses: ["il_intifada"], effects: { resources: { influence: -200 }, sectors: { economy: 1 }, dovolstvo: -15 }, newsLines: { state: "Укрепление наших позиций", liberal: "Мирный процесс окончательно похоронен" } },
        { label: "Заморозить стройки ради отношений с США", effects: { resources: { influence: 150 }, dovolstvo: -10 }, newsLines: { state: "Прагматичная дипломатия", liberal: "США диктуют нам условия" } }
      ]
    },
    {
      id: "il_border_wall",
      speaker: "Министр Обороны",
      situation: "Волна терактов в городах захлестнула страну. Нужно срочно реагировать.",
      requires: { statuses: ["il_intifada"] },
      weight: 1,
      choices: [
        { label: "Построить стену еще выше и закрыть КПП", removeStatuses: ["il_intifada"], effects: { resources: { money: -1500 }, sectors: { army: 1 }, dovolstvo: 20 }, newsLines: { state: "Безопасность граждан восстановлена", liberal: "Страна превращается в крепость" } },
        { label: "Провести тайные переговоры с лидерами протестов", effects: { sectors: { intel: 2 }, resources: { money: 500 } }, newsLines: { state: "Дипломатия лучше войны", liberal: "Тайные сделки с террористами" } }
      ]
    },
    {
      id: "il_iran_nuke",
      speaker: "Директор Моссада",
      situation: "Главный враг на Востоке обогатил уран до 90%. Они близки к созданию бомбы.",
      requires: { statuses: ["mossad"] },
      weight: 1,
      choices: [
        { label: "Отправить эскадрилью F-35 разбомбить реакторы!", effects: { resources: { money: -2500, influence: -300 }, sectors: { army: 3 }, dovolstvo: 30 }, newsLines: { state: "Экзистенциальная угроза устранена", liberal: "Риск полномасштабной региональной войны" } },
        { label: "Внедрить вирус Stuxnet 2.0 в их центрифуги", effects: { sectors: { intel: 2, science: 1 }, resources: { influence: 100 } }, newsLines: { state: "Невидимая война продолжается", liberal: "Кибератаки могут привести к ответным мерам" } }
      ]
    },
    {
      id: "il_pager_explodes",
      speaker: "Глава Операций Моссада",
      situation: "Мы внедрили взрывчатку в партию пейджеров, закупленных террористической организацией.",
      requires: { statuses: ["mossad"] },
      weight: 1,
      choices: [
        { label: "Подорвать их всех одновременно!", effects: { sectors: { intel: 3, army: 1 }, resources: { influence: -150 }, dovolstvo: 25 }, newsLines: { state: "Гениальная операция наших спецслужб", liberal: "Вопросы этичности массового подрыва электроники" } },
        { label: "Использовать их только для прослушки", effects: { sectors: { intel: 2 }, dovolstvo: 5 }, newsLines: { state: "Ценная развединформация получена", liberal: "Тихая победа разведки" } }
      ]
    },
    {
      id: "il_pegasus_leak",
      speaker: "Министр Связи",
      situation: "СМИ узнали, что наша программа 'Пегас' использовалась диктаторами для слежки за журналистами.",
      weight: 1,
      choices: [
        { label: "Запретить экспорт кибероружия", effects: { resources: { influence: 150, money: -1000 }, sectors: { intel: -1 } }, newsLines: { state: "Защита прав человека и свободы слова", liberal: "Удар по нашей IT-индустрии" } },
        { label: "Всё отрицать. Бизнес есть бизнес", effects: { resources: { money: 1500, influence: -200 }, sectors: { intel: 1 } }, newsLines: { state: "Израильский хайтек востребован во всем мире", liberal: "Соучастие в международных преступлениях" } }
      ]
    },
    {
      id: "il_silicon_wadi",
      speaker: "CEO Стартапа",
      situation: "Из-за нестабильности инвесторы уходят. Тех-компании (Силиконовая Вади) грозятся переехать в США.",
      requires: { statuses: ["shekeli"] },
      weight: 1,
      choices: [
        { label: "Дать им нулевой налог на 5 лет", effects: { resources: { money: -2000 }, sectors: { science: 2, economy: 1 } }, newsLines: { state: "Спасение сектора высоких технологий", liberal: "Бюджет недосчитается миллиардов" } },
        { label: "Пусть едут. Свято место пусто не бывает", effects: { sectors: { economy: -2, science: -2 }, dovolstvo: -15 }, newsLines: { state: "Мы не поддаемся на шантаж", liberal: "Утечка мозгов набирает обороты" } }
      ]
    },
    {
      id: "il_water_tech",
      speaker: "Главный Инженер",
      situation: "У нас передовые технологии опреснения воды, а соседи страдают от засухи.",
      requires: { statuses: ["shekeli"] },
      weight: 1,
      choices: [
        { label: "Продавать им воду в обмен на мирные договоры", effects: { resources: { influence: 300, money: 500 }, sectors: { science: 1 } }, newsLines: { state: "Водная дипломатия приносит плоды", liberal: "Прагматизм побеждает вражду" } },
        { label: "Оставить всю воду себе", effects: { resources: { influence: -100 }, dovolstvo: 10 }, newsLines: { state: "Запасы воды на рекордном уровне", liberal: "Эгоизм ведет к напряженности в регионе" } }
      ]
    },
    {
      id: "il_kibbutz_revival",
      speaker: "Председатель Киббуца",
      situation: "Сельское хозяйство в пустыне умирает. Молодёжь уезжает в Тель-Авив писать код.",
      weight: 1,
      choices: [
        { label: "Субсидировать агро-стартапы в киббуцах", effects: { resources: { money: -1000 }, sectors: { science: 1, economy: 1 }, dovolstvo: 15 }, newsLines: { state: "Возрождение сионистской мечты с помощью ИИ", liberal: "Томаты по цене золота" } },
        { label: "Пусть рынок решает. Импортируем овощи", effects: { resources: { money: 500 }, sectors: { economy: -1 }, dovolstvo: -10 }, newsLines: { state: "Свободная экономика", liberal: "Уничтожение продовольственной безопасности" } }
      ]
    },
    {
      id: "il_abraham_accords",
      speaker: "Премьер-Министр",
      situation: "При посредничестве США мы можем подписать мирный договор с богатыми монархиями Залива.",
      weight: 1,
      choices: [
        { label: "Подписать Соглашения Авраама! Открыть прямые рейсы", effects: { resources: { influence: 400, money: 2000 }, sectors: { economy: 2 }, dovolstvo: 30 }, newsLines: { state: "Исторический прорыв на Ближнем Востоке", liberal: "Новая эра туризма и торговли" } },
        { label: "Отклонить условия, они требуют уступок", effects: { resources: { influence: -200 }, dovolstvo: -15 } }
      ]
    },
    {
      id: "il_shabbat_trains",
      speaker: "Раввин из Коалиции",
      situation: "Поезда работают в Шаббат! Это нарушение коалиционных соглашений. Требуем остановить!",
      weight: 1,
      choices: [
        { label: "Остановить поезда с вечера пятницы", effects: { sectors: { economy: -1 }, dovolstvo: -20, resources: { influence: 50 } }, newsLines: { state: "Уважение к традициям предков", liberal: "Светский транспорт заложник религии" } },
        { label: "Проигнорировать. Транспорт должен работать всегда", effects: { sectors: { economy: 1 }, dovolstvo: 15, resources: { influence: -150 } }, newsLines: { state: "Город живет 24/7", liberal: "Правительство рискует распасться" } }
      ]
    },
    {
      id: "il_un_resolution",
      speaker: "Посол в ООН",
      situation: "Ассамблея ООН приняла 15-ю за год резолюцию, осуждающую наши действия.",
      weight: 1,
      choices: [
        { label: "Порвать текст резолюции прямо на трибуне!", effects: { resources: { influence: -200 }, sectors: { smi: 1 }, dovolstvo: 20 }, newsLines: { state: "Мы не потерпим лицемерия ООН!", liberal: "Дипломатическая изоляция усиливается" } },
        { label: "Промолчать и не обращать внимания", effects: { dovolstvo: -10 }, newsLines: { state: "Собаки лают, караван идет", liberal: "Очередное унижение на международной арене" } }
      ]
    }
  ],
};

for (const [countryId, cards] of Object.entries(decks)) {
  const deck = {
    country: countryId,
    cards: cards
  };
  fs.writeFileSync(path.join(advisorsDir, countryId + '.json'), JSON.stringify(deck, null, 2));
}

console.log('Created 10 unique decks.');
