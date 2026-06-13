import type {
  PublicCountryView,
  PrivateCountryView,
  RoomSnapshot,
  PlayerInfo,
  WarView,
  YearProjection,
} from '@leaders/shared';
import { SECTOR_KEYS } from '@leaders/shared';
import {
  aggregateModifiers,
  battleWinChance,
  computeForbes,
  effectiveSector,
  questCompleted,
  sideOf,
  sideStrength,
  spySuccessChance,
  type GameContent,
  type WarState,
  type WorldState,
} from '@leaders/engine';
import type { RoomState } from './room.types.js';

/** Публично видимые типы статусов: законы, режимы, технологии, чудеса. Состояния — скрыты. */
const PUBLIC_STATUS_TYPES = new Set(['law', 'regime', 'tech', 'wonder']);

const SECTOR_NAMES: Record<string, string> = { economy: 'Экономика', science: 'Наука', army: 'Армия', smi: 'СМИ', intel: 'Разведка' };
const RES_NAMES: Record<string, string> = { money: 'Деньги', gold: 'Золото', food: 'Еда', influence: 'Влияние' };
const POP_NAMES: Record<string, string> = { rabotyagi: 'рабочие', umniki: 'умники', siloviki: 'силовики', mediyshchiki: 'медийщики', ministry: 'министры' };

function summarizeEffects(effects: Record<string, unknown> | undefined): string[] {
  if (!effects) return [];
  const lines: string[] = [];
  const res = effects['resources'] as Record<string, number> | undefined;
  if (res) for (const [k, v] of Object.entries(res)) lines.push(`${v > 0 ? '+' : ''}${v} ${RES_NAMES[k] ?? k}`);
  const sec = effects['sectors'] as Record<string, number> | undefined;
  if (sec) for (const [k, v] of Object.entries(sec)) lines.push(`${SECTOR_NAMES[k] ?? k} ${v > 0 ? '+' : ''}${v}`);
  const pop = effects['population'] as Record<string, number> | undefined;
  if (pop) for (const [k, v] of Object.entries(pop)) lines.push(`${v > 0 ? '+' : ''}${v} ${POP_NAMES[k] ?? k}`);
  const dov = effects['dovolstvo'] as number | undefined;
  if (dov != null) lines.push(`Довольство ${dov > 0 ? '+' : ''}${dov}`);
  const mod = effects['modifiers'] as Record<string, unknown> | undefined;
  if (mod) {
    if (mod['dovolstvoDrift'] != null) { const v = mod['dovolstvoDrift'] as number; lines.push(`Тренд довольства ${v > 0 ? '+' : ''}${v}/год`); }
    if (mod['inflationDelta'] != null) { const v = Math.round((mod['inflationDelta'] as number) * 100); lines.push(`Инфляция ${v > 0 ? '+' : ''}${v}%`); }
    if (mod['forbesLegacy'] != null) { const v = mod['forbesLegacy'] as number; lines.push(`Форбс-наследие +${v}`); }
    const sp = mod['special'] as Record<string, unknown> | undefined;
    if (sp?.['planEconomy']) lines.push('Плановая экономика');
    if (sp?.['oligarchy']) lines.push('Олигархия');
  }
  return lines;
}

/**
 * КРИТИЧНО (раздел 3 спеки): снапшот строится персонально.
 * Чужие реальные статы, реальный Форбс, тайные квесты сюда не попадают.
 */
