import { io, Socket } from 'socket.io-client';

/** Единственный сокет на всё приложение; подключается через Vite-прокси (/socket.io). */
export const socket: Socket = io({ autoConnect: true });
