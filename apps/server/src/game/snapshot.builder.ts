import type {
  PublicCountryView,
  PrivateCountryView,
  RoomSnapshot,
  PlayerInfo,
  YearProjection,
} from '@leaders/shared';
import { SECTOR_KEYS } from '@leaders/shared';
import {
  aggregateModifiers,
  computeForbes,
  effectiveSector,
  questCompleted,
  type GameContent,
} from '@leaders/engine';
import type { RoomState } from './room.types.js';

/** Публично видимые типы статусов: законы, режимы, технологии, чудеса. Состояния — скрыты. */
const PUBLIC_STATUS_TYPES = new Set(['law', 'regime', 'tech', 'wonder']);

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

  if (room.world) {
    for (const p of room.players) {
      if (!p.countryId) continue;
      const s = room.world.countries.get(p.countryId);
      if (!s) continue;
      const def = content.countries.get(p.countryId)!;

      if (p.playerId === forPlayerId) {
        const eff = aggregateModifiers(s, content);
        const smiIsLiberal = s.activeStatuses.some((id) => {
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
            .map((st) => ({ id: st.id, name: st.name, type: st.type })),
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
          cardsLeft: Math.max(0, (content.tunables.cabinet?.cardsPerTurn ?? 5) - (room.cardsChosenThisYear?.[p.countryId] ?? 0)),
          smiIsLiberal,
          projection: computeProjection(s, content),
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
            .map((st) => ({ id: st!.id, name: st!.name, type: st!.type })),
          declaredForbes: s.declaredForbes,
          sanctions: s.sanctions,
          wonders: s.wondersBuilt,
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

  const realPlayers = room.players.filter((p) => !p.isBot);
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