export function buildSnapshot(
  room: RoomState,
  forPlayerId: string,
  content: GameContent,
): RoomSnapshot {
  const me = room.players.find((p) => p.playerId === forPlayerId) ?? null;

  const players: PlayerInfo[] = room.players.map((p) => ({
    playerId: p.playerId,
    name: p.name,
    countryId: p.countryId,
    countryName: p.countryId ? (content.countries.get(p.countryId)?.name ?? null) : null,
    connected: p.connected,
    isHost: p.isHost,
    isBot: p.isBot ?? false,
  }));

  const taken = new Set(room.players.map((p) => p.countryId).filter(Boolean) as string[]);
  const availableCountries = [...content.countries.values()]
    .filter((c) => !taken.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      description: (c as Record<string, unknown>).notes as string | undefined,
    }));

  let you: PrivateCountryView | null = null;
  const others: PublicCountryView[] = [];
  const myCountryId = me?.countryId ?? null;

  if (room.world) {
    for (const p of room.players) {
      if (!p.countryId) continue;
      const s = room.world.countries.get(p.countryId);
      if (!s) continue;
      const def = content.countries.get(p.countryId)!;

      if (p.playerId === forPlayerId) {
        const eff = aggregateModifiers(s, content);
        const smiIsLiberal =
          eff.special.forceLiberalMedia === true ||
          s.activeStatuses.some((id) => {
            const st = content.statuses.get(id);
            return st?.exclusiveGroup === 'regime' && Boolean((st as Record<string, unknown>).mediaIsLiberal);
          });
        const quest = s.questId ? content.quests.get(s.questId) : null;
        you = {
          countryId: p.countryId,
          countryName: def.name,
          resources: roundRec(s.resources),
          population: roundRec(s.population),
          sectors: Object.fromEntries(
            SECTOR_KEYS.map((k) => [k, effectiveSector(s, eff, k)]),
          ) as PrivateCountryView['sectors'],
          dovolstvo: Math.round(s.dovolstvo),
          sciencePoints: Math.round(s.sciencePoints),
          moneyRate: s.moneyRate,
          inflation: s.inflation,
          statuses: s.activeStatuses
            .map((id) => content.statuses.get(id))
            .filter((st) => !!st)
            .map((st) => ({ id: st.id, name: st.name, type: st.type, description: st.description })),
          quest: quest
            ? {
                id: quest.id,
                name: quest.name,
                description: quest.description,
                completed: questCompleted(quest, s, content),
              }
            : null,
          forbes: computeForbes(s, content),
          declaredForbes: s.declaredForbes,
          currentCard: room.currentCards[p.countryId] ?? null,
          callsLeft: room.callsLeft[p.countryId] ?? 0,
          spyOrdersLeft: room.spyOrdersLeft[p.countryId] ?? 0,
          cardsLeft: Math.max(0, (content.tunables.cabinet?.cardsPerTurn ?? 5) - (room.cardsChosenThisYear?.[p.countryId] ?? 0)),
          smiIsLiberal,
          auras: (s.externalAuras ?? []).map((a) => ({
            statusId: a.statusId,
            name: content.statuses.get(a.statusId)?.name ?? a.statusId,
            ownerCountryName:
              content.countries.get(a.ownerCountryId)?.name ?? a.ownerCountryId,
            description: content.statuses.get(a.statusId)?.description,
          })),
          projection: computeProjection(s, content),
          availableLaws: Array.from(content.statuses.values())
            .filter((st) => st.type === 'law' && !(me?.rejectedLaws ?? []).includes(st.id))
            .map((st) => {
              const isAdopted = s.activeStatuses.includes(st.id);
              const currentLevel = s.lawLevels?.[st.id] ?? 0;
              const hasLevels = st.levels && st.levels.length > 0;
              const maxLevel = hasLevels ? st.levels!.length - 1 : 0;
              const isMaxedOut = currentLevel >= maxLevel;
              
              if (isAdopted && (!hasLevels || isMaxedOut)) {
                return null;
              }

              const nextLevelIdx = isAdopted ? currentLevel + 1 : 0;
              const lvlData = hasLevels ? st.levels![nextLevelIdx] : undefined;
              const cost = lvlData?.cost ?? st.cost;
              const minMinistry = lvlData?.minMinistry ?? st.minMinistry;
              const effects = lvlData?.effects ?? st.effects;
              const upgradedThisYear = s.lawUpgradedYear?.[st.id] === room.world?.year;

              return {
                id: st.id,
                name: lvlData?.name ? `${st.name}: ${lvlData.name}` : st.name,
                description: lvlData?.description ?? st.description,
                cost,
                minMinistry,
                effectsSummary: summarizeEffects(effects as Record<string, unknown> | undefined),
                level: isAdopted ? currentLevel + 1 : 0, // for display (1-based if adopted, 0 if not? Let's just say "currentLevel" + 1 for display of what we are buying)
                maxLevel: hasLevels ? st.levels!.length : 1,
                upgradedThisYear,
                isAdopted,
              };
            })
            .filter(Boolean) as NonNullable<import('@leaders/shared').PrivateCountryView['availableLaws']>,
          budget: (room.sectorBudget?.[s.id] as Record<string, number>) ?? {},
          incomingCalls: [], // Заполним ниже
          outgoingCall: null, // Заполним ниже
        };
      } else {
        others.push({
          countryId: p.countryId,
          countryName: def.name,
          playerId: p.playerId,
          playerName: p.name,
          publicStatuses: s.activeStatuses
            .map((id) => content.statuses.get(id))
            .filter((st) => !!st && PUBLIC_STATUS_TYPES.has(st.type))
            .map((st) => ({ id: st!.id, name: st!.name, type: st!.type, description: st!.description })),
          declaredForbes: s.declaredForbes,
          sanctions: s.sanctions,
          wonders: s.wondersBuilt,
          spyChance: room.world && myCountryId && room.world.countries.has(myCountryId)
            ? Math.round(spySuccessChance(room.world.countries.get(myCountryId)!, s, content) * 100)
            : 0,
        });
      }
    }
  }

  let finalForbes: RoomSnapshot['finalForbes'] = null;
  if (room.phase === 'final' && room.world) {
    finalForbes = room.players
      .filter((p) => p.countryId)
      .map((p) => {
        const s = room.world!.countries.get(p.countryId!)!;
        const quest = s.questId ? content.quests.get(s.questId) : null;
        return {
          playerId: p.playerId,
          playerName: p.name,
          countryName: content.countries.get(p.countryId!)!.name,
          declared: s.declaredForbes,
          real: Math.round(computeForbes(s, content).total),
          questName: quest?.name ?? null,
          questDone: quest ? questCompleted(quest, s, content) : false,
        };
      })
      .sort((a, b) => b.real - a.real);
  }

  // войны: публичные факты всем, личные поля — только участнику.
  // КРИТИЧНО: WarState не сериализуется сырым — investedThisYear врага секретен.
  const wars: WarView[] = room.world
    ? room.world.wars.map((w) => buildWarView(w, room.world!, myCountryId, content))
    : [];

  const warVoteTally: Record<string, { just: number; unjust: number }> = {};
  for (const v of room.warVotes ?? []) {
    (warVoteTally[v.warId] ??= { just: 0, unjust: 0 })[v.verdict] += 1;
  }

  const realPlayers = room.players.filter((p) => !p.isBot);

  // Вычисляем очереди звонков для you, если он есть
  if (you) {
    const myRingingCalls = room.calls.filter(c => c.status === 'ringing' && c.toCountryId === you!.countryId);
    you.incomingCalls = myRingingCalls.map((c, idx) => ({
      callId: c.id,
      fromCountryId: c.fromCountryId,
      fromCountryName: content.countries.get(c.fromCountryId)?.name ?? c.fromCountryId,
      queuePosition: idx + 1
    }));

    const myOutgoing = room.calls.find(c => c.status === 'ringing' && c.fromCountryId === you!.countryId);
    if (myOutgoing) {
      const allTargetCalls = room.calls.filter(c => c.status === 'ringing' && c.toCountryId === myOutgoing.toCountryId);
      const queuePosition = allTargetCalls.findIndex(c => c.id === myOutgoing.id) + 1;
      const isBusy = room.calls.some(c => c.status === 'active' && (c.fromCountryId === myOutgoing.toCountryId || c.toCountryId === myOutgoing.toCountryId));
      you.outgoingCall = {
        callId: myOutgoing.id,
        toCountryId: myOutgoing.toCountryId,
        toCountryName: content.countries.get(myOutgoing.toCountryId)?.name ?? myOutgoing.toCountryId,
        isBusy,
        queuePosition
      };
    }
  }

  return {
    roomCode: room.code,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    pause: {
      paused: room.paused,
      waitingFor: room.players.filter((p) => !p.connected).map((p) => p.name),
      resumeDeadline: room.resumeDeadline,
      manual: room.manualPause ?? false,
    },
    waitingContinue: room.waitingContinue ?? false,
    readyCount: (room.readyPlayerIds ?? []).length,
    readyTotal: realPlayers.length,
    year: room.world?.year ?? 0,
    totalYears: content.tunables.game.years,
    players,
    availableCountries,
    you,
    others,
    currentSpeakerId: room.speakerOrder[room.speakerIdx] ?? null,
    unLayout: room.unLayout ?? 'auto',
    offers: me?.countryId
      ? room.tradeOffers.filter(
          (o) => o.fromCountryId === me.countryId || o.toCountryId === me.countryId,
        )
      : [],
    // обещания: публичные — всем, приватные — только сторонам (фича 11)
    promises: (room.promises ?? []).filter(
      (p) => p.public || p.fromCountryId === myCountryId || p.toCountryId === myCountryId,
    ),
    // личные разведдонесения (reveal + прослушка звонков, фича 10)
    spyIntel: (room.intel?.[forPlayerId] ?? []).map((r) => ({
      year: r.year,
      targetCountryName: content.countries.get(r.targetCountryId)?.name ?? r.targetCountryId,
      kind: r.kind ?? 'reveal',
      data: r.data,
      calls: r.calls?.map((c) => ({
        withCountryName: content.countries.get(c.withCountryId)?.name ?? c.withCountryId,
        year: c.year,
        durationSec: c.durationSec,
        ongoing: c.ongoing,
      })),
    })),
    // активная прослушка: цель сейчас на связи → клиент скрыто подключится (фича 12)
    wiretap: (() => {
      for (const w of room.wiretaps ?? []) {
        if (w.spyPlayerId !== forPlayerId) continue;
        if (w.year !== room.world?.year) continue;
        const call = room.calls.find(
          (c) => c.status === 'active' && (c.fromCountryId === w.targetCountryId || c.toCountryId === w.targetCountryId),
        );
        if (!call) continue;
        const withId = call.fromCountryId === w.targetCountryId ? call.toCountryId : call.fromCountryId;
        return {
          callId: call.id,
          targetCountryName: content.countries.get(w.targetCountryId)?.name ?? w.targetCountryId,
          withCountryName: content.countries.get(withId)?.name ?? withId,
        };
      }
      return null;
    })(),
    news:
      room.news && room.phase.startsWith('un_')
        ? Object.entries(room.news).map(([countryId, lines]) => ({
            countryId,
            countryName: content.countries.get(countryId)?.name ?? countryId,
            lines,
            audioUrl: room.newsAssets[countryId]?.audioUrl ?? null,
            imageUrl: room.newsAssets[countryId]?.imageUrl ?? null,
          }))
        : null,
    voteTally: (() => {
      const tally: Record<string, { sanction: number; support: number }> = {};
      for (const v of room.votes) {
        (tally[v.targetCountryId] ??= { sanction: 0, support: 0 })[v.kind] += 1;
      }
      return tally;
    })(),
    wars,
    warVoteTally,
    yearReport:
      room.phase === 'year_summary' && myCountryId
        ? (room.yearReports?.[myCountryId] ?? null)
        : null,
    lastResults:
      room.lastTickEvents && (room.phase === 'results' || room.phase === 'final')
        ? Object.entries(room.lastTickEvents).map(([countryId, lines]) => ({
            countryId,
            countryName: content.countries.get(countryId)?.name ?? countryId,
            lines,
          }))
        : null,
    finalForbes,
  };
}

