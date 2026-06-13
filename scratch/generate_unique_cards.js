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
  uk: [
    {
      id: "uk_lorry_drivers",
      speaker: "Министр Транспорта",
      situation: "Из-за выхода из ЕС мы лишились польских дальнобойщиков. Полки супермаркетов пустеют.",
      requires: { statuses: ["brexit_legacy"] },
      weight: 1,
      choices: [
        { label: "Привлечь армию для доставки продуктов", effects: { sectors: { army: -1, economy: 1 }, dovolstvo: 10 }, newsLines: { state: "Армия спасает логистику страны", liberal: "Военные развозят туалетную бумагу" } },
        { label: "Выдать временные визы мигрантам (отмена принципов)", effects: { resources: { money: 500 }, dovolstvo: -20 }, newsLines: { state: "Прагматичный подход к логистике", liberal: "Обещания Брексита были ложью" } }
      ]
    },
    {
      id: "uk_nhs_strike",
      speaker: "Глава Профсоюза Медсестер",
      situation: "Медсестры бастуют из-за низких зарплат. Очереди в скорую помощь достигают 12 часов.",
      requires: { statuses: ["brexit_legacy"] },
      weight: 1,
      choices: [
        { label: "Мы не поддадимся шантажу! Пусть бастуют", addStatuses: ["uk_nhs_collapse"], effects: { resources: { money: 500 }, dovolstvo: -30 }, newsLines: { state: "Бюджет здравоохранения сохранен", liberal: "Люди умирают в коридорах больниц" } },
        { label: "Повысить зарплаты на 15%", effects: { resources: { money: -2000 }, dovolstvo: 20 }, newsLines: { state: "Герои нации получили заслуженное", liberal: "Инфляционная спираль раскручивается" } }
      ]
    },
    {
      id: "uk_private_healthcare",
      speaker: "Инвестор из США",
      situation: "Система NHS разваливается. Давайте мы приватизируем часть клиник?",
      requires: { statuses: ["uk_nhs_collapse"] },
      weight: 1,
      choices: [
        { label: "Начать приватизацию", removeStatuses: ["uk_nhs_collapse"], effects: { resources: { money: 2000 }, sectors: { economy: 1 }, dovolstvo: -20 }, newsLines: { state: "Модернизация медицины частным капиталом", liberal: "Конец бесплатной медицины" } },
        { label: "Медицина должна быть бесплатной (печатать деньги)", effects: { resources: { money: -1500 }, modifiers: { inflationDelta: 0.05 }, dovolstvo: 15 } }
      ]
    },
    {
      id: "uk_scotland_referendum",
      speaker: "Первый Министр Шотландии",
      situation: "Мы не голосовали за Брексит! Шотландия требует нового референдума о независимости.",
      weight: 1,
      choices: [
        { label: "Отказать. Вопрос был закрыт в 2014 году", addStatuses: ["uk_scottish_independence"], effects: { dovolstvo: -15 }, newsLines: { state: "Соединенное Королевство останется единым", liberal: "Лондон игнорирует демократию" } },
        { label: "Дать им больше автономии и денег", effects: { resources: { money: -1000 }, dovolstvo: 10 }, newsLines: { state: "Деволюция спасает Союз", liberal: "Шантажисты снова получили выкуп" } }
      ]
    },
    {
      id: "uk_north_sea_oil",
      speaker: "Лидер Шотландских Националистов",
      situation: "Нефть Северного моря принадлежит Шотландии! Мы останавливаем добычу в знак протеста.",
      requires: { statuses: ["uk_scottish_independence"] },
      weight: 1,
      choices: [
        { label: "Ввести прямое правление Лондона", addStatuses: ["uk_energy_crisis"], effects: { sectors: { intel: 1 }, dovolstvo: -25 }, newsLines: { state: "Восстановление конституционного порядка", liberal: "Оккупация собственного севера" } },
        { label: "Отдать им 50% доходов", effects: { resources: { money: -1500 }, sectors: { economy: -1 } } }
      ]
    },
    {
      id: "uk_winter_heating",
      speaker: "Мэр Лондона",
      situation: "Из-за кризиса людям нечем платить за отопление. Впереди суровая зима.",
      requires: { statuses: ["uk_energy_crisis"] },
      weight: 1,
      choices: [
        { label: "Ввести субсидии на коммуналку", effects: { resources: { money: -2500 }, dovolstvo: 25 }, newsLines: { state: "Правительство греет народ", liberal: "Государственный долг пробил небеса" } },
        { label: "Посоветовать людям надеть свитера", effects: { dovolstvo: -35 }, newsLines: { state: "Бережливость — национальная черта", liberal: "Старики замерзают в своих домах" } }
      ]
    },
    {
      id: "uk_royal_interview",
      speaker: "Опальный Принц",
      situation: "Принц дал скандальное интервью американскому ТВ, обвинив Семью в расизме.",
      weight: 1,
      choices: [
        { label: "Лишить его всех титулов и содержания", addStatuses: ["uk_royal_scandal"], effects: { sectors: { smi: 1 }, dovolstvo: -5 }, newsLines: { state: "Монархия очищается от предателей", liberal: "Институт монархии трещит по швам" } },
        { label: "Хранить королевское молчание (Никогда не жалуйся)", effects: { resources: { influence: -50 } } }
      ]
    },
    {
      id: "uk_republican_movement",
      speaker: "Глава 'Антимонархистов'",
      situation: "Скандалы доказали, что корона устарела. Мы собираем подписи за Республику.",
      requires: { statuses: ["uk_royal_scandal"] },
      weight: 1,
      choices: [
        { label: "Арестовать лидеров движения за измену", effects: { sectors: { intel: 2 }, dovolstvo: -20 }, newsLines: { state: "Корона защищена законом", liberal: "Свобода слова отменена во имя короля" } },
        { label: "Запустить позитивную PR-кампанию Короны", effects: { resources: { money: -500 }, sectors: { smi: 2 }, dovolstvo: 15 }, newsLines: { state: "Любовь народа к Монархии непоколебима", liberal: "Пропаганда за наши налоги" } }
      ]
    },
    {
      id: "uk_tea_shortage",
      speaker: "Министр Торговли",
      situation: "Проблемы с логистикой в Суэцком канале оставили страну без свежего чая!",
      requires: { statuses: ["tea_5_oclock"] },
      weight: 1,
      choices: [
        { label: "Опустошить стратегические резервы чая!", effects: { resources: { money: -500 }, dovolstvo: 30 }, newsLines: { state: "Традиции 5 o'clock спасены", liberal: "Страна живет в иллюзии нормальности" } },
        { label: "Призвать пить кофе", effects: { dovolstvo: -40 }, newsLines: { state: "Модернизация вкусовых привычек", liberal: "Конец британской цивилизации" } }
      ]
    },
    {
      id: "uk_dirty_money",
      speaker: "Глава МИД",
      situation: "Иностранные олигархи скупают особняки в Челси. Это грязные деньги, но они питают нашу экономику.",
      requires: { statuses: ["financial_hub"] },
      weight: 1,
      choices: [
        { label: "Добро пожаловать в Лондонград! (Закрыть глаза)", effects: { resources: { money: 2000 }, sectors: { economy: 1 }, dovolstvo: -10 }, newsLines: { state: "Лондон остается финансовой столицей мира", liberal: "Прачечная для коррупционеров" } },
        { label: "Ввести санкции и арестовать их яхты!", effects: { resources: { influence: 150 }, sectors: { economy: -1, intel: 1 }, dovolstvo: 10 }, newsLines: { state: "Очищение от грязных денег", liberal: "Олигархи бегут в Дубай" } }
      ]
    },
    {
      id: "uk_fintech_boom",
      speaker: "Министр Цифровизации",
      situation: "Финансовый сектор хочет инвестировать в ИИ и финтех, чтобы обогнать Европу.",
      requires: { statuses: ["financial_hub"] },
      weight: 1,
      choices: [
        { label: "Снять все регуляции. Дать налоговые льготы!", addStatuses: ["uk_tech_hub"], effects: { resources: { money: -1000 }, sectors: { science: 2, economy: 1 } }, newsLines: { state: "Британия — лидер цифровой революции", liberal: "Техногиганты не платят налоги" } },
        { label: "Это слишком рискованно", effects: { resources: { money: 500 } } }
      ]
    },
    {
      id: "uk_ai_summit",
      speaker: "Основатель Стартапа",
      situation: "Благодаря статусу хаба мы можем провести глобальный саммит по безопасности ИИ.",
      requires: { statuses: ["uk_tech_hub"] },
      weight: 1,
      choices: [
        { label: "Провести саммит в Блетчли-Парке", effects: { resources: { money: -500, influence: 200 }, sectors: { science: 1 } }, newsLines: { state: "Британия диктует правила для ИИ", liberal: "Пиар-акция без реальных дел" } },
        { label: "Не тратить на это деньги", effects: { resources: { money: 200 } } }
      ]
    },
    {
      id: "uk_channel_boats",
      speaker: "Министр Внутренних Дел",
      situation: "Нелегалы массово переплывают Ла-Манш на резиновых лодках. Отели переполнены.",
      weight: 1,
      choices: [
        { label: "Запретить им подавать на убежище", addStatuses: ["uk_immigration_tensions"], effects: { sectors: { intel: 1 }, dovolstvo: 10, resources: { influence: -100 } }, newsLines: { state: "Жесткая остановка лодок", liberal: "Нарушение международных конвенций" } },
        { label: "Разместить их на плавучих баржах", effects: { resources: { money: -1000 }, dovolstvo: -15 }, newsLines: { state: "Временное решение проблемы размещения", liberal: "Плавучие тюрьмы" } }
      ]
    },
    {
      id: "uk_rwanda_plan",
      speaker: "Генеральный Прокурор",
      situation: "Чтобы остановить лодки, мы можем платить африканской стране за прием нелегалов.",
      requires: { statuses: ["uk_immigration_tensions"] },
      weight: 1,
      choices: [
        { label: "Запустить 'План Руанда'! Платим миллионы", removeStatuses: ["uk_immigration_tensions"], effects: { resources: { money: -2000 }, sectors: { intel: 1 }, dovolstvo: 20 }, newsLines: { state: "Нелегалы отправляются в Африку", liberal: "Слепые траты на бесчеловечный план" } },
        { label: "Отменить план, это слишком дорого", effects: { dovolstvo: -20 } }
      ]
    },
    {
      id: "uk_falklands_rhetoric",
      speaker: "Глава ВМФ",
      situation: "Аргентина снова начала говорить о возврате Фолклендских островов.",
      weight: 1,
      choices: [
        { label: "Отправить туда авианосец для демонстрации силы!", effects: { resources: { money: -1000, influence: 150 }, sectors: { army: 1 }, dovolstvo: 15 }, newsLines: { state: "Мы защитим наших граждан везде", liberal: "Игра мускулами ради рейтингов" } },
        { label: "Предложить дипломатические переговоры", effects: { resources: { influence: -50 }, dovolstvo: -10 } }
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
      id: "in_it",
      speaker: "Глава IT-Корпорации",
      situation: "Наши ребята пишут код для всего мира, но серверы перегреваются.",
      requires: { statuses: ["it_kasty"] },
      weight: 1,
      choices: [
        {
          label: "Включить вентиляторы! Экспорт услуг превыше всего [СМИ: IT-хабы бьют рекорды прибыли]",
          effects: { resources: { money: 1000 }, sectors: { science: 1 } }
        },
        {
          label: "Отключить свет, пусть идут танцевать [СМИ: Внезапные выходные в Мумбаи]",
          effects: { dovolstvo: 15 }
        }
      ]
    },
    {
      id: "in_bollywood",
      speaker: "Режиссер Болливуда",
      situation: "Сценарий: коп на коне ловит летящую пулю руками, а потом все поют 40 минут.",
      requires: { statuses: ["bollywood"] },
      weight: 1,
      choices: [
        {
          label: "Снимаем! Это будет шедевр [СМИ: Новый блокбастер собрал миллиарды в прокате]",
          effects: { resources: { money: 500, influence: 100 }, dovolstvo: 20 }
        },
        {
          label: "Слишком реалистично, нужно больше танцев! [СМИ: Критики в восторге]",
          effects: { sectors: { smi: 1 } }
        }
      ]
    },
    {
      id: "in_pop",
      speaker: "Министр Демографии",
      situation: "Нас уже полтора миллиарда. Еды на всех не хватает.",
      requires: { statuses: ["overpopulation"] },
      weight: 1,
      choices: [
        {
          label: "Построить больше ферм [СМИ: Массовая распашка земель]",
          effects: { resources: { money: -500, food: 1500 } }
        },
        {
          label: "Отправить их работать на стройки [СМИ: Инфраструктурный бум]",
          effects: { sectors: { economy: 1 }, resources: { food: -500 } }
        }
      ]
    }
  ],
  japan: [
    {
      id: "jp_overwork",
      speaker: "Директор Корпорации",
      situation: "Сотрудники спят прямо в метро, они не успевают домой из-за переработок.",
      requires: { statuses: ["workaholics"] },
      weight: 1,
      choices: [
        {
          label: "Поставить кровати прямо в офисе! (Кароси) [СМИ: Производительность бьет рекорды]",
          effects: { sectors: { economy: 2 }, dovolstvo: -20 }
        },
        {
          label: "Заставить всех идти домой в 20:00 [СМИ: Невероятные реформы труда!]",
          effects: { dovolstvo: 20, sectors: { economy: -1 } }
        }
      ]
    },
    {
      id: "jp_anime",
      speaker: "Аниматор",
      situation: "Новое аниме про девочек-волшебниц и гигантских роботов захватило мир.",
      requires: { statuses: ["anime_softpower"] },
      weight: 1,
      choices: [
        {
          label: "Спонсировать второй сезон! [СМИ: Иностранцы массово учат наш язык]",
          effects: { resources: { money: -200, influence: 200 }, sectors: { smi: 1 } }
        },
        {
          label: "Продать мерч [СМИ: Миллиарды йен на пластиковых фигурках]",
          effects: { resources: { money: 1000 } }
        }
      ]
    },
    {
      id: "jp_aging",
      speaker: "Министр Медицины",
      situation: "Молодежи нет, одни старики. Зато робототехника на высоте.",
      requires: { statuses: ["aging_population"] },
      weight: 1,
      choices: [
        {
          label: "Заменить работяг на роботов! [СМИ: Киберпанк уже наступил]",
          effects: { sectors: { science: 2, economy: 1 }, resources: { money: -1000 } }
        },
        {
          label: "Увеличить пенсионный возраст до 80 лет [СМИ: Старики недовольны]",
          effects: { resources: { money: 500 }, dovolstvo: -15 }
        }
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
      id: "il_dome",
      speaker: "Генерал ЦАХАЛ",
      situation: "Опять летят самодельные ракеты из водопроводных труб.",
      requires: { statuses: ["iron_dome"] },
      weight: 1,
      choices: [
        {
          label: "Железный Купол собьет всё! [СМИ: Наше небо под надежной защитой]",
          effects: { resources: { money: -500 }, dovolstvo: 20, sectors: { army: 1 } }
        },
        {
          label: "Ответить ассиметричным ударом [СМИ: ВВС нанесли точечные удары]",
          effects: { resources: { influence: 50 }, sectors: { army: 2 } }
        }
      ]
    },
    {
      id: "il_startup",
      speaker: "Молодой Стартапер",
      situation: "Мы придумали приложение, которое продает песок в пустыню через блокчейн. Нам нужны шекели.",
      requires: { statuses: ["shekeli"] },
      weight: 1,
      choices: [
        {
          label: "Таки да, вложим госбюджет! [СМИ: Технологический сектор снова на хайпе]",
          effects: { resources: { money: 1500 }, sectors: { science: 1 } }
        },
        {
          label: "Продайте это американцам [СМИ: Очередной экзит-единорог]",
          effects: { resources: { money: 2000, influence: 50 } }
        }
      ]
    },
    {
      id: "il_mossad",
      speaker: "Агент Моссада",
      situation: "Мы нашли тайные чертежи ядерной программы соседа на флешке в кафе.",
      requires: { statuses: ["mossad"] },
      weight: 1,
      choices: [
        {
          label: "Скопировать и использовать для себя [СМИ: Наши ученые совершили 'чудо']",
          effects: { sectors: { intel: 1, science: 2 } }
        },
        {
          label: "Продать эту информацию в ООН за влияние [СМИ: Раскрыт заговор соседей!]",
          effects: { resources: { influence: 200 }, sectors: { intel: 1 } }
        }
      ]
    }
  ]
};

for (const [countryId, cards] of Object.entries(decks)) {
  const deck = {
    country: countryId,
    cards: cards
  };
  fs.writeFileSync(path.join(advisorsDir, countryId + '.json'), JSON.stringify(deck, null, 2));
}

console.log('Created 10 unique decks.');
