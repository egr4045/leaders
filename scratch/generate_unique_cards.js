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
    }
  ],
  usa: [
    {
      id: "us_fed",
      speaker: "Глава ФРС",
      situation: "Госдолг пробил очередной потолок, рынки в панике.",
      requires: { statuses: ["fed_printer"] },
      weight: 1,
      choices: [
        {
          label: "Включайте печатный станок! [СМИ: ФРС спасает экономику количественным смягчением]",
          effects: { resources: { money: 2000 }, modifiers: { inflationDelta: 0.05 } }
        },
        {
          label: "Урежем социалку [СМИ: Жесткие меры экономии возмутили общество]",
          effects: { resources: { money: 500 }, dovolstvo: -20 }
        }
      ]
    },
    {
      id: "us_movie",
      speaker: "Голливудский Режиссер",
      situation: "Мы сняли новый супергеройский фильм про то, какие мы молодцы.",
      requires: { statuses: ["hollywood_softpower"] },
      weight: 1,
      choices: [
        {
          label: "Вложить миллионы в промо по всему миру [СМИ: Новый блокбастер бьет рекорды]",
          effects: { resources: { money: -500, influence: 200 }, sectors: { smi: 1 } }
        },
        {
          label: "Фильм провалился из-за повестки [СМИ: Зрители устали от однообразия]",
          effects: { dovolstvo: -5 }
        }
      ]
    },
    {
      id: "us_military",
      speaker: "Лоббист Пентагона",
      situation: "Где-то на Ближнем Востоке нашли нефть. Ой, то есть отсутствие демократии.",
      requires: { statuses: ["military_industrial_complex"] },
      weight: 1,
      choices: [
        {
          label: "Отправить авианосцы! (ВПК получит заказы) [СМИ: США несут свободу и демократию!]",
          effects: { resources: { money: 1000, influence: -100 }, sectors: { army: 1 } }
        },
        {
          label: "Ограничиться осуждением в Твиттере [СМИ: Слабая внешняя политика Президента]",
          effects: { resources: { influence: -50 }, dovolstvo: -10 }
        }
      ]
    }
  ],
  china: [
    {
      id: "cn_credit",
      speaker: "Партийный Куратор",
      situation: "Кто-то в соцсетях сравнил нашего Лидера с Винни-Пухом.",
      requires: { statuses: ["social_credit"] },
      weight: 1,
      choices: [
        {
          label: "Снизить им социальный рейтинг до нуля! [СМИ: Очередные вредители пойманы партией]",
          effects: { dovolstvo: 10, resources: { influence: 50 } }
        },
        {
          label: "Удалить все упоминания Винни-Пуха из интернета [СМИ: Технические работы в сети]",
          effects: { sectors: { intel: 1 } }
        }
      ]
    },
    {
      id: "cn_factory",
      speaker: "Директор Завода",
      situation: "Работяги жалуются на 14-часовой рабочий день. Хотят 12-часовой.",
      requires: { statuses: ["world_factory"] },
      weight: 1,
      choices: [
        {
          label: "Выдать всем двойную миску риса и отправить работать [СМИ: Новые рекорды производства!]",
          effects: { resources: { food: -500, money: 1000 }, sectors: { economy: 1 } }
        },
        {
          label: "Разрешить спать по 6 часов [СМИ: Партия заботится о народе]",
          effects: { dovolstvo: 15, sectors: { economy: -1 } }
        }
      ]
    },
    {
      id: "cn_panda",
      speaker: "Министр Дипломатии",
      situation: "Мы можем сдать в аренду пару Панд соседней стране.",
      weight: 1,
      choices: [
        {
          label: "Панда-дипломатия в действии! [СМИ: Китайские панды умиляют мир]",
          effects: { resources: { money: 500, influence: 100 } }
        },
        {
          label: "Панды нужны нам самим [СМИ: Зоопарк Пекина пополнился новыми жильцами]",
          effects: { dovolstvo: 5 }
        }
      ]
    }
  ],
  dprk: [
    {
      id: "kp_nuke",
      speaker: "Генерал",
      situation: "Южные соседи снова проводят учения. Предлагаю запустить ракету в сторону моря.",
      requires: { statuses: ["red_button"] },
      weight: 1,
      choices: [
        {
          label: "Пуск! Пусть боятся! [СМИ: Очередное успешное испытание оружия возмездия]",
          effects: { resources: { money: -200, influence: 150 }, dovolstvo: 20 }
        },
        {
          label: "У нас нет денег на топливо [СМИ: Армия переведена на сбор урожая]",
          effects: { resources: { food: 500 }, sectors: { army: -1 } }
        }
      ]
    },
    {
      id: "kp_chuchhe",
      speaker: "Пропагандист",
      situation: "Западные СМИ говорят, что мы едим траву.",
      requires: { statuses: ["chuchhe"] },
      weight: 1,
      choices: [
        {
          label: "Заявить, что трава очень полезна (Чучхе!) [СМИ: Новая диета Вождя оздоровит нацию]",
          effects: { dovolstvo: 10, modifiers: { foodPerCapitaMult: -0.1 } }
        },
        {
          label: "Отправить хакеров взломать их СМИ [СМИ: Неизвестные хакеры обвалили серверы клеветников]",
          effects: { sectors: { intel: 1 } }
        }
      ]
    },
    {
      id: "kp_leader",
      speaker: "Министр Обороны",
      situation: "Вождь приехал на завод и дал ценные указания, глядя на станок.",
      requires: { statuses: ["supreme_leader"] },
      weight: 1,
      choices: [
        {
          label: "Записать каждое слово в блокнот! [СМИ: Мудрость Вождя повысила надои стали!]",
          effects: { sectors: { economy: 1 }, dovolstvo: 10 }
        },
        {
          label: "Раздать рабочим портреты [СМИ: Народ ликует!]",
          effects: { dovolstvo: 20 }
        }
      ]
    }
  ],
  uk: [
    {
      id: "uk_brexit",
      speaker: "Премьер-Министр",
      situation: "Мы вышли из Союза, но теперь у нас нет водителей фур.",
      requires: { statuses: ["brexit_legacy"] },
      weight: 1,
      choices: [
        {
          label: "Привлечь армию для доставки бензина [СМИ: Армия спасает логистику страны]",
          effects: { sectors: { army: -1, economy: 1 }, dovolstvo: -10 }
        },
        {
          label: "Выдать визы мигрантам (отмена принципов) [СМИ: Правительство дало заднюю]",
          effects: { resources: { money: 500 }, dovolstvo: -20 }
        }
      ]
    },
    {
      id: "uk_oligarchs",
      speaker: "Мэр Лондона",
      situation: "Еще один олигарх с Востока хочет купить футбольный клуб и особняк.",
      requires: { statuses: ["financial_hub"] },
      weight: 1,
      choices: [
        {
          label: "Добро пожаловать в Лондонград! [СМИ: Инвестиции текут рекой]",
          effects: { resources: { money: 1000 }, sectors: { economy: 1 } }
        },
        {
          label: "Мы вводим санкции и забираем клуб! [СМИ: Борьба с грязными деньгами!]",
          effects: { resources: { money: 500, influence: 100 } }
        }
      ]
    },
    {
      id: "uk_tea",
      speaker: "Секретарь Кабинета",
      situation: "Кризис или не кризис, а время 5 o'clock. Пора пить чай.",
      requires: { statuses: ["tea_5_oclock"] },
      weight: 1,
      choices: [
        {
          label: "Боже храни Корону! Пьем чай. [СМИ: Нация сохраняет спокойствие]",
          effects: { dovolstvo: 25, resources: { money: -100 } }
        },
        {
          label: "Отменить чай, все работать! [СМИ: Правительство сошло с ума!]",
          effects: { sectors: { economy: 1 }, dovolstvo: -30 }
        }
      ]
    }
  ],
  germany: [
    {
      id: "de_green",
      speaker: "Министр Экологии",
      situation: "Угольные станции загрязняют воздух. Нужно закрыть их и поставить ветряки.",
      requires: { statuses: ["eco_bureaucracy"] },
      weight: 1,
      choices: [
        {
          label: "Закрыть заводы! Спасем экологию [СМИ: Зеленая революция в действии]",
          effects: { resources: { influence: 150 }, sectors: { economy: -2, science: 1 } }
        },
        {
          label: "Нам нужна дешевая энергия для заводов! [СМИ: Эко-активисты приклеили себя к асфальту]",
          effects: { sectors: { economy: 2 }, dovolstvo: -15 }
        }
      ]
    },
    {
      id: "de_locomotive",
      speaker: "Еврокомиссар",
      situation: "Южные страны Союза снова в долгах. Просят скинуться им на помощь.",
      requires: { statuses: ["eu_locomotive"] },
      weight: 1,
      choices: [
        {
          label: "Мы же локомотив... Выделить кредиты. [СМИ: Мы снова спасаем Европу]",
          effects: { resources: { money: -1000, influence: 200 } }
        },
        {
          label: "Пусть выкручиваются сами! [СМИ: Берлин показал зубы]",
          effects: { resources: { money: 1000, influence: -150 } }
        }
      ]
    },
    {
      id: "de_ordnung",
      speaker: "Главный Бюрократ",
      situation: "Орднунг мусс зайн. Нужно заполнить форму 38-Б для постройки завода.",
      requires: { statuses: ["ordnung"] },
      weight: 1,
      choices: [
        {
          label: "Заполнить по всем правилам (долго, но качественно) [СМИ: Немецкое качество!]",
          effects: { sectors: { science: 1 }, resources: { money: -200 } }
        },
        {
          label: "Упростить бюрократию [СМИ: Наконец-то реформы!]",
          effects: { sectors: { economy: 1 }, dovolstvo: 10 }
        }
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