/**
 * Война глазами игрока. Публично: стороны, обоснование, счёт, вердикт.
 * Участнику добавляются его вложения и оценка шанса (своя сторона — полная сила
 * с вложениями; враг — публичная оценка без скрытых статусов и вложений).
 */
function buildWarView(
  w: WarState,
  world: WorldState,
  myCountryId: string | null,
  content: GameContent,
): WarView {
  const names = (ids: string[]) => ids.map((id) => content.countries.get(id)?.name ?? id);
  const view: WarView = {
    id: w.id,
    startedYear: w.startedYear,
    casusBelli: w.casusBelli,
    attacker: { countryIds: w.attacker.countryIds, countryNames: names(w.attacker.countryIds), score: w.attacker.score },
    defender: { countryIds: w.defender.countryIds, countryNames: names(w.defender.countryIds), score: w.defender.score },
    status: w.status,
    unVerdict: w.unVerdict,
    endedYear: w.endedYear,
    winnerSide: w.winnerSide,
  };

  const mySide = myCountryId ? sideOf(w, myCountryId) : null;
  if (mySide && myCountryId) {
    view.yourSide = mySide;
    view.yourInvestedThisYear = w[mySide].investedThisYear[myCountryId] ?? 0;
    if (w.status === 'active') {
      const my = sideStrength(world, w[mySide], content, { hidden: true, invest: true });
      const enemySide = mySide === 'attacker' ? 'defender' : 'attacker';
      const enemy = sideStrength(world, w[enemySide], content, { hidden: false, invest: false });
      view.estimatedWinChancePct = Math.round((battleWinChance(my, enemy, content) * 100) / 5) * 5;
    }
    if (w.status === 'ended' && w.winnerSide && w[w.winnerSide].countryIds[0] === myCountryId) {
      view.victorPointsRemaining = w.victorPointsRemaining;
    }
  }
  return view;
}

