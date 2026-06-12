/**
 * Имена socket.io-событий — единственный источник истины для клиента и сервера.
 * c2s = клиент→сервер (с ack-колбэком), s2c = сервер→клиент (broadcast).
 */
export const SocketEvents = {
  // диагностика
  Ping: 'ping',
  Pong: 'pong',

  // лобби (c2s)
  RoomCreate: 'room:create',
  RoomJoin: 'room:join',
  RoomLeave: 'room:leave',
  RoomStart: 'room:start',
  RoomPickCountry: 'room:pick_country',
  /** тест-режим: добить комнату ботами (хост) */
  RoomAddBots: 'room:add_bots',
  /** тест-режим: добить комнату ботами (хост) */
  RoomHostContinue: 'room:host_continue',
  /** хост: продлить/завершить дебаты досрочно (c2s) */
  RoomHostExtend: 'room:host_extend',
  /** председатель: ручная пауза/возобновление (c2s, { paused }) */
  RoomHostPause: 'room:host_pause',
  /** председатель: перейти к сегменту ООН вне порядка (c2s, { phase }) */
  RoomHostSetPhase: 'room:host_set_phase',
  /** председатель: дать слово конкретному игроку (c2s, { playerId }) */
  RoomHostSetSpeaker: 'room:host_set_speaker',
  /** председатель: пропустить текущего спикера (c2s) */
  RoomHostSkipSpeaker: 'room:host_skip_speaker',
  /** председатель: принудительная раскладка видео ООН (c2s, { layout }) */
  RoomHostLayout: 'room:host_layout',
  /** председатель: попросить игрока замьютиться (c2s, { playerId }) */
  RoomHostMute: 'room:host_mute',
  /** s2c: председатель выключил вам микрофон (можно включить обратно) */
  VideoForceMute: 'video:force_mute',
  /** s2c: что сделал бот (для отладки баланса в консоли браузера) */
  BotLog: 'bot:log',
  /** s2c: важное объявление поверх экрана */
  GameAnnouncement: 'game:announcement',

  // состояние (s2c)
  RoomState: 'room:state',

  // фаза Кабинет (c2s)
  CabinetDraw: 'cabinet:draw',
  CabinetChoose: 'cabinet:choose',
  CabinetReady: 'cabinet:ready',
  CabinetSetBudget: 'cabinet:set_budget',
  SpyOrder: 'spy:order',

  // дипломатия (Э5)
  TradeOffer: 'trade:offer',
  TradeRespond: 'trade:respond',
  TradeCancel: 'trade:cancel',

  // фаза ООН (Э6)
  UnCommentDone: 'un:comment_done',
  UnVote: 'un:vote',
  ForbesDeclare: 'forbes:declare',

  // видео (Э7): токены LiveKit и приватные звонки
  VideoToken: 'video:token',
  CallInvite: 'call:invite',
  CallAccept: 'call:accept',
  CallDecline: 'call:decline',
  CallEnd: 'call:end',
  /** s2c: входящий звонок */
  CallIncoming: 'call:incoming',
  /** s2c: звонок принят/начался */
  CallStarted: 'call:started',
  /** s2c: звонок завершён/отклонён */
  CallEnded: 'call:ended',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
