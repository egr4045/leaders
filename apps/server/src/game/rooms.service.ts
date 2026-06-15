import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import { SocketEvents, type GamePhase } from '@leaders/shared';
import {
  applyChoice,
  applyTrade,
  aggregateModifiers,
  effectiveSector,
  createWorld,
  drawCard,
  makeRng,
  resolveSpyAction,
  serializeWorld,
  deserializeWorld,
  tick,
  computeForbes,
  buildWonder,
  WonderError,
  TradeError,
  declareWar,
  investInWar,
  joinWar,
  endWarByPeace,
  applyVictorReward,
  recomputeAuras,
  sideOf,
  type SpyActionKind,
  type WarRewardKind,
} from '@leaders/engine';
import type { TradeSidePayload, TradeOfferView } from '@leaders/shared';
import { ContentService } from '../content.service.js';
import { RedisService } from '../redis.service.js';
import { MlService } from '../ml/ml.service.js';
import { buildSnapshot } from './snapshot.builder.js';
import { buildYearReports, captureBefore } from './year-report.js';
import type { RoomState, RoomTimers, RoomPlayer } from './room.types.js';

const ROOM_TTL_SECONDS = 60 * 60 * 24;
/** Длительность интро-заставки новостей до начала чтения (синхронно с джинглом клиента). */
const NEWS_INTRO_MS = 4500;

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
      if (job.type === 'tts') {
        const lineIndex = job.payload.lineIndex ?? 0;
        const arr = (slot.lineAudioUrls ??= []);
        arr[lineIndex] = assetUrl;
      } else {
        slot.imageUrl = assetUrl;
      }
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
      newsCursor: null,
      calls: [],
      callLog: [],
      promises: [],
      wiretaps: [],
      lastTickEvents: null,
      speakerOrder: [],
      speakerIdx: 0,
      rngNonce: 0,
      createdAt: Date.now(),
      waitingContinue: false,
      cardsChosenThisYear: {},
      readyPlayerIds: [],
      sectorBudget: {},
      manualPause: false,
      unLayout: 'auto',
      warVotes: [],
      yearReports: {},
    };
    this.rooms.set(code, room);
    this.timers.set(code, { botTimers: [] });
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

    if (room.phase !== 'lobby') {
      const hasFree = room.players.some(p => p.countryId && (!p.connected || p.isBot));
      if (!hasFree) throw new Error('Партия уже идёт и нет свободных мест (никто не отключился)');
      const player = this.makePlayer(name, false);
      room.players.push(player);
      this.persist(room);
      return { room, player };
    }

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
    if (!this.content.countries.has(countryId)) throw new Error('Нет такой страны');

    if (room.phase !== 'lobby') {
      const target = room.players.find((p) => p.countryId === countryId);
      if (!target) throw new Error('Эта страна не участвует в игре');
      if (target.connected && !target.isBot) throw new Error('Страна занята активным игроком');

      const me = this.mustPlayer(room, playerId);
      room.players = room.players.filter((p) => p.playerId !== target.playerId);
      me.countryId = countryId;
      if (target.isHost) me.isHost = true;
      this.persist(room);
      this.broadcast(room);
      return;
    }

    if (room.players.some((p) => p.countryId === countryId && p.playerId !== playerId)) {
      throw new Error('Страна занята');
    }
    this.mustPlayer(room, playerId).countryId = countryId;
    this.persist(room);
    this.broadcast(room);
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
      case 'year_summary':
        return t.yearSummarySeconds * 1000;
      default:
        return null;
    }
  }

  enterPhase(room: RoomState, phase: GamePhase) {
    room.phase = phase;
    room.waitingContinue = false;
    // выпуск новостей живёт только в un_summary — сбрасываем курсор/таймер при любой смене фазы
    this.clearNewsTimer(room);
    room.newsCursor = null;
    this.logger.log(`[${room.code}] фаза → ${phase} (год ${room.world?.year ?? '-'})`);

    if (phase === 'cabinet') {
      room.cardsChosenThisYear = {};
      room.readyPlayerIds = [];
      room.wiretaps = []; // прослушки действуют только в течение года
      // новый год: лимиты, первая карта каждому
      for (const p of room.players) {
        if (!p.countryId || !room.world) continue;
        room.callsLeft[p.countryId] = this.content.tunables.diplomacy.callsPerYear;
        room.spyOrdersLeft[p.countryId] = this.content.tunables.spy.ordersPerYear;
        this.dealCard(room, p.countryId);
      }
      // туториал в первый год
      if (room.world?.year === 1) {
        setTimeout(() => {
          this.server?.to(room.code).emit('game:announcement', {
            title: '🏛 Добро пожаловать в кабинет',
            text: 'Выслушайте советников и принимайте решения. Занимайтесь дипломатией, шпионажем и торговлей. Когда будете готовы — нажмите «Готов».',
          });
        }, 1500);
      }
    }
    if (phase === 'year_summary') {
      // личная сводка: ждём «В кабинет» от всех живых игроков (паттерн readyPlayerIds)
      room.readyPlayerIds = [];
    }
    if (phase === 'un_comments') {
      room.speakerOrder = room.players.filter((p) => p.connected || p.isBot).map((p) => p.playerId);
      room.speakerIdx = 0;
    } else if (phase !== 'cabinet') {
      room.speakerOrder = [];
      room.speakerIdx = 0;
    }

    this.armPhaseTimer(room);
    this.persist(room);
    this.broadcast(room);

    // тест-режим: боты реагируют на новую фазу
    this.clearBotTimers(room);
    this.kickBots(room);

    // выпуск новостей: после интро-заставки запускаем синхронный курсор для всех
    if (phase === 'un_summary' && room.news && Object.keys(room.news).length > 0) {
      const timers = this.timers.get(room.code);
      if (timers) {
        timers.newsTimer = setTimeout(() => this.startNewsBroadcast(room.code), NEWS_INTRO_MS);
      }
    }
  }

  // ---------- синхронный выпуск новостей (un_summary) ----------

  /** Грубая оценка длительности чтения строки (синхронно с клиентскими субтитрами). */
  private newsLineDurationMs(line: string): number {
    return Math.min(14000, Math.max(2800, line.length * 60 + 900));
  }

  private clearNewsTimer(room: RoomState) {
    const timers = this.timers.get(room.code);
    if (timers?.newsTimer) {
      clearTimeout(timers.newsTimer);
      timers.newsTimer = undefined;
    }
  }

  private armNewsTimer(room: RoomState) {
    const timers = this.timers.get(room.code);
    if (!timers) return;
    if (timers.newsTimer) clearTimeout(timers.newsTimer);
    const cursor = room.newsCursor;
    if (!room.news || !cursor) return;
    const countryIds = Object.keys(room.news);
    const countryId = countryIds[cursor.countryIdx];
    if (!countryId) return;
    const lines = room.news[countryId] ?? [];
    const line = lines[cursor.lineIdx] ?? '';
    // реальная длительность озвучки (если есть) + небольшая пауза; иначе оценка по тексту
    const audioUrl = room.newsAssets[countryId]?.lineAudioUrls?.[cursor.lineIdx] ?? null;
    const audioMs = audioUrl ? this.ml.audioDurationMs(audioUrl) : null;
    let ms = audioMs && audioMs > 0 ? audioMs + 700 : this.newsLineDurationMs(line);
    ms = Math.min(30000, Math.max(1500, ms));
    timers.newsTimer = setTimeout(() => this.advanceNewsCursor(room.code), ms);
  }

  /** Старт выпуска: курсор на первую страну/строку, запуск авто-продвижения. */
  private startNewsBroadcast(code: string) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== 'un_summary' || !room.news) return;
    if (Object.keys(room.news).length === 0) return;
    room.newsCursor = { countryIdx: 0, lineIdx: 0 };
    this.persist(room);
    this.broadcast(room);
    this.armNewsTimer(room);
  }

  /** Авто-продвижение курсора: следующая строка → следующая страна → конец выпуска. */
  private advanceNewsCursor(code: string) {
    const room = this.rooms.get(code);
    if (!room || room.phase !== 'un_summary' || !room.news || !room.newsCursor) return;
    // уважаем ручную паузу председателя: не двигаемся, перепроверим позже
    if (room.paused) {
      const timers = this.timers.get(room.code);
      if (timers) timers.newsTimer = setTimeout(() => this.advanceNewsCursor(code), 500);
      return;
    }
    const countryIds = Object.keys(room.news);
    const cur = room.newsCursor;
    const lines = room.news[countryIds[cur.countryIdx] ?? ''] ?? [];
    let countryIdx = cur.countryIdx;
    let lineIdx = cur.lineIdx + 1;
    if (lineIdx >= lines.length) {
      countryIdx += 1;
      lineIdx = 0;
    }
    if (countryIdx >= countryIds.length) {
      // выпуск окончен (countryIdx === length — клиент покажет «выпуск окончен»)
      room.newsCursor = { countryIdx: countryIds.length, lineIdx: 0 };
      this.clearNewsTimer(room);
      this.persist(room);
      this.broadcast(room);
      return;
    }
    room.newsCursor = { countryIdx, lineIdx };
    this.persist(room);
    this.broadcast(room);
    this.armNewsTimer(room);
  }

  /** Хост: пропустить текущую страну в выпуске (или стартовать сразу, если ещё интро). */
  hostNewsSkip(code: string, playerId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Только хост');
    if (room.phase !== 'un_summary' || !room.news) throw new Error('Сейчас не выпуск новостей');
    const countryIds = Object.keys(room.news);
    if (!room.newsCursor) {
      // ещё идёт интро — стартуем выпуск немедленно
      this.clearNewsTimer(room);
      this.startNewsBroadcast(code);
      return;
    }
    const nextCountry = room.newsCursor.countryIdx + 1;
    if (nextCountry >= countryIds.length) {
      room.newsCursor = { countryIdx: countryIds.length, lineIdx: 0 };
      this.clearNewsTimer(room);
    } else {
      room.newsCursor = { countryIdx: nextCountry, lineIdx: 0 };
      this.armNewsTimer(room);
    }
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
    // кабинет, голосование и сводка года — автоматический переход
    if (room.phase === 'cabinet' || room.phase === 'un_vote' || room.phase === 'year_summary') {
      this.advancePhase(room);
      return;
    }
    // un_summary, un_debate, results — ждём хоста
    room.waitingContinue = true;
    room.phaseEndsAt = null;
    this.persist(room);
    this.broadcast(room);
  }

  hostContinue(code: string, playerId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Только хост может продолжить');
    if (!room.waitingContinue) throw new Error('Нет ожидания подтверждения');
    this.advancePhase(room);
  }

  hostExtendPhase(code: string, playerId: string, extraSeconds: number) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Только хост');
    if (room.phase !== 'un_debate' && room.phase !== 'un_comments') {
      throw new Error('Продлять можно только дебаты или выступление');
    }
    if (extraSeconds === 0) {
      // досрочное завершение: телескопируем таймер
      this.onPhaseTimeout(room.code);
      return;
    }
    const ms = Math.max(10, Math.min(600, extraSeconds)) * 1000;
    room.waitingContinue = false;
    if (!room.phaseEndsAt) {
      this.armPhaseTimer(room, ms);
    } else {
      room.phaseEndsAt += ms;
      this.armPhaseTimer(room, room.phaseEndsAt - Date.now());
    }
    this.persist(room);
    this.broadcast(room);
  }

  // ---------- председатель ООН ----------

  private mustChairman(code: string, playerId: string): RoomState {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Только председатель (хост)');
    return room;
  }

  /** Ручная пауза председателя: таймер замораживается, дедлайна авто-возобновления нет. */
  hostPause(code: string, playerId: string, paused: boolean) {
    const room = this.mustChairman(code, playerId);
    if (room.phase === 'lobby' || room.phase === 'final') throw new Error('Здесь нет таймера');
    if (paused) {
      if (room.paused) throw new Error('Уже на паузе');
      const timers = this.timers.get(room.code)!;
      room.paused = true;
      room.manualPause = true;
      room.remainingMs = room.phaseEndsAt ? Math.max(0, room.phaseEndsAt - Date.now()) : null;
      if (timers.phaseTimer) clearTimeout(timers.phaseTimer);
      room.phaseEndsAt = null;
      room.resumeDeadline = null;
      this.persist(room);
      this.broadcast(room);
    } else {
      if (!room.manualPause) throw new Error('Перерыв не объявлен');
      this.resume(room);
      this.broadcast(room);
    }
  }

  /** Председатель меняет порядок сегментов ООН: прыжок к любому сегменту внутри блока ООН. */
  hostSetPhase(code: string, playerId: string, phase: GamePhase) {
    const room = this.mustChairman(code, playerId);
    const allowed: GamePhase[] = ['un_summary', 'un_comments', 'un_debate', 'un_vote'];
    if (!allowed.includes(phase)) throw new Error('Недоступный сегмент');
    if (!allowed.includes(room.phase)) throw new Error('Сегменты можно менять только во время заседания ООН');
    if (phase === room.phase) throw new Error('Этот сегмент уже идёт');
    if (room.manualPause) this.resume(room);
    this.enterPhase(room, phase);
  }

  /** Председатель даёт слово конкретному игроку (фаза un_comments). */
  hostSetSpeaker(code: string, playerId: string, targetPlayerId: string) {
    const room = this.mustChairman(code, playerId);
    if (room.phase !== 'un_comments') throw new Error('Слово даётся в круге выступлений');
    const target = this.mustPlayer(room, targetPlayerId);
    if (room.speakerOrder[room.speakerIdx] === targetPlayerId) throw new Error('Он уже говорит');
    // переносим цель на текущую позицию, сохраняя остальную очередь
    const rest = room.speakerOrder.filter((id) => id !== targetPlayerId);
    rest.splice(room.speakerIdx, 0, targetPlayerId);
    room.speakerOrder = rest;
    this.armPhaseTimer(room);
    this.persist(room);
    this.broadcast(room);
    this.botMaybeSpeak(room);
    this.botLog(room, `Председатель дал слово: ${target.name}`);
  }

  /** Председатель пропускает текущего спикера. */
  hostSkipSpeaker(code: string, playerId: string) {
    const room = this.mustChairman(code, playerId);
    if (room.phase !== 'un_comments') throw new Error('Сейчас не круг выступлений');
    this.nextSpeaker(room);
  }

  /** Хост досрочно снимает авто-паузу (реконнект) — «продолжить без него». */
  hostResume(code: string, playerId: string) {
    const room = this.mustChairman(code, playerId);
    if (!room.paused) throw new Error('Игра не на паузе');
    if (room.manualPause) throw new Error('Это ручной перерыв — используйте кнопку Перерыв');
    this.resume(room);
    this.broadcast(room);
  }

  /** Хост исключает игрока: в лобби удаляет, в игре помечает disconnected. */
  kickPlayer(code: string, playerId: string, targetPlayerId: string) {
    const room = this.mustChairman(code, playerId);
    if (targetPlayerId === playerId) throw new Error('Нельзя кикнуть самого себя');
    const target = this.mustPlayer(room, targetPlayerId);
    if (target.isHost) throw new Error('Нельзя кикнуть хоста');

    if (room.phase === 'lobby') {
      room.players = room.players.filter((p) => p.playerId !== targetPlayerId);
    } else {
      target.connected = false;
      target.socketId = null;
      // если игра на паузе из-за этого игрока — снять паузу
      if (room.paused && !room.manualPause) {
        const stillDisconnected = room.players.some((p) => !p.connected && !p.isBot);
        if (!stillDisconnected) this.resume(room);
      }
    }
    this.persist(room);
    this.broadcast(room);
  }

  /** Председатель принудительно задаёт раскладку видео ('auto' = вернуть автоматику). */
  hostSetLayout(code: string, playerId: string, layout: string) {
    const room = this.mustChairman(code, playerId);
    if (layout !== 'auto' && layout !== 'spotlight' && layout !== 'grid') {
      throw new Error('Неизвестная раскладка');
    }
    room.unLayout = layout;
    this.persist(room);
    this.broadcast(room);
  }

  /** Председатель просит игрока замьютиться: шлём сигнал его клиенту (тот может включить обратно). */
  hostMute(code: string, playerId: string, targetPlayerId: string) {
    const room = this.mustChairman(code, playerId);
    const target = this.mustPlayer(room, targetPlayerId);
    if (target.isBot || !target.socketId) throw new Error('Игрок недоступен');
    this.server?.to(target.socketId).emit(SocketEvents.VideoForceMute, {
      by: this.mustPlayer(room, playerId).name,
    });
  }

  setBudget(code: string, playerId: string, budget: Record<string, number>) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId) throw new Error('Нет страны');
    // бюджет хранится per countryId
    room.sectorBudget[player.countryId] = budget;
    this.persist(room);
    return { ok: true };
  }

  adoptLaw(code: string, playerId: string, lawId: string) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) return { ok: false, error: 'Нет страны' };
    const s = room.world.countries.get(player.countryId);
    if (!s) return { ok: false, error: 'Нет страны' };
    
    const law = this.content.statuses.get(lawId);
    if (!law || law.type !== 'law') return { ok: false, error: 'Неизвестный закон' };

    const isAdopted = s.activeStatuses.includes(lawId);
    const hasLevels = law.levels && law.levels.length > 0;
    const currentLevel = s.lawLevels?.[lawId] ?? 0;
    const maxLevel = hasLevels ? law.levels!.length - 1 : 0;
    
    if (isAdopted && (!hasLevels || currentLevel >= maxLevel)) {
      return { ok: false, error: 'Уже принят или достигнут максимальный уровень' };
    }

    if (s.lawUpgradedYear?.[lawId] === room.world.year) {
      return { ok: false, error: 'Улучшать закон можно только раз в год' };
    }

    const nextLevelIdx = isAdopted ? currentLevel + 1 : 0;
    const lvlData = hasLevels ? law.levels![nextLevelIdx] : undefined;
    const cost = lvlData?.cost ?? law.cost;
    const minMinistry = lvlData?.minMinistry ?? law.minMinistry;

    if (cost?.money && s.resources.money < cost.money) return { ok: false, error: 'Не хватает денег' };
    if (cost?.influence && s.resources.influence < cost.influence) return { ok: false, error: 'Не хватает влияния' };
    if (minMinistry && s.population.ministry < minMinistry) return { ok: false, error: 'Не хватает министров' };

    if (cost?.money) s.resources.money -= cost.money;
    if (cost?.influence) s.resources.influence -= cost.influence;

    if (!isAdopted) {
      s.activeStatuses.push(lawId);
    }
    
    s.lawLevels = s.lawLevels ?? {};
    s.lawUpgradedYear = s.lawUpgradedYear ?? {};
    
    s.lawLevels[lawId] = nextLevelIdx;
    s.lawUpgradedYear[lawId] = room.world.year;

    this.persist(room);
    this.broadcast(room);
    return { ok: true };
  }

  cancelLaw(code: string, playerId: string, lawId: string) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) return { ok: false, error: 'Нет страны' };
    const s = room.world.countries.get(player.countryId);
    if (!s) return { ok: false, error: 'Нет страны' };

    const law = this.content.statuses.get(lawId);
    if (!law || law.type !== 'law') return { ok: false, error: 'Неизвестный закон' };

    if (!s.activeStatuses.includes(lawId)) return { ok: false, error: 'Закон не принят' };

    s.activeStatuses = s.activeStatuses.filter((id) => id !== lawId);
    
    if (s.lawLevels) delete s.lawLevels[lawId];
    if (s.lawUpgradedYear) delete s.lawUpgradedYear[lawId];

    this.persist(room);
    this.broadcast(room);
    return { ok: true };
  }

  rejectLaw(code: string, playerId: string, lawId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    player.rejectedLaws = player.rejectedLaws ?? [];
    if (!player.rejectedLaws.includes(lawId)) {
      player.rejectedLaws.push(lawId);
      this.persist(room);
      this.broadcast(room);
    }
    return { ok: true };
  }

  markReady(code: string, playerId: string) {
    const room = this.mustRoom(code);
    if (room.phase !== 'cabinet' && room.phase !== 'year_summary') {
      throw new Error('Готовность отмечается в кабинете или сводке года');
    }
    if (room.paused) throw new Error('Игра на паузе');
    if (!room.readyPlayerIds.includes(playerId)) {
      room.readyPlayerIds.push(playerId);
    }
    const realPlayers = room.players.filter((p) => !p.isBot);
    if (room.readyPlayerIds.length >= realPlayers.length) {
      this.advancePhase(room);
    } else {
      this.persist(room);
      this.broadcast(room);
    }
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
      case 'results':
      case 'year_summary': {
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
      this.botMaybeSpeak(room);
    }
  }

  /**
   * Конец Кабинета: собираем сводку новостей по каждой стране
   * (решения года + события прошлого пересчёта) и применяем искажения шпионажа.
   * Хук Э8: здесь же ставятся задания на TTS/картинки.
   */
  /** Определить режим СМИ страны: true = независимые/частные, false = провластные. */
  private isSmiLiberal(country: import('@leaders/engine').CountryState): boolean {
    // аура чужого YouTube (Э10): СМИ принудительно либеральные
    const eff = aggregateModifiers(country, this.content);
    if (eff.special.forceLiberalMedia === true) return true;
    for (const id of country.activeStatuses) {
      const st = this.content.statuses.get(id);
      if (st?.exclusiveGroup === 'regime') {
        return Boolean((st as Record<string, unknown>).mediaIsLiberal);
      }
    }
    return false;
  }

  private resolveCabinetEnd(room: RoomState) {
    if (!room.world) return;

    // применяем бюджетные инвестиции до тика
    const investPerLevel = this.content.tunables.budget?.investPerLevel ?? 1000;
    for (const [countryId, budget] of Object.entries(room.sectorBudget)) {
      const s = room.world.countries.get(countryId);
      if (!s || s.resources.money < 0) continue;
      // считаем доход (без мутаций) для распределения
      const eff = aggregateModifiers(s, this.content);
      const t = this.content.tunables;
      const scienceMult = effectiveSector(s, eff, 'science') * t.economy.scienceMultPerLevel + eff.scienceMult;
      const economyFactor = 1 + effectiveSector(s, eff, 'economy') * t.production.economyIncomePerLevel;
      const moneyIncome = s.population.rabotyagi * t.production.moneyPerRabotyaga * eff.outputMult.rabotyagi * (1 + scienceMult) * economyFactor;
      const total = Object.values(budget as Record<string, number>).reduce((a, b) => a + b, 0);
      if (total <= 0 || moneyIncome <= 0) continue;
      for (const [sector, pct] of Object.entries(budget as Record<string, number>)) {
        if (pct <= 0) continue;
        const invest = moneyIncome * (pct / 100);
        s.sectorInvestment[sector as import('@leaders/shared').SectorKey] =
          (s.sectorInvestment[sector as import('@leaders/shared').SectorKey] ?? 0) + invest;
        // порог достигнут → сектор +1
        const acc = s.sectorInvestment[sector as import('@leaders/shared').SectorKey] ?? 0;
        if (acc >= investPerLevel && s.sectors[sector as import('@leaders/shared').SectorKey] < 10) {
          s.sectors[sector as import('@leaders/shared').SectorKey] += 1;
          s.sectorInvestment[sector as import('@leaders/shared').SectorKey] = acc - investPerLevel;
        }
      }
    }

    const news: Record<string, string[]> = {};
    const newsPrerenderKeys: Record<string, (string | undefined)[]> = {};
    const year = room.world.year;

    for (const [countryId] of room.world.countries) {
      const s = room.world.countries.get(countryId)!;
      const liberal = this.isSmiLiberal(s);
      const lines: string[] = [];
      const keys: (string | undefined)[] = [];
      for (const ev of room.lastTickEvents?.[countryId] ?? []) {
        lines.push(ev);
        keys.push(undefined);
      }
      for (const ch of room.choicesThisYear[countryId] ?? []) {
        if (ch.newsLines) {
          lines.push(liberal ? ch.newsLines.liberal : ch.newsLines.state);
          if (ch.cardId !== undefined && ch.choiceIdx !== undefined) {
            keys.push(`pr_${ch.cardId}_${ch.choiceIdx}_${liberal ? 'liberal' : 'state'}`);
          } else {
            keys.push(undefined);
          }
        } else {
          lines.push(`${ch.speaker} предложил — лидер решил: «${ch.label}»`);
          if (ch.cardId !== undefined && ch.choiceIdx !== undefined) {
            keys.push(`pr_${ch.cardId}_${ch.choiceIdx}_default`);
          } else {
            keys.push(undefined);
          }
        }
      }
      // войны, объявленные в этом году, и заключённый мир — в сводку агрессора/сторон
      for (const war of room.world.wars) {
        if (war.startedYear === year && war.attacker.countryIds[0] === countryId) {
          const targetName =
            this.content.countries.get(war.defender.countryIds[0]!)?.name ?? '?';
          lines.push(`Объявлена война «${targetName}». Обоснование: «${war.casusBelli}»`);
          keys.push(undefined);
        }
        if (war.endedYear === year && war.winnerSide === null && sideOf(war, countryId)) {
          lines.push('Подписан мирный договор — война окончена');
          keys.push(undefined);
        }
      }
      // публичные обещания этого года (фича 11) — оглашаем в сводке давшего
      for (const pr of room.promises) {
        if (pr.year === year && pr.public && pr.fromCountryId === countryId) {
          lines.push(`Публичное обещание стране «${pr.toName}»: «${pr.text}»`);
          keys.push(undefined);
        }
      }
      if (lines.length === 0) {
        lines.push('Год прошёл тихо. Подозрительно тихо.');
        keys.push(undefined);
      }
      news[countryId] = lines;
      newsPrerenderKeys[countryId] = keys;
    }

    room.news = news;

    // Э8: в момент конца Кабинета ставим задания на TTS (по одному на строку) и картинки.
    // Per-line TTS: клиент синхронизирует субтитры с audio.onended (каraoke-режим).
    // Если для строки есть пре-рендер — используем его напрямую, не ставим новое задание.
    room.newsAssets = {};
    for (const [countryId, lines] of Object.entries(news)) {
      const countryName = this.content.countries.get(countryId)?.name ?? countryId;
      const slot = (room.newsAssets[countryId] ??= {});
      slot.lineAudioUrls = new Array(lines.length).fill(null) as (string | null)[];
      const keys = newsPrerenderKeys[countryId] ?? [];
      for (const [lineIndex, line] of lines.entries()) {
        const key = keys[lineIndex];
        if (key) {
          const url = this.ml.getPrerenderUrl(key);
          if (url) {
            slot.lineAudioUrls[lineIndex] = url;
            continue;
          }
        }
        void this.ml.enqueue({
          type: 'tts',
          priority: 'high',
          payload: { text: line, style: 'новостной диктор, ироничный', lineIndex },
          roomCode: room.code,
          year,
          countryId,
        });
      }
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

  // ---------- война (Э10) ----------

  warDeclare(code: string, playerId: string, targetCountryId: string, casusBelli: string) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    const text = String(casusBelli ?? '').trim().slice(0, 300);
    if (!text) throw new Error('Нужно обоснование войны — ООН будет судить');

    const war = declareWar(room.world, player.countryId, targetCountryId, text, this.content);

    const attackerName = this.content.countries.get(player.countryId)!.name;
    const targetName = this.content.countries.get(targetCountryId)!.name;
    this.server?.to(room.code).emit(SocketEvents.GameAnnouncement, {
      title: '⚔️ ОБЪЯВЛЕНА ВОЙНА',
      text: `«${attackerName}» объявила войну «${targetName}». Обоснование: «${text}». ООН рассмотрит его на ближайшем заседании.`,
    });
    this.botLog(room, `${player.name} объявил войну ${targetName}: «${text}»`);
    this.persist(room);
    this.broadcast(room);
    return { warId: war.id };
  }

  warInvest(code: string, playerId: string, warId: string, amount: number) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    const war = room.world.wars.find((w) => w.id === warId);
    if (!war) throw new Error('Война не найдена');
    investInWar(room.world, war, player.countryId, Number(amount));
    this.persist(room);
    this.broadcast(room);
    const side = sideOf(war, player.countryId);
    return { invested: war[side!].investedThisYear[player.countryId] ?? 0 };
  }

  warJoin(code: string, playerId: string, warId: string, side: 'attacker' | 'defender') {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (side !== 'attacker' && side !== 'defender') throw new Error('Сторона: attacker или defender');
    const war = room.world.wars.find((w) => w.id === warId);
    if (!war) throw new Error('Война не найдена');
    joinWar(room.world, war, player.countryId, side);

    const joinerName = this.content.countries.get(player.countryId)!.name;
    const leaderName =
      this.content.countries.get(war[side].countryIds[0]!)?.name ?? war[side].countryIds[0];
    this.server?.to(room.code).emit(SocketEvents.GameAnnouncement, {
      title: '🤝 КОАЛИЦИЯ РАСШИРЯЕТСЯ',
      text: `«${joinerName}» вступила в войну на стороне «${leaderName}».`,
    });
    this.persist(room);
    this.broadcast(room);
  }

  /** Суд ООН: голос по справедливости войны (бесплатно, не-участники, 1 голос). */
  warVote(code: string, playerId: string, warId: string, verdict: 'just' | 'unjust') {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'un_vote');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (verdict !== 'just' && verdict !== 'unjust') throw new Error('Вердикт: just или unjust');
    const war = room.world.wars.find((w) => w.id === warId);
    if (!war || war.unVerdict !== 'pending') throw new Error('Эта война не на рассмотрении');
    if (sideOf(war, player.countryId)) throw new Error('Участники войны не голосуют о её справедливости');
    if (room.warVotes.some((v) => v.warId === warId && v.voterCountryId === player.countryId)) {
      throw new Error('Вы уже голосовали по этой войне');
    }
    room.warVotes.push({ warId, voterCountryId: player.countryId, verdict });
    this.persist(room);
    this.broadcast(room);
  }

  /** Трата очков победителя лидером победившей стороны (в кабинете после победы). */
  warSpendPoints(code: string, playerId: string, warId: string, reward: WarRewardKind) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (reward !== 'loot' && reward !== 'kontributsiya') throw new Error('Награда: loot или kontributsiya');
    const war = room.world.wars.find((w) => w.id === warId);
    if (!war) throw new Error('Война не найдена');
    const result = applyVictorReward(room.world, war, player.countryId, reward, this.content);
    recomputeAuras(room.world, this.content);
    this.botLog(room, `${player.name}: ${result.description}`);
    this.persist(room);
    this.broadcast(room);
    return { description: result.description, pointsLeft: war.victorPointsRemaining };
  }

  /** Итоги года: применяем голосование ООН, вердикты по войнам, затем tick движка. */
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

    // суд ООН по войнам (Э10): большинство «несправедливо» → санкции агрессору
    const warEventLines: Record<string, string[]> = {};
    for (const war of room.world.wars.filter((w) => w.unVerdict === 'pending')) {
      const votes = room.warVotes.filter((v) => v.warId === war.id);
      const unjust = votes.filter((v) => v.verdict === 'unjust').length;
      const just = votes.length - unjust;
      war.unVerdict = unjust > just ? 'unjust' : 'just';
      const aggressorId = war.attacker.countryIds[0]!;
      const aggressor = room.world.countries.get(aggressorId);
      if (war.unVerdict === 'unjust' && aggressor) {
        aggressor.sanctions += t.war.unjustSanctions;
        aggressor.sanctionsReceivedTotal += t.war.unjustSanctions;
        (warEventLines[aggressorId] ??= []).push(
          'ООН признала войну несправедливой: агрессор под санкциями',
        );
      } else {
        (warEventLines[aggressorId] ??= []).push('ООН признала войну справедливой');
      }
    }
    room.warVotes = [];

    // снимок «до» для личных сводок года (Э10)
    const before = captureBefore(room.world, this.content);

    const report = tick(room.world, this.content, makeRng(room.world.seed + room.rngNonce++));

    // объявление о переворотах
    for (const ev of report.events) {
      if (ev.kind === 'coup') {
        const countryName = this.content.countries.get(ev.countryId)?.name ?? ev.countryId;
        this.server?.to(room.code).emit('game:announcement', {
          title: '⚡ ГОСУДАРСТВЕННЫЙ ПЕРЕВОРОТ',
          text: `В ${countryName} случился военный переворот! Казна разграблена, власть сменилась.`,
        });
      }
    }

    // публичные события пересчёта — в фазу Итогов и в сводку следующего года
    const publicEvents: Record<string, string[]> = {};
    for (const ev of report.events.filter((e) => !e.hidden)) {
      (publicEvents[ev.countryId] ??= []).push(ev.text);
    }
    for (const [countryId, net] of tally) {
      if (net > 0) (publicEvents[countryId] ??= []).push('ООН ввела санкции');
      else if (net < 0) (publicEvents[countryId] ??= []).push('ООН выразила поддержку');
    }
    for (const [countryId, lines] of Object.entries(warEventLines)) {
      (publicEvents[countryId] ??= []).push(...lines);
    }
    room.lastTickEvents = publicEvents;

    // личные сводки года (фаза year_summary)
    const unLines: Record<string, string[]> = {};
    for (const [countryId, net] of tally) {
      if (net > 0) (unLines[countryId] ??= []).push('ООН ввела против вас санкции');
      else if (net < 0) (unLines[countryId] ??= []).push('ООН выразила вам поддержку');
    }
    for (const [countryId, lines] of Object.entries(warEventLines)) {
      (unLines[countryId] ??= []).push(...lines);
    }
    room.yearReports = buildYearReports(room.world, before, report, unLines, this.content);

    // объявление о решающих победах в войнах
    for (const war of room.world.wars.filter((w) => w.endedYear === report.year && w.winnerSide)) {
      const winnerId = war[war.winnerSide!].countryIds[0]!;
      const winnerName = this.content.countries.get(winnerId)?.name ?? winnerId;
      this.server?.to(room.code).emit('game:announcement', {
        title: '⚔️ ВОЙНА ОКОНЧЕНА',
        text: `«${winnerName}» одержала решающую победу (${war.attacker.score}:${war.defender.score}). Победитель выбирает трофеи.`,
      });
    }

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
    room.currentCards[countryId] = drawCard(s, def, this.content, rng, room.world.year);
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
    let wonderFallback: string | null = null;
    if (typeof wonderId === 'string') {
      try {
        buildWonder(room.world, s, wonderId, this.content);
        // чудо могло включить глобальную ауру (Э10)
        recomputeAuras(room.world, this.content);
      } catch (e) {
        if (e instanceof WonderError) {
          const wonderName = this.content.statuses.get(wonderId)?.name ?? wonderId;
          const fallbackName = (card.choices[choiceIndex] as Record<string, unknown>).wonderFallbackName as string | undefined;
          wonderFallback = fallbackName ?? `аналог «${wonderName}»`;
          if (this.server) {
            this.server.to(room.code).emit(SocketEvents.GameAnnouncement, {
              title: `${wonderName} уже занято!`,
              text: `У вашей страны получился ${wonderFallback}. Сочувствуем 🤝`,
            });
          }
        } else throw e;
      }
    }

    applyChoice(s, card, choiceIndex, room.world.year, this.content);
    const choiceData = card.choices[choiceIndex]!;
    (room.choicesThisYear[player.countryId] ??= []).push({
      speaker: card.speaker,
      label: choiceData.label,
      newsLines: (choiceData as Record<string, unknown>).newsLines as { liberal: string; state: string } | undefined,
      cardId: card.id,
      choiceIdx: choiceIndex,
    });
    room.cardsChosenThisYear[player.countryId] = (room.cardsChosenThisYear[player.countryId] ?? 0) + 1;
    const cardsPerTurn = this.content.tunables.cabinet?.cardsPerTurn ?? 5;
    if ((room.cardsChosenThisYear[player.countryId] ?? 0) < cardsPerTurn) {
      this.dealCard(room, player.countryId);
    } else {
      room.currentCards[player.countryId] = null;
    }
    this.persist(room);
    this.broadcast(room);
    return { wonderFallback };
  }

  spyOrder(
    code: string,
    playerId: string,
    kind: SpyActionKind,
    targetCountryId: string,
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
    if (targetCountryId === player.countryId) {
      throw new Error('Эта операция — только против чужих');
    }

    const rng = makeRng(room.world.seed + room.rngNonce++);
    const outcome = resolveSpyAction(attacker, target, kind, room.world, this.content, rng);
    room.spyOrdersLeft[player.countryId] = left - 1;
    room.spyOrders.push({
      year: room.world.year,
      attackerCountryId: player.countryId,
      targetCountryId,
      kind,
      outcome,
    });

    // успешный reveal сразу даёт донесение (и по ресурсам, и по звонками)
    if (kind === 'reveal' && outcome.success) {
      const now = Date.now();
      const calls = room.callLog
        .filter((e) => e.fromCountryId === targetCountryId || e.toCountryId === targetCountryId)
        .map((e) => ({
          withCountryId: e.fromCountryId === targetCountryId ? e.toCountryId : e.fromCountryId,
          year: e.year,
          durationSec: Math.max(1, Math.round(((e.endedAt ?? now) - e.startedAt) / 1000)),
          ongoing: e.endedAt === null,
        }));

      (room.intel[playerId] ??= []).push({
        year: room.world.year,
        targetCountryId,
        kind: 'reveal',
        data: {
          resources: { ...target.resources },
          sectors: { ...target.sectors },
          dovolstvo: Math.round(target.dovolstvo),
          forbesTotal: Math.round(computeForbes(target, this.content).total),
          declaredForbes: target.declaredForbes,
        },
        calls,
      });

      // Включаем прослушку для этого игрока на цель в текущем году (фича 12)
      room.wiretaps.push({
        spyPlayerId: playerId,
        targetCountryId,
        year: room.world.year,
      });
    }

    if (kind === 'financial_sabotage' && outcome.success) {
      const targetSocketId = room.players.find((p) => p.countryId === targetCountryId)?.socketId;
      if (targetSocketId) {
        const text = target.delayed[target.delayed.length - 1]?.description ?? 'Ваша казна была ограблена!';
        this.server?.to(targetSocketId).emit('game:announcement', {
          title: '💸 ФИНАНСОВАЯ ДИВЕРСИЯ',
          text,
        });
      }
    }

    this.persist(room);
    this.broadcast(room);
    return outcome;
  }

  // ---------- дипломатия: ящик предложений (раздел 9) ----------

  tradeOffer(
    code: string,
    playerId: string,
    toCountryId: string,
    give: TradeSidePayload,
    take: TradeSidePayload,
    peaceWarId?: string,
  ) {
    const room = this.mustRoom(code);
    this.assertPhase(room, 'cabinet');
    const player = this.mustPlayer(room, playerId);
    if (!player.countryId || !room.world) throw new Error('Нет страны');
    if (toCountryId === player.countryId) throw new Error('Сделка с собой — это просто бюджет');
    if (!room.world.countries.has(toCountryId)) throw new Error('Нет такой страны');

    const cleanGive = this.cleanSide(give);
    const cleanTake = this.cleanSide(take);

    // 🕊 мирное предложение (Э10): стороны должны быть по разные стороны активной войны
    let peace: string | undefined;
    if (peaceWarId) {
      const war = room.world.wars.find((w) => w.id === peaceWarId);
      if (!war || war.status !== 'active') throw new Error('Эта война уже не идёт');
      const mySide = sideOf(war, player.countryId);
      const theirSide = sideOf(war, toCountryId);
      if (!mySide || !theirSide || mySide === theirSide) {
        throw new Error('Мир предлагают противнику по войне');
      }
      peace = peaceWarId;
    }

    if (this.sideEmpty(cleanGive) && this.sideEmpty(cleanTake) && !peace) {
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
      ...(peace ? { peaceWarId: peace } : {}),
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
      if (!offer.peaceWarId && (from.resources.money < 0 || to.resources.money < 0)) {
        offer.status = 'failed';
        offer.failReason = 'Торговля заблокирована: один из участников в долгу (отрицательный баланс)';
        this.persist(room);
        this.broadcast(room);
        return;
      }
      try {
        // сервер валидирует и применяет атомарно; обещания не enforced
        applyTrade(from, to, { from: from.id, to: to.id, give: offer.give, take: offer.take }, this.content);
        offer.status = 'accepted';
        this.recordPromises(room, offer);
        // 🕊 мирное предложение: принятие завершает войну (Э10)
        if (offer.peaceWarId) {
          const war = room.world.wars.find((w) => w.id === offer.peaceWarId);
          if (war && war.status === 'active') {
            endWarByPeace(room.world, war.id);
            this.server?.to(room.code).emit(SocketEvents.GameAnnouncement, {
              title: '🕊 МИР',
              text: `«${offer.fromName}» и «${offer.toName}» подписали мирный договор. Война окончена.`,
            });
          }
        }
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
      if (side.promisePublic) out.promisePublic = true;
    }
    return out;
  }

  private sideEmpty(side: TradeSidePayload): boolean {
    return !side.resources && !side.population && !side.statuses && !side.promise;
  }

  /** Записать обещания принятой сделки в реестр (фича 11; без последствий — только видимость). */
  private recordPromises(room: RoomState, offer: TradeOfferView): void {
    if (!room.world) return;
    const year = room.world.year;
    const add = (
      side: TradeSidePayload,
      fromId: string,
      fromName: string,
      toId: string,
      toName: string,
    ) => {
      if (!side.promise) return;
      room.promises.push({
        id: randomUUID(),
        year,
        fromCountryId: fromId,
        fromName,
        toCountryId: toId,
        toName,
        text: side.promise,
        public: Boolean(side.promisePublic),
      });
    };
    add(offer.give, offer.fromCountryId, offer.fromName, offer.toCountryId, offer.toName);
    add(offer.take, offer.toCountryId, offer.toName, offer.fromCountryId, offer.fromName);
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

  // ---------- тест-режим: боты (для одиночной отладки баланса) ----------

  /** Добить комнату ботами. Только хост, только в лобби. */
  addBots(code: string, playerId: string, count: number) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (!player.isHost) throw new Error('Ботов добавляет хост');
    if (room.phase !== 'lobby') throw new Error('Ботов добавляют в лобби');

    const names = ['Бот Диктатор', 'Бот Олигарх', 'Бот Генерал', 'Бот Шейх', 'Бот Канцлер', 'Бот Председатель', 'Бот Султан', 'Бот Регент'];
    const free = this.content.tunables.game.playersMax - room.players.length;
    const n = Math.max(0, Math.min(Number(count) || 5, free));
    for (let i = 0; i < n; i++) {
      const name = names.find((nm) => !room.players.some((p) => p.name === nm)) ?? `Бот №${i}`;
      const bot = this.makePlayer(name, false);
      bot.isBot = true;
      bot.connected = true; // бот живёт на сервере — паузу не вызывает
      room.players.push(bot);
    }
    this.persist(room);
    this.broadcast(room);
    return { added: n };
  }

  /** Лог действий ботов — в консоль браузера всем живым игрокам. */
  private botLog(room: RoomState, text: string) {
    if (!this.server) return;
    for (const p of room.players) {
      if (p.socketId) this.server.to(p.socketId).emit(SocketEvents.BotLog, { text, ts: Date.now() });
    }
  }

  private clearBotTimers(room: RoomState) {
    const timers = this.timers.get(room.code);
    if (!timers) return;
    for (const t of timers.botTimers) clearTimeout(t);
    timers.botTimers = [];
  }

  private botSchedule(room: RoomState, ms: number, fn: () => void) {
    const timers = this.timers.get(room.code);
    if (!timers) return;
    timers.botTimers.push(setTimeout(fn, ms));
  }

  private bots(room: RoomState): RoomPlayer[] {
    return room.players.filter((p) => p.isBot && p.countryId);
  }

  /** Хуки фаз: что боты делают в каждой фазе. */
  private kickBots(room: RoomState) {
    if (this.bots(room).length === 0) return;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    if (room.phase === 'cabinet') {
      for (const bot of this.bots(room)) {
        const act = () => {
          if (room.phase !== 'cabinet' || room.paused) return;
          try {
            this.botCabinetAction(room, bot);
          } catch {
            /* невалидное действие бота — просто пропуск хода */
          }
          this.botSchedule(room, rnd(4000, 9000), act);
        };
        this.botSchedule(room, rnd(1000, 4000), act);
      }
      // с вероятностью 40% один бот позвонит живому игроку через 8-20с
      const humanPlayers = room.players.filter((p) => !p.isBot && p.connected && p.countryId);
      const bots = this.bots(room);
      if (bots.length > 0 && humanPlayers.length > 0 && Math.random() < 0.4) {
        const bot = bots[Math.floor(Math.random() * bots.length)]!;
        const human = humanPlayers[Math.floor(Math.random() * humanPlayers.length)]!;
        this.botSchedule(room, rnd(8000, 20000), () => {
          if (room.phase !== 'cabinet' || !bot.countryId || !human.countryId) return;
          // проверяем: нет ли уже активного звонка у бота
          const busy = room.calls.some(
            (c) => c.status !== 'ended' && (c.fromCountryId === bot.countryId || c.toCountryId === bot.countryId),
          );
          if (busy) return;
          try {
            this.callInvite(room.code, bot.playerId, human.countryId);
            this.botLog(room, `${bot.name} звонит игроку ${human.name}`);
          } catch { /* не хватило лимита */ }
        });
      }
    }

    if (room.phase === 'un_summary') {
      // боты заявляют (лживый) Форбс
      for (const bot of this.bots(room)) {
        this.botSchedule(room, rnd(500, 2000), () => {
          if (!room.world || !bot.countryId) return;
          const s = room.world.countries.get(bot.countryId)!;
          const real = Math.round(computeForbes(s, this.content).total);
          const declared = Math.round(real * rnd(0.3, 1.8));
          s.declaredForbes = declared;
          this.botLog(room, `${bot.name} заявил Форбс ${declared} (реально ${real})`);
          this.persist(room);
          this.broadcast(room);
        });
      }
    }

    if (room.phase === 'un_comments') this.botMaybeSpeak(room);

    if (room.phase === 'un_vote') {
      for (const bot of this.bots(room)) {
        this.botSchedule(room, rnd(800, 2500), () => {
          if (room.phase !== 'un_vote' || !room.world || !bot.countryId) return;
          const targets = room.players.filter((p) => p.countryId && p.countryId !== bot.countryId);
          if (targets.length === 0) return;
          const target = targets[Math.floor(Math.random() * targets.length)]!;
          const kind = Math.random() < 0.6 ? 'sanction' : 'support';
          try {
            this.unVote(room.code, bot.playerId, target.countryId!, kind);
            this.botLog(room, `${bot.name} голосует: ${kind === 'sanction' ? 'санкции против' : 'поддержать'} ${this.content.countries.get(target.countryId!)!.name}`);
          } catch {
            /* не хватило влияния */
          }
        });
        // суд ООН по войнам: бот голосует по каждой pending-войне (60% «несправедливо»)
        this.botSchedule(room, rnd(1000, 3000), () => {
          if (room.phase !== 'un_vote' || !room.world || !bot.countryId) return;
          for (const war of room.world.wars.filter((w) => w.unVerdict === 'pending')) {
            const verdict = Math.random() < 0.6 ? 'unjust' : 'just';
            try {
              this.warVote(room.code, bot.playerId, war.id, verdict);
              this.botLog(room, `${bot.name} судит войну: ${verdict === 'unjust' ? 'несправедлива' : 'справедлива'}`);
            } catch {
              /* участник или уже голосовал */
            }
          }
        });
      }
    }
  }

  /** Если сейчас говорит бот — он «выступает» и передаёт слово. */
  private botMaybeSpeak(room: RoomState) {
    const speakerId = room.speakerOrder[room.speakerIdx];
    const speaker = room.players.find((p) => p.playerId === speakerId);
    if (!speaker?.isBot) return;
    this.botSchedule(room, 2500, () => {
      if (room.phase !== 'un_comments' || room.speakerOrder[room.speakerIdx] !== speakerId) return;
      this.botLog(room, `${speaker.name} выступил с пламенной речью и передал слово`);
      this.nextSpeaker(room);
    });
  }

  private botCabinetAction(room: RoomState, bot: RoomPlayer) {
    if (!room.world || !bot.countryId) return;
    const myCountry = this.content.countries.get(bot.countryId)!;

    // 1) сначала ответить на входящие сделки
    const pending = room.tradeOffers.find((o) => o.toCountryId === bot.countryId && o.status === 'pending');
    if (pending) {
      // мирное предложение бот принимает охотнее (80%), если его сторона проигрывает
      let acceptChance = 0.6;
      if (pending.peaceWarId) {
        const war = room.world.wars.find((w) => w.id === pending.peaceWarId);
        const mySide = war && bot.countryId ? sideOf(war, bot.countryId) : null;
        if (war && mySide) {
          const other = mySide === 'attacker' ? 'defender' : 'attacker';
          acceptChance = war[mySide].score < war[other].score ? 0.8 : 0.4;
        }
      }
      const accept = Math.random() < acceptChance;
      const res = this.tradeRespond(room.code, bot.playerId, pending.id, accept);
      this.botLog(room, `${bot.name} ${accept ? 'принял' : 'отклонил'} ${pending.peaceWarId ? 'мирное предложение' : 'сделку'} от ${pending.fromName}${res?.status === 'failed' ? ` (сорвалась: ${res.failReason})` : ''}`);
      return;
    }

    const others = room.players.filter((p) => p.countryId && p.countryId !== bot.countryId);
    const roll = Math.random();

    // 2) свайп карты (основное действие)
    if (roll < 0.75) {
      const card = room.currentCards[bot.countryId];
      if (!card) return;
      const idx = Math.floor(Math.random() * card.choices.length);
      this.chooseCard(room.code, bot.playerId, card.id, idx);
      this.botLog(room, `${bot.name} (${myCountry.name}): «${card.speaker}» → выбрал «${card.choices[idx]!.label}»`);
      return;
    }

    // 3) шпионаж
    if (roll < 0.87 && others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)]!;
      const kinds = ['reveal', 'steal_science', 'provoke_riot'] as const;
      const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
      const out = this.spyOrder(room.code, bot.playerId, kind, target.countryId!);
      this.botLog(room, `${bot.name} шпионит (${kind}) против ${this.content.countries.get(target.countryId!)!.name}: ${out.success ? 'успех' : 'провал'}`);
      return;
    }

    // 4) предложить сделку
    if (others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)]!;
      const s = room.world.countries.get(bot.countryId)!;
      const money = Math.min(100, Math.floor(s.resources.money * 0.1));
      if (money < 10) return;
      this.tradeOffer(room.code, bot.playerId, target.countryId!, { resources: { money } }, { resources: { gold: Math.max(5, Math.floor(money / 5)) } });
      this.botLog(room, `${bot.name} предложил ${this.content.countries.get(target.countryId!)!.name}: 💰${money} ⇄ 🥇${Math.max(5, Math.floor(money / 5))}`);
    }
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
    // Оставляем только проверку, что мы сами не звоним кому-то еще.
    if (room.calls.some((c) => c.status !== 'ended' && c.fromCountryId === player.countryId)) {
      throw new Error('Вы уже совершаете исходящий звонок');
    }

    room.callsLeft[player.countryId] = left - 1;
    const call = { id: randomUUID(), fromCountryId: player.countryId, toCountryId, status: 'ringing' as const };
    room.calls.push(call);

    // бот принимает с вероятностью ~80%, заканчивает через 15-30с
    const targetPlayer = room.players.find((p) => p.countryId === toCountryId);
    if (targetPlayer?.isBot) {
      const accept = Math.random() < 0.8;
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);
      this.botSchedule(room, rnd(1500, 3000), () => {
        try { this.callRespond(room.code, targetPlayer.playerId, call.id, accept); } catch { return; }
        if (accept) {
          this.botLog(room, `${targetPlayer.name} принял звонок`);
          this.botSchedule(room, rnd(15000, 30000), () => {
            try { this.callEnd(room.code, targetPlayer.playerId, call.id); } catch { /* already ended */ }
            this.botLog(room, `${targetPlayer.name} завершил звонок`);
          });
        } else {
          this.botLog(room, `${targetPlayer.name} отклонил звонок: «занят государственными делами»`);
        }
      });
    }

    const targetSocket = this.socketOfCountry(room, toCountryId);
    if (targetSocket && this.server) {
      this.server.to(targetSocket).emit(SocketEvents.CallIncoming, {
        callId: call.id,
        fromCountryId: player.countryId,
        fromName: player.name,
        fromCountryName: this.content.countries.get(player.countryId)!.name,
      });
    }

    setTimeout(() => {
      try {
        const r = this.rooms.get(code.toUpperCase());
        if (!r) return;
        const c = r.calls.find((x) => x.id === call.id);
        if (c && c.status === 'ringing') {
          c.status = 'ended';
          const fromSocket = this.socketOfCountry(r, c.fromCountryId);
          if (fromSocket && this.server) this.server.to(fromSocket).emit(SocketEvents.CallEnded, { callId: c.id });
          const toSocket = this.socketOfCountry(r, c.toCountryId);
          if (toSocket && this.server) this.server.to(toSocket).emit(SocketEvents.CallEnded, { callId: c.id });
          this.persist(r);
          this.broadcast(r);
        }
      } catch (e) {
        // ignore
      }
    }, 30000);

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
    if (accept) {
      // журнал звонков для шпионской прослушки (фича 10)
      room.callLog.push({
        callId: call.id,
        fromCountryId: call.fromCountryId,
        toCountryId: call.toCountryId,
        year: room.world?.year ?? 0,
        startedAt: Date.now(),
        endedAt: null,
      });
    }
    const fromSocket = this.socketOfCountry(room, call.fromCountryId);
    if (fromSocket && this.server) {
      this.server
        .to(fromSocket)
        .emit(accept ? SocketEvents.CallStarted : SocketEvents.CallEnded, { callId });
    }
    if (!accept) {
      const toSocket = this.socketOfCountry(room, call.toCountryId);
      if (toSocket && this.server) {
        this.server.to(toSocket).emit(SocketEvents.CallEnded, { callId });
      }
    }
    this.persist(room);
    // broadcast чтобы обновить очереди
    this.broadcast(room);
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
    const logEntry = [...room.callLog].reverse().find((e) => e.callId === call.id && e.endedAt === null);
    if (logEntry) logEntry.endedAt = Date.now();
    for (const cid of [call.fromCountryId, call.toCountryId]) {
      const sid = this.socketOfCountry(room, cid);
      if (sid && this.server) this.server.to(sid).emit(SocketEvents.CallEnded, { callId });
    }
    this.persist(room);
    // broadcast чтобы обновить очереди
    this.broadcast(room);
  }

  /** Проверка прав на видеокомнату: лобби/ООН — все; звонок — только участники. */
  videoRoomFor(code: string, playerId: string, kind: 'lobby' | 'un' | 'call', callId?: string): string {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    if (kind === 'lobby') {
      return `lobby-${room.code}`;
    }
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

  /** Право шпиона скрыто слушать конкретный активный созвон цели (фича 12). */
  wiretapRoomFor(code: string, playerId: string, callId: string): string {
    const room = this.mustRoom(code);
    const call = room.calls.find((c) => c.id === callId);
    if (!call || call.status !== 'active') throw new Error('Созвон не активен');
    const tapped = room.wiretaps.some(
      (w) =>
        w.spyPlayerId === playerId &&
        (w.targetCountryId === call.fromCountryId || w.targetCountryId === call.toCountryId),
    );
    if (!tapped) throw new Error('Нет действующей прослушки на этот созвон');
    return `call-${room.code}-${call.id}`;
  }

  // ---------- реконнект и пауза (раздел 13) ----------

  attachSocket(code: string, playerId: string, socketId: string) {
    const room = this.mustRoom(code);
    const player = this.mustPlayer(room, playerId);
    player.socketId = socketId;
    player.connected = true;

    if (room.paused && !room.manualPause && room.players.every((p) => p.connected)) {
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
    room.manualPause = false;
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
          cardsChosenThisYear: data.cardsChosenThisYear ?? {},
          readyPlayerIds: data.readyPlayerIds ?? [],
          sectorBudget: data.sectorBudget ?? {},
          waitingContinue: data.waitingContinue ?? false,
          votes: data.votes ?? [],
          news: data.news ?? null,
          newsAssets: data.newsAssets ?? {},
          newsCursor: data.newsCursor ?? null,
          calls: data.calls ?? [],
          callLog: data.callLog ?? [],
          promises: data.promises ?? [],
          wiretaps: data.wiretaps ?? [],
          lastTickEvents: data.lastTickEvents ?? null,
          manualPause: data.manualPause ?? false,
          unLayout: data.unLayout ?? 'auto',
          warVotes: data.warVotes ?? [],
          yearReports: data.yearReports ?? {},
          world: data.world ? deserializeWorld(data.world) : null,
        };
        // все соединения мертвы после рестарта (боты живут на сервере — остаются connected)
        for (const p of room.players) {
          p.connected = Boolean(p.isBot);
          p.socketId = null;
        }
        room.paused = room.phase !== 'lobby' && room.phase !== 'final';
        room.phaseEndsAt = null;
        if (room.remainingMs === null) room.remainingMs = this.phaseDuration(room, room.phase);
        this.rooms.set(room.code, room);
        this.timers.set(room.code, { botTimers: [] });
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
    for (const t of timers?.botTimers ?? []) clearTimeout(t);
    this.timers.delete(code);
    this.rooms.delete(code);
    this.redis.client.del(`room:${code}`).catch(() => undefined);
  }

  // ---------- админка ----------

  /** Список активных комнат для админ-панели (чтобы не висели и не жрали ресурсы). */
  listRoomsForAdmin() {
    return [...this.rooms.values()].map((r) => ({
      code: r.code,
      phase: r.phase,
      year: r.world?.year ?? null,
      paused: r.paused,
      phaseEndsAt: r.phaseEndsAt,
      humanCount: r.players.filter((p) => !p.isBot).length,
      botCount: r.players.filter((p) => p.isBot).length,
      players: r.players.map((p) => ({
        name: p.name,
        isHost: p.isHost,
        isBot: p.isBot ?? false,
        connected: p.connected,
        country: p.countryId ? (this.content.countries.get(p.countryId)?.name ?? null) : null,
      })),
    }));
  }

  /** Принудительно закрыть комнату: уведомить участников и снести из памяти/Redis. */
  killRoomForAdmin(code: string): boolean {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return false;
    this.server?.to(room.code).emit('game:announcement', {
      title: 'Сессия закрыта',
      text: 'Администратор завершил эту комнату.',
    });
    this.dropRoom(room.code);
    this.logger.log(`[${room.code}] закрыта администратором`);
    return true;
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