function roundRec<K extends string>(rec: Record<K, number>): Record<K, number> {
  return Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k, Math.round(v as number)]),
  ) as Record<K, number>;
}

function computeProjection(
  s: import('@leaders/engine').CountryState,
  content: GameContent,
): YearProjection {
  const t = content.tunables;
  const eff = aggregateModifiers(s, content);

  const totalPop = Object.values(s.population).reduce((a, b) => a + b, 0);

  const scienceMult =
    effectiveSector(s, eff, 'science') * t.economy.scienceMultPerLevel + eff.scienceMult;
  const economyFactor = 1 + effectiveSector(s, eff, 'economy') * t.production.economyIncomePerLevel;
  const upkeepMult = typeof eff.special?.ministerUpkeepMult === 'number' ? (eff.special.ministerUpkeepMult as number) : 1;

  const moneyIncome =
    s.population.rabotyagi *
    t.production.moneyPerRabotyaga *
    eff.outputMult.rabotyagi *
    (1 + scienceMult) *
    economyFactor;
  const ministerCost = s.population.ministry * t.economy.ministerUpkeep * upkeepMult;
  const netMoneyIncome = moneyIncome - ministerCost;

  const foodIncome =
    s.population.rabotyagi *
    t.production.foodPerRabotyaga *
    eff.outputMult.rabotyagi *
    (1 + scienceMult) *
    economyFactor;
  const foodConsumption = totalPop * t.economy.foodPerCapita * eff.foodPerCapitaMult;
  const foodBalance = foodIncome - foodConsumption;

  const immune = Boolean(eff.special?.inflationImmunity);
  const inflationRaw = Math.max(
    0,
    t.economy.inflationBase +
      s.sanctions * t.economy.inflationPerSanction -
      effectiveSector(s, eff, 'economy') * t.economy.inflationEconomyRelief +
      (eff.inflationDelta ?? 0),
  );
  const inflationPct = immune ? 0 : inflationRaw * 100;

  const surplusPct = foodConsumption > 0 ? Math.max(0, foodBalance) / foodConsumption : 0;
  const dovolstvoDelta =
    (surplusPct * 10) * t.dovolstvo.foodSurplusCoef +
    (inflationRaw > 0 ? -(inflationRaw * 100 / 10) * t.dovolstvo.inflationPenalty : 0);

  const scienceGain =
    s.population.umniki * t.production.sciencePerUmnik * eff.outputMult.umniki * (1 + scienceMult);

  const coupRisk = s.dovolstvo + dovolstvoDelta < 20;

  return {
    moneyIncome: Math.round(netMoneyIncome),
    foodBalance: Math.round(foodBalance),
    inflationPct: Math.round(inflationPct * 10) / 10,
    dovolstvoDelta: Math.round(dovolstvoDelta),
    scienceGain: Math.round(scienceGain),
    coupRisk,
  };
}
