import { z } from 'zod';

/**
 * Все настраиваемые коэффициенты игры. Любое поле можно опустить в
 * content/tunables.json — подставится дефолт.
 */
export const TunablesSchema = z
  .object({
    game: z
      .object({
        /** количество лет (раундов) в партии */
        years: z.number().int().min(1).default(5),
        playersMin: z.number().int().default(6),
        playersMax: z.number().int().default(9),
      })
      .default({}),
    timers: z
      .object({
        /** фаза Кабинета, секунд (≈10 минут = 1 год) */
        cabinetSeconds: z.number().default(600),
        /** показ сводки новостей ООН, секунд */
        unSummarySeconds: z.number().default(30),
        /** комментарий каждого игрока в ООН, секунд */
        unCommentSecondsPerPlayer: z.number().default(30),
        /** свободные дебаты в ООН, секунд */
        unDebateSeconds: z.number().default(120),
        /** голосование ООН, секунд */
        unVoteSeconds: z.number().default(60),
        /** показ итогов года, секунд */
        resultsSeconds: z.number().default(45),
        /** личная сводка начала года, секунд */
        yearSummarySeconds: z.number().default(90),
        /** максимальная пауза на реконнект, секунд */
        reconnectPauseSecondsMax: z.number().default(120),
      })
      .default({}),
    diplomacy: z
      .object({
        /** лимит инициированных звонков за год */
        callsPerYear: z.number().int().default(2),
      })
      .default({}),
    economy: z
      .object({
        /** потребление еды на душу населения в год */
        foodPerCapita: z.number().default(1),
        /** базовая инфляция в год (доля) */
        inflationBase: z.number().default(0.03),
        /** прирост инфляции на каждые 100 напечатанных денег */
        inflationPerPrinted100: z.number().default(0.01),
        /** прирост инфляции от санкций ООН (за каждую активную) */
        inflationPerSanction: z.number().default(0.02),
        /** снижение инфляции за каждый уровень Экономики */
        inflationEconomyRelief: z.number().default(0.004),
        /** содержание одного министра в год, денег */
        ministerUpkeep: z.number().default(3),
        /** науч. множитель за уровень Науки (доля к выработке) */
        scienceMultPerLevel: z.number().default(0.06),
      })
      .default({}),
    production: z
      .object({
        /** базовая выработка денег одним работягой в год */
        moneyPerRabotyaga: z.number().default(1),
        /** базовая добыча еды одним работягой в год */
        foodPerRabotyaga: z.number().default(1.2),
        /** очки науки с одного умника в год */
        sciencePerUmnik: z.number().default(1),
        /** влияние с одного медийщика в год */
        influencePerMediyshchik: z.number().default(0.5),
        /** очков науки на +1 уровень сектора Наука */
        sciencePerSectorLevel: z.number().default(100),
        /** множитель дохода за уровень Экономики: ×(1 + level·coef) */
        economyIncomePerLevel: z.number().default(0.08),
        /** множитель влияния за уровень СМИ: ×(1 + level·coef) */
        smiInfluencePerLevel: z.number().default(0.1),
      })
      .default({}),
    dovolstvo: z
      .object({
        start: z.number().default(60),
        /** + за избыток еды (на каждые 10% избытка) */
        foodSurplusCoef: z.number().default(1),
        /** + за уровень СМИ */
        smiCoef: z.number().default(1.5),
        /** + за богатство (на каждые 100 денег на душу) */
        wealthCoef: z.number().default(0.5),
        /** − при голоде */
        hungerPenalty: z.number().default(15),
        /** − на каждые 10% годовой инфляции */
        inflationPenalty: z.number().default(3),
        /** − за каждое репрессивное действие за год */
        repressionPenalty: z.number().default(5),
        /** ежегодное «привыкание»: народ принимает хорошее как должное */
        baselineDecay: z.number().default(4),
      })
      .default({}),
    coup: z
      .object({
        /** порог довольства, ниже которого возможен переворот */
        dovolstvoThreshold: z.number().default(15),
        /** минимальная доля силовиков в населении, страхующая режим */
        silovikiMinShare: z.number().default(0.05),
        /** какая доля казны пропадает при перевороте */
        moneyPenalty: z.number().default(0.5),
      })
      .default({}),
    population: z
      .object({
        /** базовый прирост населения в год (доля) */
        baseGrowth: z.number().default(0.03),
        /** убыль при голоде (доля) */
        hungerDecline: z.number().default(0.08),
        /** эмиграция умников при репрессиях (доля за каждое репрессивное действие) */
        umnikiFlightPerRepression: z.number().default(0.05),
      })
      .default({}),
    un: z
      .object({
        /** цена одного голоса в ООН, влияния */
        voteCostInfluence: z.number().default(10),
        /** поддержка снимает санкцию; если санкций нет — даёт влияние */
        supportInfluenceBonus: z.number().default(10),
      })
      .default({}),
    forbes: z
      .object({
        /** вес золота против денег (золото стабильно) */
        goldWeight: z.number().default(3),
        /** общий вес «легаси»-вкладов статусов */
        legacyWeight: z.number().default(1),
      })
      .default({}),
    spy: z
      .object({
        /** базовый шанс успеха операции при равной разведке */
        baseSuccess: z.number().default(0.5),
        /** ± к шансу за каждый уровень разницы Разведка атакующего vs защита цели */
        perLevelDelta: z.number().default(0.08),
        /** во сколько защита цели весит СМИ относительно Разведки */
        defenseSmiWeight: z.number().default(0.5),
        /** лимит шпионских операций за год */
        ordersPerYear: z.number().int().default(2),
      })
      .default({}),
    cabinet: z
      .object({
        /** максимум карточек советника за один раунд */
        cardsPerTurn: z.number().int().default(5),
      })
      .default({}),
    budget: z
      .object({
        /** накопленных ден. инвестиций для роста сектора на 1 уровень */
        investPerLevel: z.number().default(1000),
      })
      .default({}),
    war: z
      .object({
        /** цена объявления войны, влияния */
        declareCostInfluence: z.number().default(5),
        /** вклад уровня Армии в силу стороны */
        armyWeightPerLevel: z.number().default(10),
        /** вклад одного силовика в силу стороны */
        silovikiWeight: z.number().default(0.05),
        /** + к силе за каждые 100 вложенных денег */
        investStrengthPer100: z.number().default(2),
        /** ± к шансу победы в битве за каждый пункт разницы сил */
        battlePerPointDelta: z.number().default(0.01),
        /** разрыв счёта войны для решающей победы */
        decisiveScoreGap: z.number().int().default(3),
        /** очков победителя за каждый пункт итогового разрыва */
        victorPointsPerScoreGap: z.number().default(10),
        /** ежегодные военные расходы: доля казны каждого участника */
        upkeepMoneyPct: z.number().default(0.05),
        /** потери силовиков победителя битвы за год (доля) */
        attritionWinnerPct: z.number().default(0.03),
        /** потери силовиков проигравшего битву за год (доля) */
        attritionLoserPct: z.number().default(0.06),
        /** усталость от войны: − довольства каждому участнику в год */
        warWearinessDovolstvo: z.number().default(3),
        /** санкций агрессору, если ООН признала войну несправедливой */
        unjustSanctions: z.number().int().default(1),
        /** цена награды «Грабёж», очков победителя */
        lootCostPoints: z.number().default(10),
        /** доля денег/золота/еды проигравшего при грабеже */
        lootPct: z.number().default(0.2),
        /** цена награды «Контрибуция», очков победителя */
        kontributsiyaCostPoints: z.number().default(15),
        /** сколько лет проигравший носит статус «Побеждённый» */
        kontributsiyaYears: z.number().int().default(3),
        /** разовая дань: доля денег проигравшего */
        kontributsiyaTributePct: z.number().default(0.15),
        /** форбс-легаси победителю за контрибуцию */
        kontributsiyaWinnerForbes: z.number().default(50),
        /** штраф влияния союзникам проигравшей стороны */
        allyDefeatInfluencePenalty: z.number().default(15),
      })
      .default({}),
  })
  .strict()
  .default({});

export type Tunables = z.infer<typeof TunablesSchema>;
