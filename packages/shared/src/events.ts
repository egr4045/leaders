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

  // состояние (s2c)
  RoomState: 'room:state',

  // фаза Кабинет (c2s)
  CabinetDraw: 'cabinet:draw',
  CabinetChoose: 'cabinet:choose',
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
