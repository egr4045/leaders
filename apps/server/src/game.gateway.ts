import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SocketEvents, type TradeSidePayload } from '@leaders/shared';
import type { SpyActionKind } from '@leaders/engine';
import { RoomsService } from './game/rooms.service.js';
import { ContentService } from './content.service.js';
import { buildSnapshot } from './game/snapshot.builder.js';

interface SocketSession {
  roomCode: string;
  playerId: string;
}

/** ack-обёртка: все c2s-события отвечают {ok} или {ok:false, error}. */
function safe<T>(fn: () => T): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(GameGateway.name);
  private sessions = new Map<string, SocketSession>(); // socketId → сессия

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly rooms: RoomsService,
    private readonly contentService: ContentService,
  ) {}

  afterInit(server: Server) {
    this.rooms.setServer(server);
    void this.rooms.restoreFromRedis();
  }

  handleConnection(_socket: Socket) {}

  handleDisconnect(socket: Socket) {
    this.sessions.delete(socket.id);
    this.rooms.onDisconnect(socket.id);
  }

  @SubscribeMessage(SocketEvents.Ping)
  ping(@MessageBody() body: unknown) {
    return { pong: true, echo: body, ts: Date.now() };
  }

  // ---------- лобби ----------

  @SubscribeMessage(SocketEvents.RoomCreate)
  roomCreate(@ConnectedSocket() socket: Socket, @MessageBody() body: { name: string }) {
    return safe(() => {
      const { room, player } = this.rooms.createRoom(body?.name ?? '');
      this.sessions.set(socket.id, { roomCode: room.code, playerId: player.playerId });
      this.rooms.attachSocket(room.code, player.playerId, socket.id);
      return { roomCode: room.code, playerId: player.playerId, playerToken: player.token };
    });
  }

  @SubscribeMessage(SocketEvents.RoomJoin)
  roomJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { roomCode: string; name: string; playerToken?: string },
  ) {
    return safe(() => {
      const { room, player } = this.rooms.joinRoom(
        (body?.roomCode ?? '').toUpperCase(),
        body?.name ?? '',
        body?.playerToken,
      );
      this.sessions.set(socket.id, { roomCode: room.code, playerId: player.playerId });
      this.rooms.attachSocket(room.code, player.playerId, socket.id);
      return { roomCode: room.code, playerId: player.playerId, playerToken: player.token };
    });
  }

  @SubscribeMessage(SocketEvents.RoomPickCountry)
  pickCountry(@ConnectedSocket() socket: Socket, @MessageBody() body: { countryId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.pickCountry(s.roomCode, s.playerId, body?.countryId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.RoomLeave)
  roomLeave(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => {
      this.rooms.leaveRoom(s.roomCode, s.playerId);
      this.sessions.delete(socket.id);
    });
  }

  @SubscribeMessage(SocketEvents.RoomStart)
  roomStart(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.startGame(s.roomCode, s.playerId));
  }

  // ---------- Кабинет ----------

  @SubscribeMessage(SocketEvents.CabinetChoose)
  cabinetChoose(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { cardId: string; choiceIndex: number },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.chooseCard(s.roomCode, s.playerId, body?.cardId ?? '', Number(body?.choiceIndex)),
    );
  }

  @SubscribeMessage(SocketEvents.SpyOrder)
  spyOrder(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { kind: SpyActionKind; targetCountryId: string; payload?: string },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.spyOrder(s.roomCode, s.playerId, body?.kind, body?.targetCountryId ?? '', body?.payload),
    );
  }

  // ---------- дипломатия ----------

  @SubscribeMessage(SocketEvents.TradeOffer)
  tradeOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { toCountryId: string; give: TradeSidePayload; take: TradeSidePayload },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.tradeOffer(s.roomCode, s.playerId, body?.toCountryId ?? '', body?.give ?? {}, body?.take ?? {}),
    );
  }

  @SubscribeMessage(SocketEvents.TradeRespond)
  tradeRespond(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { offerId: string; accept: boolean },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.tradeRespond(s.roomCode, s.playerId, body?.offerId ?? '', Boolean(body?.accept)),
    );
  }

  @SubscribeMessage(SocketEvents.TradeCancel)
  tradeCancel(@ConnectedSocket() socket: Socket, @MessageBody() body: { offerId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.tradeCancel(s.roomCode, s.playerId, body?.offerId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.ForbesDeclare)
  forbesDeclare(@ConnectedSocket() socket: Socket, @MessageBody() body: { value: number }) {
    return this.withSession(socket, (s) =>
      this.rooms.declareForbes(s.roomCode, s.playerId, Number(body?.value)),
    );
  }

  // ---------- ООН ----------

  @SubscribeMessage(SocketEvents.UnCommentDone)
  unCommentDone(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => {
      const found = this.rooms.getRoomBySocket(socket.id);
      if (!found) throw new Error('Нет комнаты');
      const { room } = found;
      if (room.phase !== 'un_comments') throw new Error('Сейчас не круг комментариев');
      if (room.speakerOrder[room.speakerIdx] !== s.playerId) throw new Error('Сейчас говорит не вы');
      this.rooms.nextSpeaker(room);
    });
  }

  @SubscribeMessage(SocketEvents.UnVote)
  unVote(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { targetCountryId: string; kind: 'sanction' | 'support' },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.unVote(s.roomCode, s.playerId, body?.targetCountryId ?? '', body?.kind),
    );
  }

  // ---------- утилиты ----------

  /** Запросить актуальный снапшот (например, после reconnect до подписки). */
  @SubscribeMessage('room:sync')
  sync(@ConnectedSocket() socket: Socket) {
    const session = this.sessions.get(socket.id);
    if (!session) return { ok: false, error: 'Не в комнате' };
    const found = this.rooms.getRoomBySocket(socket.id);
    if (!found) return { ok: false, error: 'Комната не найдена' };
    return {
      ok: true,
      data: buildSnapshot(found.room, session.playerId, this.contentService.content),
    };
  }

  private withSession<T>(socket: Socket, fn: (s: SocketSession) => T) {
    const session = this.sessions.get(socket.id);
    if (!session) return { ok: false as const, error: 'Сначала войдите в комнату' };
    return safe(() => fn(session));
  }
}
