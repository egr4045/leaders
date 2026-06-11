/**
 * Имена socket.io-событий — единственный источник истины для клиента и сервера.
 * Заполняется по мере реализации этапов.
 */
export const SocketEvents = {
  /** клиент → сервер: проверка связи */
  Ping: 'ping',
  /** сервер → клиент: ответ на ping */
  Pong: 'pong',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
