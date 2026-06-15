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
import { SocketEvents, type GamePhase, type TradeSidePayload } from '@leaders/shared';
import { AccessToken } from 'livekit-server-sdk';
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

  @SubscribeMessage(SocketEvents.RoomAddBots)
  addBots(@ConnectedSocket() socket: Socket, @MessageBody() body: { count?: number }) {
    return this.withSession(socket, (s) =>
      this.rooms.addBots(s.roomCode, s.playerId, Number(body?.count) || 5),
    );
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

  @SubscribeMessage(SocketEvents.CabinetReady)
  cabinetReady(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.markReady(s.roomCode, s.playerId));
  }

  @SubscribeMessage(SocketEvents.CabinetSetBudget)
  cabinetSetBudget(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { budget: Record<string, number> },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.setBudget(s.roomCode, s.playerId, body?.budget ?? {}),
    );
  }

  @SubscribeMessage(SocketEvents.CabinetAdoptLaw)
  cabinetAdoptLaw(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { lawId: string },
  ) {
    return this.withSession(socket, (s) => this.rooms.adoptLaw(s.roomCode, s.playerId, body?.lawId ?? ''));
  }

  @SubscribeMessage(SocketEvents.CabinetCancelLaw)
  cabinetCancelLaw(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { lawId: string },
  ) {
    return this.withSession(socket, (s) => this.rooms.cancelLaw(s.roomCode, s.playerId, body?.lawId ?? ''));
  }

  @SubscribeMessage(SocketEvents.CabinetRejectLaw)
  cabinetRejectLaw(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { lawId: string },
  ) {
    return this.withSession(socket, (s) => this.rooms.rejectLaw(s.roomCode, s.playerId, body?.lawId ?? ''));
  }

  @SubscribeMessage(SocketEvents.RoomHostContinue)
  hostContinue(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.hostContinue(s.roomCode, s.playerId));
  }

  @SubscribeMessage(SocketEvents.RoomHostExtend)
  hostExtendPhase(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { extraSeconds: number },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.hostExtendPhase(s.roomCode, s.playerId, body?.extraSeconds ?? 120),
    );
  }

  // ---------- председатель ООН ----------

  @SubscribeMessage(SocketEvents.RoomHostPause)
  hostPause(@ConnectedSocket() socket: Socket, @MessageBody() body: { paused: boolean }) {
    return this.withSession(socket, (s) =>
      this.rooms.hostPause(s.roomCode, s.playerId, Boolean(body?.paused)),
    );
  }

  @SubscribeMessage(SocketEvents.RoomHostSetPhase)
  hostSetPhase(@ConnectedSocket() socket: Socket, @MessageBody() body: { phase: GamePhase }) {
    return this.withSession(socket, (s) =>
      this.rooms.hostSetPhase(s.roomCode, s.playerId, body?.phase),
    );
  }

  @SubscribeMessage(SocketEvents.RoomHostSetSpeaker)
  hostSetSpeaker(@ConnectedSocket() socket: Socket, @MessageBody() body: { playerId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.hostSetSpeaker(s.roomCode, s.playerId, body?.playerId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.RoomHostSkipSpeaker)
  hostSkipSpeaker(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.hostSkipSpeaker(s.roomCode, s.playerId));
  }

  @SubscribeMessage(SocketEvents.RoomHostNewsSkip)
  hostNewsSkip(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.hostNewsSkip(s.roomCode, s.playerId));
  }

  @SubscribeMessage(SocketEvents.RoomHostLayout)
  hostLayout(@ConnectedSocket() socket: Socket, @MessageBody() body: { layout: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.hostSetLayout(s.roomCode, s.playerId, body?.layout ?? 'auto'),
    );
  }

  @SubscribeMessage(SocketEvents.RoomHostMute)
  hostMute(@ConnectedSocket() socket: Socket, @MessageBody() body: { playerId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.hostMute(s.roomCode, s.playerId, body?.playerId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.RoomHostResume)
  hostResume(@ConnectedSocket() socket: Socket) {
    return this.withSession(socket, (s) => this.rooms.hostResume(s.roomCode, s.playerId));
  }

  @SubscribeMessage(SocketEvents.RoomKick)
  kickPlayer(@ConnectedSocket() socket: Socket, @MessageBody() body: { targetPlayerId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.kickPlayer(s.roomCode, s.playerId, body?.targetPlayerId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.SpyOrder)
  spyOrder(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { kind: SpyActionKind; targetCountryId: string },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.spyOrder(s.roomCode, s.playerId, body?.kind, body?.targetCountryId ?? ''),
    );
  }

  // ---------- дипломатия ----------

  @SubscribeMessage(SocketEvents.TradeOffer)
  tradeOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { toCountryId: string; give: TradeSidePayload; take: TradeSidePayload; peaceWarId?: string },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.tradeOffer(
        s.roomCode,
        s.playerId,
        body?.toCountryId ?? '',
        body?.give ?? {},
        body?.take ?? {},
        typeof body?.peaceWarId === 'string' ? body.peaceWarId : undefined,
      ),
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

  // ---------- война (Э10) ----------

  @SubscribeMessage(SocketEvents.WarDeclare)
  warDeclare(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { targetCountryId: string; casusBelli: string },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.warDeclare(s.roomCode, s.playerId, body?.targetCountryId ?? '', body?.casusBelli ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.WarInvest)
  warInvest(@ConnectedSocket() socket: Socket, @MessageBody() body: { warId: string; amount: number }) {
    return this.withSession(socket, (s) =>
      this.rooms.warInvest(s.roomCode, s.playerId, body?.warId ?? '', Number(body?.amount)),
    );
  }

  @SubscribeMessage(SocketEvents.WarJoin)
  warJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { warId: string; side: 'attacker' | 'defender' },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.warJoin(s.roomCode, s.playerId, body?.warId ?? '', body?.side),
    );
  }

  @SubscribeMessage(SocketEvents.WarSpendPoints)
  warSpendPoints(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { warId: string; reward: 'loot' | 'kontributsiya' },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.warSpendPoints(s.roomCode, s.playerId, body?.warId ?? '', body?.reward),
    );
  }

  @SubscribeMessage(SocketEvents.UnWarVote)
  unWarVote(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { warId: string; verdict: 'just' | 'unjust' },
  ) {
    return this.withSession(socket, (s) =>
      this.rooms.warVote(s.roomCode, s.playerId, body?.warId ?? '', body?.verdict),
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

  // ---------- видео (Э7) ----------

  @SubscribeMessage(SocketEvents.VideoToken)
  async videoToken(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { kind: 'lobby' | 'un' | 'call' | 'wiretap'; callId?: string },
  ) {
    const session = this.sessions.get(socket.id);
    if (!session) return { ok: false, error: 'Сначала войдите в комнату' };
    try {
      const key = process.env.LIVEKIT_KEY;
      const secret = process.env.LIVEKIT_SECRET;
      const url = process.env.LIVEKIT_URL;
      if (!key || !secret || !url) throw new Error('LiveKit не настроен на сервере');

      // прослушка (фича 12): скрытый слушатель чужого созвона — не публикует, не виден
      if (body?.kind === 'wiretap') {
        const roomName = this.rooms.wiretapRoomFor(session.roomCode, session.playerId, body?.callId ?? '');
        const at = new AccessToken(key, secret, {
          identity: `spy-${session.playerId}`,
          name: 'Прослушка',
          ttl: '2h',
        });
        at.addGrant({ roomJoin: true, room: roomName, canPublish: false, canSubscribe: true, hidden: true });
        return { ok: true, data: { url, token: await at.toJwt(), room: roomName } };
      }

      const kind = body?.kind === 'call' ? 'call' : body?.kind === 'lobby' ? 'lobby' : 'un';
      const roomName = this.rooms.videoRoomFor(
        session.roomCode,
        session.playerId,
        kind,
        body?.callId,
      );
      const found = this.rooms.getRoomBySocket(socket.id);
      const playerName =
        found?.room.players.find((p) => p.playerId === session.playerId)?.name ?? 'Игрок';

      const at = new AccessToken(key, secret, {
        identity: session.playerId,
        name: playerName,
        ttl: '2h',
      });
      at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
      return { ok: true, data: { url, token: await at.toJwt(), room: roomName } };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage(SocketEvents.CallInvite)
  callInvite(@ConnectedSocket() socket: Socket, @MessageBody() body: { toCountryId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.callInvite(s.roomCode, s.playerId, body?.toCountryId ?? ''),
    );
  }

  @SubscribeMessage(SocketEvents.CallAccept)
  callAccept(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.callRespond(s.roomCode, s.playerId, body?.callId ?? '', true),
    );
  }

  @SubscribeMessage(SocketEvents.CallDecline)
  callDecline(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.callRespond(s.roomCode, s.playerId, body?.callId ?? '', false),
    );
  }

  @SubscribeMessage(SocketEvents.CallEnd)
  callEnd(@ConnectedSocket() socket: Socket, @MessageBody() body: { callId: string }) {
    return this.withSession(socket, (s) =>
      this.rooms.callEnd(s.roomCode, s.playerId, body?.callId ?? ''),
    );
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
