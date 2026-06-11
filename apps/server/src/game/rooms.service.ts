import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import { SocketEvents, type GamePhase } from '@leaders/shared';
import {
  applyChoice,
  applyTrade,
  createWorld,
  drawCard,
  makeRng,
  resolveSpyAction,
  serializeWorld,
  deserializeWorld,
  tick,
  computeForbes,
  buildWonder,
  TradeError,
  type SpyActionKind,
} from '@leaders/engine';
import type { TradeSidePayload } from '@leaders/shared';
import { ContentService } from '../content.service.js';
import { RedisService } from '../redis.service.js';
import { MlService } from '../ml/ml.service.js';
import { buildSnapshot } from './snapshot.builder.js';
import type { RoomState, RoomTimers, RoomPlayer } from './room.types.js';

const ROOM_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private rooms = new Map<string, RoomState>();
  private timers = new Map<string, RoomTimers>();
  private server: Server | null = null;

  constructor(
    private readonly contentService: ContentService,
    private readonly redis: RedisService,
    private readonly ml: MlService,
  ) {
    // готовые ассеты диктора прилетают асинхронно — раскладываем по комнатам
    this.ml.onDone(({ job, assetUrl }) => {
      const room = this.rooms.get(job.roomCode);
      if (!room || !room.world || room.world.year !== job.year) return;
      const slot = (room.newsAssets[job.countryId] ??= {});
      if (job.type === 'tts') slot.audioUrl = assetUrl;
      else slot.imageUrl = assetUrl;
      this.persist(room);
      this.broadcast(room);
    });
  }

  setServer(server: Server) {
    this.server = server;
  }

  private get content() {
    return this.contentService.content;
  }

  // ---------- лобби ----------

  createRoom(name: string): { room: RoomState; player: RoomPlayer } {
    const code = this.genCode();
    const player = this.makePlayer(name, true);
    const room: RoomState = {
      code,
      phase: 'lobby',
      players: [player],
      world: null,
      phaseEndsAt: null,
      remainingMs: null,
      paused: false,
      resumeDeadline: null,
      currentCards: {},
      callsLeft: {},
      spyOrdersLeft: {},
      spyOrders: [],
      intel: {},
      tradeOffers: [],
      choicesThisYear: {},
      votes: [],
      news: null,
      newsAssets: {},
      calls: [],
      lastTickEvents: null,
      speakerOrder: [],
      speakerIdx: 0,
      rngNonce: 0,
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.timers.set(code, {});
    this.persist(room);
    return { room, player };
  }

  joinRoom(code: string, name: string, token?: string): { room: RoomState; player: RoomPlayer } {
    const room = this.mustRoom(code);

    // реконнект по токену
    if (token) {
      const existing = room.players.find((p) => p.token === token);
      if (existing) return { room, player: existing };
    }
    if (room.phase !== 'lobby') throw new Error('Партия уже идёт — входить поздно');
    if (room.players.length >= this.content.tunables.game.playersMax) {
      throw new Error('Комната полна');
    }
    if (room.players.some((p) => p.name === name)) throw new Error('Имя занято');

    const player = this.makePlayer(name, false);
    room.players.push(player);
    this.persist(room);
    return { room, player };
  }

  pickCountry(code: string, playerId: string, countryId: string) {
    const room = this.mustRoom(code);
    if (room.phase !== 'lobby') throw new Error('Страну можно выбрать только в лобби');
    if (!this.content.countries.has(countryId)) throw new Error('Нет такой страны');
    if (room.players.some((p) => p.countryId === countryId && p.playerId !== playerId)) {
      throw new Error('Страна занята');
    }
    this.mustPlayer(room, playerId).countryId = countryId;
    this.persist(room);
  }

  leaveRoom(code: string, playerId: string) {
    const room = this.mustRoom(code);
    if (room.phase !== 'lobby') throw new Error('Из идущей партии не выходят (раздел 13)');
    room.players = room.players.filter((p) => p.playerId !== playerId);
    if (room.players.length === 0) {
      this.dropRoom(code);
      return;
    }
    if (!room.players.some((p) => p.isHost)) room.players[0]!.isHost = true;
    this.persist(room);
  }

  startGame(code: string, playerId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Старт — только у хоста');
    if (room.phase !== 'lobby') throw new Error('Уже идёт');
    const minPlayers = Number(process.env.PLAYERS_MIN ?? this.content.tunables.game.playersMin);
    if (room.players.length < minPlayers) {
      throw new Error(`Нужно минимум ${minPlayers} игроков`);
    }

    // раздаём страны тем, кто не выбрал
    const taken = new Set(room.players.map((p) => p.countryId).filter(Boolean) as string[]);
    const free = [...this.content.countries.keys()].filter((id) => !taken.has(id));
    for (const p of room.players) {
      if (!p.countryId) p.countryId = free.shift() ?? null;
      if (!p.countryId) throw new Error('Не хватило стран');
    }

    // тайные квесты — случайно каждому
    const seed = Date.now() % 2147483647;
    const rng = makeRng(seed);
    const questIds = [...this.content.quests.keys()];
    const questByCountry: Record<string, string | null> = {};
    for (const p of room.players) {
      questByCountry[p.countryId!] =
        questIds.length > 0 ? questIds[Math.floor(rng() * questIds.length)]! : null;
    }

    room.world = createWorld(
      this.content,
      room.players.map((p) => p.countryId!),
      seed,
      questByCountry,
    );
    this.enterPhase(room, 'cabinet');
  }

  // ---------- фазовый автомат ----------

  /** Длительность фазы в мс; null = без таймера. */
  private phaseDuration(room: RoomState, phase: GamePhase): number | null {
    const t = this.content.tunables.timers;
    switch (phase) {
      case 'cabinet':
        return t.cabinetSeconds * 1000;
      case 'un_summary':
        return t.unSummarySeconds * 1000;
      case 'un_comments':
        return t.unCommentSecondsPerPlayer * 1000; // на одного выступающего
      case 'un_debate':
        return t.unDebateSeconds * 1000;
      case 'un_vote':
        return t.unVoteSeconds * 1000;
      case 'results':
        return t.resultsSeconds * 1000;
      default:
        return null;
    }
  }

  enterPhase(room: RoomState, phase: GamePhase) {
    room.phase = phase;
    this.logger.log(`[${room.code}] фаза → ${phase} (год ${room.world?.year ?? '-'})`);

    if (phase === 'cabinet') {
      // новый год: лимиты, первая карта каждому
      for (const p of room.players) {
        if (!p.countryId || !room.world) continue;
        room.callsLeft[p.countryId] = this.content.tunables.diplomacy.callsPerYear;
        room.spyOrdersLeft[p.countryId] = this.content.tunables.spy.ordersPerYear;
        this.dealCard(room, p.countryId);
      }
    }
    if (phase === 'un_comments') {
      room.speakerOrder = room.players.map((p) => p.playerId);
      room.speakerIdx = 0;
    } else if (phase !== 'cabinet') {
      room.speakerOrder = [];
      room.speakerIdx = 0;
    }

    this.armPhaseTimer(room);
    this.persist(room);
    this.broadcast(room);
  }

  private armPhaseTimer(room: RoomState, overrideMs?: number) {
    const timers = this.timers.get(room.code)!;
    if (timers.phaseTimer) clearTimeout(timers.phaseTimer);
    const ms = overrideMs ?? this.phaseDuration(room, room.phase);
    if (ms === null) {
      room.phaseEndsAt = null;
      return;
    }
    room.phaseEndsAt = Date.now() + ms;
    timers.phaseTimer = setTimeout(() => this.onPhaseTimeout(room.code), ms);
  }

  private onPhaseTimeout(code: string) {
    const room = this.rooms.get(code);
    if (!room || room.paused) return;
    if (room.phase === 'un_comments') {
      this.nextSpeaker(room);
      return;
    }
    this.advancePhase(room);
  }

  /** Переход к следующей фазе цикла. */
  advancePhase(room: RoomState) {
    switch (room.phase) {
      case 'cabinet':
        this.resolveCabinetEnd(room);
        this.enterPhase(room, 'un_summary');
        break;
      case 'un_summary':
        this.enterPhase(room, 'un_comments');
        break;
      case 'un_comments':
        this.enterPhase(room, 'un_debate');
        break;
      case 'un_debate':
        this.enterPhase(room, 'un_vote');
        break;
      case 'un_vote':
        this.applyYearResults(room);
        this.enterPhase(room, 'results');
        break;
      case 'results': {
        const years = this.content.tunables.game.years;
        if (room.world && room.world.year > years) {
          this.enterPhase(room, 'final');
        } else {
          this.enterPhase(room, 'cabinet');
        }
        break;
      }
      default:
        break;
    }
  }

  nextSpeaker(room: RoomState) {
    room.speakerIdx += 1;
    if (room.speakerIdx >= room.speakerOrder.length) {
      this.enterPhase(room, 'un_debate');
    } else {
      this.armPhaseTimer(room);
      this.persist(room);
      this.broadcast(room);
    }
  }

  /**
   * Конец Кабинета: собираем сводку новостей по каждой стране
   * (решения года + события прошлого пересчёта) и применяем искажения шпионажа.
   * Хук Э8: здесь же ставятся задания на TTS/картинки.
   */
  private resolveCabinetEnd(room: RoomState) {
    if (!room.world) return;
    const news: Record<string, string[]> = {};
    const year = room.world.year;

    for (const [countryId] of room.world.countries) {
      const lines: string[] = [];
      for (const ev of room.lastTickEvents?.[countryId] ?? []) lines.push(ev);
      for (const ch of room.choicesThisYear[countryId] ?? []) {
        lines.push(`${ch.speaker} предложил — лидер решил: «${ch.label}»`);
      }
      if (lines.length === 0) lines.push('Год прошёл тихо. Подозрительно тихо.');
      news[countryId] = lines;
    }

    // искажения: сначала умолчания, потом ложь (успешные заказы этого года)
    for (const order of room.spyOrders.filter((o) => o.year === year && o.outcome?.success)) {
      if (order.kind === 'conceal') {
        const target = news[order.attackerCountryId] ?? [];
        // прячем самую неприятную строку (или указанную в payload по подстроке)
        const idx = order.payload
          ? target.findIndex((l) => l.toLowerCase().includes(order.payload!.toLowerCase()))
          : target.findIndex((l) => /голод|перевор|гиперинф|убыло/i.test(l));
        if (idx >= 0) target.splice(idx, 1);
        else if (target.length > 1) target.pop();
      }
      if (order.kind === 'insert_lie' && order.payload) {
        (news[order.targetCountryId] ??= []).push(order.payload);
      }
    }

    room.news = news;

    // Э8: в момент конца Кабинета сервер знает все решения → сразу ставим задания
    // на TTS и картинки; пока идёт переход и заставка, ассеты успевают сгенериться.
    room.newsAssets = {};
    for (const [countryId, lines] of Object.entries(news)) {
      const countryName = this.content.countries.get(countryId)?.name ?? countryId;
      void this.ml.enqueue({
        type: 'tts',
        priority: 'high',
        payload: {
          text: `Новости страны ${countryName}, год ${year}. ${lines.join('. ')}.`,
          style: 'новостной диктор, ироничный',
        },
        roomCode: room.code,
        year,
        countryId,
      });
      void this.ml.enqueue({
        type: 'image',
        priority: 'normal',
        payload: { prompt: `новостная иллюстрация, сатира: ${lines[0] ?? countryName}` },
        roomCode: room.code,
        year,
        countryId,
      });
    }
  }

  // ---------- голосование ООН ----------

  unVote(code: string, playerId: string, targetCountryId: string, kind: 'sanction' | 'support') {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'un_vote');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (targetCountryId === player.countryId) throw new Error('За себя голосовать нельзя');
    if (!room.world.countries.has(targetCountryId)) throw new Error('Нет такой страны');
    if (kind !== 'sanction' && kind !== 'support') throw new Error('Голос: sanction или support');

    const voter = room.world.countries.get(player.countryId)!;
    const cost = this.content.tunables.un.voteCostInfluence;
    if (voter.resources.influence < cost) throw new Error(`Нужно ${cost} влияния за голос`);
    voter.resources.influence -= cost;
    room.votes.push({ voterCountryId: player.countryId, targetCountryId, kind });
    this.persist(room);
    this.broadcast(room);
  }

  /** Итоги года: применяем голосование ООН, затем tick движка. */
  private applyYearResults(room: RoomState) {
    if (!room.world) return;
    const t = this.content.tunables;

    // подсчёт: чистые санкции по каждой цели
    const tally = new Map<string, number>();
    for (const v of room.votes) {
      tally.set(v.targetCountryId, (tally.get(v.targetCountryId) ?? 0) + (v.kind === 'sanction' ? 1 : -1));
    }
    for (const [countryId, net] of tally) {
      const s = room.world.countries.get(countryId);
      if (!s) continue;
      if (net > 0) {
        s.sanctions += 1;
        s.sanctionsReceivedTotal += 1;
      } else if (net < 0) {
        if (s.sanctions > 0) s.sanctions -= 1;
        else s.resources.influence += t.un.supportInfluenceBonus;
      }
    }

    const report = tick(room.world, this.content);

    // публичные события пересчёта — в фазу Итогов и в сводку следующего года
    const publicEvents: Record<string, string[]> = {};
    for (const ev of report.events.filter((e) => !e.hidden)) {
      (publicEvents[ev.countryId] ??= []).push(ev.text);
    }
    for (const [countryId, net] of tally) {
      if (net > 0) (publicEvents[countryId] ??= []).push('ООН ввела санкции');
      else if (net < 0) (publicEvents[countryId] ??= []).push('ООН выразила поддержку');
    }
    room.lastTickEvents = publicEvents;

    // сброс годовых записей
    room.choicesThisYear = {};
    room.votes = [];
  }

  // ---------- Кабинет: карты и шпионаж ----------

  private dealCard(room: RoomState, countryId: string) {
    if (!room.world) return;
    const s = room.world.countries.get(countryId)!;
    const def = this.content.countries.get(countryId)!;
    const rng = makeRng(room.world.seed + room.rngNonce++);
    room.currentCards[countryId] = drawCard(s, def, this.content, rng);
  }

  chooseCard(code: string, playerId: string, cardId: string, choiceIndex: number) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    const card = room.currentCards[player.countryId];
    if (!card || card.id !== cardId) throw new Error('Эта карта уже не актуальна');

    const s = room.world.countries.get(player.countryId)!;

    // выбор может строить чудо — мировой ресурс, проверяем ДО применения эффектов
    const wonderId = card.choices[choiceIndex]?.effects?.modifiers?.special?.buildWonder;
    if (typeof wonderId === 'string') {
      buildWonder(room.world, s, wonderId, this.content); // бросит, если занято/чужой эксклюзив
    }

    applyChoice(s, card, choiceIndex, room.world.year, this.content);
    (room.choicesThisYear[player.countryId] ??= []).push({
      speaker: card.speaker,
      label: card.choices[choiceIndex]!.label,
    });
    this.dealCard(room, player.countryId);
    this.persist(room);
    this.broadcast(room);
  }

  spyOrder(
    code: string,
    playerId: string,
    kind: SpyActionKind,
    targetCountryId: string,
    payload?: string,
  ) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    const left = room.spyOrdersLeft[player.countryId] ?? 0;
    if (left <= 0) throw new Error('Лимит шпионских операций на этот год исчерпан');

    const attacker = room.world.countries.get(player.countryId)!;
    const target = room.world.countries.get(targetCountryId);
    if (!target) throw new Error('Нет такой страны-цели');
    if (kind !== 'conceal' && targetCountryId === player.countryId) {
      throw new Error('Эта операция — только против чужих');
    }
    if (kind === 'conceal' && targetCountryId !== player.countryId) {
      throw new Error('Умолчать можно только о своём факте');
    }

    const rng = makeRng(room.world.seed + room.rngNonce++);
    const outcome = resolveSpyAction(attacker, target, kind, room.world, this.content, rng);
    room.spyOrdersLeft[player.countryId] = left - 1;
    room.spyOrders.push({
      year: room.world.year,
      attackerCountryId: player.countryId,
      targetCountryId,
      kind,
      payload,
      outcome,
    });

    // успешный reveal сразу даёт донесение
    if (kind === 'reveal' && outcome.success) {
      (room.intel[playerId] ??= []).push({
        year: room.world.year,
        targetCountryId,
        data: {
          resources: { ...target.resources },
          sectors: { ...target.sectors },
          dovolstvo: Math.round(target.dovolstvo),
          forbesTotal: Math.round(computeForbes(target, this.content).total),
          declaredForbes: target.declaredForbes,
        },
      });
    }

    this.persist(room);
    this.broadcast(room);
    return outcome;
  }

  // ---------- дипломатия: ящик предложений (раздел 9) ----------

  tradeOffer(code: string, playerId: string, toCountryId: string, give: TradeSidePayload, take: TradeSidePayload) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (toCountryId === player.countryId) throw new Error('Сделка с собой — это просто бюджет');
    if (!room.world.countries.has(toCountryId)) throw new Error('Нет такой страны');

    const cleanGive = this.cleanSide(give);
    const cleanTake = this.cleanSide(take);
    if (this.sideEmpty(cleanGive) && this.sideEmpty(cleanTake)) {
      throw new Error('Пустая сделка');
    }

    const offer = {
      id: randomUUID(),
      year: room.world.year,
      fromCountryId: player.countryId,
      fromName: this.content.countries.get(player.countryId)!.name,
      toCountryId,
      toName: this.content.countries.get(toCountryId)!.name,
      give: cleanGive,
      take: cleanTake,
      status: 'pending' as const,
    };
    room.tradeOffers.push(offer);
    this.persist(room);
    this.broadcast(room);
    return { offerId: offer.id };
  }

  tradeRespond(code: string, playerId: string, offerId: string, accept: boolean) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    const offer = room.tradeOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== 'pending') throw new Error('Предложение уже не актуально');
    if (offer.toCountryId !== player.countryId) throw new Error('Это предложение не вам');

    if (!accept) {
      offer.status = 'declined';
    } else {
      const from = room.world.countries.get(offer.fromCountryId)!;
      const to = room.world.countries.get(offer.toCountryId)!;
      try {
        // сервер валидирует и применяет атомарно; обещания не enforced
        applyTrade(from, to, { from: from.id, to: to.id, give: offer.give, take: offer.take }, this.content);
        offer.status = 'accepted';
      } catch (e) {
        if (e instanceof TradeError) {
          offer.status = 'failed';
          offer.failReason = e.message;
        } else {
          throw e;
        }
      }
    }
    this.persist(room);
    this.broadcast(room);
    return { status: offer.status, failReason: offer.failReason };
  }

  tradeCancel(code: string, playerId: string, offerId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    const offer = room.tradeOffers.find((o) => o.id === offerId);
    if (!offer || offer.status !== 'pending') throw new Error('Предложение уже не актуально');
    if (offer.fromCountryId !== player.countryId) throw new Error('Отменить можно только своё');
    offer.status = 'cancelled';
    this.persist(room);
    this.broadcast(room);
  }

  /** Санитизация стороны сделки: только известные ключи, положительные целые. */
  private cleanSide(side: TradeSidePayload | undefined): TradeSidePayload {
    const out: TradeSidePayload = {};
    const clean = (rec: Record<string, unknown> | undefined, keys: readonly string[]) => {
      if (!rec) return undefined;
      const r: Record<string, number> = {};
      for (const k of keys) {
        const v = Number(rec[k]);
        if (Number.isFinite(v) && v > 0) r[k] = Math.floor(v);
      }
      return Object.keys(r).length ? r : undefined;
    };
    const res = clean(side?.resources as Record<string, unknown>, ['money', 'gold', 'food', 'influence']);
    const pop = clean(side?.population as Record<string, unknown>, ['rabotyagi', 'umniki', 'siloviki', 'mediyshchiki', 'ministry']);
    if (res) out.resources = res;
    if (pop) out.population = pop;
    if (Array.isArray(side?.statuses) && side.statuses.length) {
      out.statuses = side.statuses.filter((s): s is string => typeof s === 'string').slice(0, 10);
    }
    if (typeof side?.promise === 'string' && side.promise.trim()) {
      out.promise = side.promise.trim().slice(0, 200);
    }
    return out;
  }

  private sideEmpty(side: TradeSidePayload): boolean {
    return !side.resources && !side.population && !side.statuses && !side.promise;
  }

  declareForbes(code: string, playerId: string, value: number) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (!Number.isFinite(value) || value < 0) throw new Error('Некорректное число');
    room.world.countries.get(player.countryId)!.declaredForbes = Math.round(value);
    this.persist(room);
    this.broadcast(room);
  }

  // ---------- видео: токены LiveKit и звонки 1-на-1 (Э7) ----------

  /** Кому игрок может писать/звонить: вернёт socketId игрока страны. */
  private socketOfCountry(room: RoomState, countryId: string): string | null {
    return room.players.find((p) => p.countryId === countryId)?.socketId ?? null;
  }

  callInvite(code: string, playerId: string, toCountryId: string) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (toCountryId === player.countryId) throw new Error('Сам себе вы и так можете позвонить');
    if (!room.world.countries.has(toCountryId)) throw new Error('Нет такой страны');
    const left = room.callsLeft[player.countryId] ?? 0;
    if (left <= 0) throw new Error('Лимит звонков на этот год исчерпан');
    if (room.calls.some((c) => c.status !== 'ended' && (c.fromCountryId === player.countryId || c.toCountryId === player.countryId))) {
      throw new Error('У вас уже есть активный звонок');
    }

    room.callsLeft[player.countryId] = left - 1;
    const call = { id: randomUUID(), fromCountryId: player.countryId, toCountryId, status: 'ringing' as const };
    room.calls.push(call);

    const targetSocket = this.socketOfCountry(room, toCountryId);
    if (targetSocket && this.server) {
      this.server.to(targetSocket).emit(SocketEvents.CallIncoming, {
        callId: call.id,
        fromCountryId: player.countryId,
        fromName: player.name,
        fromCountryName: this.content.countries.get(player.countryId)!.name,
      });
    }
    this.persist(room);
    this.broadcast(room);
    return { callId: call.id };
  }

  callRespond(code: string, playerId: string, callId: string, accept: boolean) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    const call = room.calls.find((c) => c.id === callId);
    if (!call || call.status !== 'ringing') throw new Error('Звонок уже не актуален');
    if (call.toCountryId !== player.countryId) throw new Error('Это не ваш звонок');

    call.status = accept ? 'active' : 'ended';
    const fromSocket = this.socketOfCountry(room, call.fromCountryId);
    if (fromSocket && this.server) {
      this.server
        .to(fromSocket)
        .emit(accept ? SocketEvents.CallStarted : SocketEvents.CallEnded, { callId });
    }
    this.persist(room);
    return { callId, accepted: accept };
  }

  callEnd(code: string, playerId: string, callId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    const call = room.calls.find((c) => c.id === callId);
    if (!call || call.status === 'ended') return;
    if (call.fromCountryId !== player.countryId && call.toCountryId !== player.countryId) {
      throw new Error('Это не ваш звонок');
    }
    call.status = 'ended';
    for (const cid of [call.fromCountryId, call.toCountryId]) {
      const sid = this.socketOfCountry(room, cid);
      if (sid && this.server) this.server.to(sid).emit(SocketEvents.CallEnded, { callId });
    }
    this.persist(room);
  }

  /** Проверка прав на видеокомнату: ООН — все в фазах ООН; звонок — только участники. */
  videoRoomFor(code: string, playerId: string, kind: 'un' | 'call', callId?: string): string {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (kind === 'un') {
      if (!room.phase.startsWith('un_') && room.phase !== 'results' && room.phase !== 'final') {
        throw new Error('Видеокомната ООН доступна только в фазе ООН');
      }
      return `un-${room.code}`;
    }
    const call = room.calls.find((c) => c.id === callId);
    if (!call || call.status !== 'active') throw new Error('Звонок не активен');
    if (call.fromCountryId !== player.countryId && call.toCountryId !== player.countryId) {
      throw new Error('Вы не участник звонка');
    }
    return `call-${room.code}-${call.id}`;
  }

  // ---------- реконнект и пауза (раздел 13) ----------

  attachSocket(code: string, playerId: string, socketId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    player.socketId = socketId;
    player.connected = true;

    if (room.paused && room.players.every((p) => p.connected)) {
      this.resume(room);
    }
    this.persist(room);
    this.broadcast(room);
  }

  onDisconnect(socketId: string) {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (!player) continue;
      player.connected = false;
      player.socketId = null;

      if (room.phase === 'lobby' || room.phase === 'final') {
        this.broadcast(room);
        this.persist(room);
        return;
      }
      if (!room.paused) this.pause(room);
      this.broadcast(room);
      this.persist(room);
      return;
    }
  }

  /** Заморозить таймер фазы: «Игрок X переподключается…» */
  private pause(room: RoomState) {
    const timers = this.timers.get(room.code)!;
    room.paused = true;
    room.remainingMs = room.phaseEndsAt ? Math.max(0, room.phaseEndsAt - Date.now()) : null;
    if (timers.phaseTimer) clearTimeout(timers.phaseTimer);
    room.phaseEndsAt = null;

    const maxMs = this.content.tunables.timers.reconnectPauseSecondsMax * 1000;
    room.resumeDeadline = Date.now() + maxMs;
    timers.pauseTimer = setTimeout(() => {
      // фолбэк: продолжаем без отвалившихся (никто не выбывает — игрок может вернуться позже)
      this.logger.warn(`[${room.code}] пауза истекла, продолжаем без отсутствующих`);
      this.resume(room);
      this.broadcast(room);
    }, maxMs);
  }

  private resume(room: RoomState) {
    const timers = this.timers.get(room.code)!;
    if (timers.pauseTimer) clearTimeout(timers.pauseTimer);
    room.paused = false;
    room.resumeDeadline = null;
    if (room.remainingMs !== null) {
      this.armPhaseTimer(room, room.remainingMs);
      room.remainingMs = null;
    }
    this.persist(room);
  }

  // ---------- инфраструктура ----------

  broadcast(room: RoomState) {
    if (!this.server) return;
    for (const p of room.players) {
      if (!p.socketId) continue;
      this.server
        .to(p.socketId)
        .emit(SocketEvents.RoomState, buildSnapshot(room, p.playerId, this.content));
    }
  }

  getRoomBySocket(socketId: string): { room: RoomState; player: RoomPlayer } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) return { room, player };
    }
    return null;
  }

  private persist(room: RoomState) {
    const json = JSON.stringify({
      ...room,
      world: room.world ? serializeWorld(room.world) : null,
    });
    this.redis.client
      .set(`room:${room.code}`, json, 'EX', ROOM_TTL_SECONDS)
      .catch((e) => this.logger.warn(`Redis persist: ${e.message}`));
  }

  /** Восстановление комнат из Redis при рестарте сервера. */
  async restoreFromRedis() {
    const keys = await this.redis.client.keys('room:*');
    for (const key of keys) {
      try {
        const raw = await this.redis.client.get(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const room: RoomState = {
          ...data,
          tradeOffers: data.tradeOffers ?? [],
          choicesThisYear: data.choicesThisYear ?? {},
          votes: data.votes ?? [],
          news: data.news ?? null,
          newsAssets: data.newsAssets ?? {},
          calls: data.calls ?? [],
          lastTickEvents: data.lastTickEvents ?? null,
          world: data.world ? deserializeWorld(data.world) : null,
        };
        // все соединения мертвы после рестарта
        for (const p of room.players) {
          p.connected = false;
          p.socketId = null;
        }
        room.paused = room.phase !== 'lobby' && room.phase !== 'final';
        room.phaseEndsAt = null;
        if (room.remainingMs === null) room.remainingMs = this.phaseDuration(room, room.phase);
        this.rooms.set(room.code, room);
        this.timers.set(room.code, {});
        this.logger.log(`Комната ${room.code} восстановлена из Redis (фаза ${room.phase})`);
      } catch (e) {
        this.logger.warn(`Не восстановил ${key}: ${(e as Error).message}`);
      }
    }
  }

  private dropRoom(code: string) {
    const timers = this.timers.get(code);
    if (timers?.phaseTimer) clearTimeout(timers.phaseTimer);
    if (timers?.pauseTimer) clearTimeout(timers.pauseTimer);
    this.timers.delete(code);
    this.rooms.delete(code);
    this.redis.client.del(`room:${code}`).catch(() => undefined);
  }

  private assertPhase(room: RoomState, phase: GamePhase) {
    if (room.phase !== phase) throw new Error(`Действие доступно только в фазе ${phase}`);
    if (room.paused) throw new Error('Игра на паузе');
  }

  private mustRoom(code: string): RoomState {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) throw new Error('Комната не найдена');
    return room;
  }

  private mustPlayer(room: RoomState, playerId: string): RoomPlayer {
    const p = room.players.find((x) => x.playerId === playerId);
    if (!p) throw new Error('Игрок не в комнате');
    return p;
  }

  private makePlayer(name: string, isHost: boolean): RoomPlayer {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 24) throw new Error('Имя: 1–24 символа');
    return {
      playerId: randomUUID(),
      token: randomUUID(),
      name: trimmed,
      countryId: null,
      socketId: null,
      connected: false,
      isHost,
    };
  }

  private genCode(): string {
    // без похожих символов
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = [...randomBytes(4)].map((b) => alphabet[b % alphabet.length]).join('');
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Не удалось сгенерировать код комнаты');
  }
}
