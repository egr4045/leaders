import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SocketEvents } from '@leaders/shared';

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class GameGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage(SocketEvents.Ping)
  ping(@MessageBody() body: unknown) {
    // возвращаемое значение уходит ack-колбэком клиента
    // (поле `event` добавлять нельзя — Nest сочтёт это WsResponse и сделает emit вместо ack)
    return { pong: true, echo: body, ts: Date.now() };
  }
}
