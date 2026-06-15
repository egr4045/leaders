import { Injectable, Logger } from '@nestjs/common';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import { AccessToken } from 'livekit-server-sdk';

/**
 * Бот-диктор: серверный участник LiveKit, который публикует озвучку новостей
 * в общий аудио-канал комнаты ООН. Так звук диктора и микрофоны игроков идут
 * одним пайплайном WebRTC — нет конфликта двух аудио-систем на телефоне
 * (раньше ОС глушила <audio> диктора, когда кто-то говорил).
 *
 * Декод mp3/wav → PCM s16le 48k через ffmpeg. Если ffmpeg или нативный модуль
 * @livekit/rtc-node недоступны — бот просто не поднимается, а клиент откатывается
 * на локальное аудио (Этап 1). Поэтому все ошибки здесь — мягкие.
 */

const SAMPLE_RATE = 48000;
const CHANNELS = 1;
const SAMPLES_PER_FRAME = (SAMPLE_RATE * 10) / 1000; // 10 ms = 480 сэмплов
const FRAME_BYTES = SAMPLES_PER_FRAME * 2 * CHANNELS;

// Ленивая загрузка нативного модуля — чтобы отсутствие .node-бинарника не валило сервер.
type Rtc = typeof import('@livekit/rtc-node');
let rtcPromise: Promise<Rtc | null> | null = null;
function loadRtc(): Promise<Rtc | null> {
  if (!rtcPromise) {
    rtcPromise = import('@livekit/rtc-node').catch(() => null);
  }
  return rtcPromise;
}

interface Bot {
  room: import('@livekit/rtc-node').Room;
  source: import('@livekit/rtc-node').AudioSource;
  ffmpeg?: ChildProcessWithoutNullStreams;
  /** счётчик поколений: смена строки увеличивает его и отменяет проигрывание прошлой */
  playToken: number;
  published: boolean;
}

@Injectable()
export class AnchorBotService {
  private readonly logger = new Logger(AnchorBotService.name);
  private bots = new Map<string, Bot>();
  /** комнаты, для которых сейчас идёт подключение (чтобы не плодить ботов) */
  private connecting = new Set<string>();

  get configured(): boolean {
    return !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_KEY && process.env.LIVEKIT_SECRET);
  }

  /** Готов ли бот вещать в этой комнате (трек опубликован). */
  isActive(roomCode: string): boolean {
    return this.bots.get(roomCode)?.published ?? false;
  }

  /**
   * Поднять бота в комнате un-<CODE>. Идемпотентно. Возвращает true, когда трек
   * опубликован (можно сразу проигрывать). Любая ошибка → false (откат на клиенте).
   */
  async ensureConnected(roomCode: string, roomName: string): Promise<boolean> {
    if (!this.configured) return false;
    if (this.bots.has(roomCode)) return true;
    if (this.connecting.has(roomCode)) return false;
    this.connecting.add(roomCode);
    try {
      const rtc = await loadRtc();
      if (!rtc) {
        this.logger.warn('@livekit/rtc-node недоступен — бот-диктор выключен (клиент играет локально)');
        return false;
      }
      const at = new AccessToken(process.env.LIVEKIT_KEY!, process.env.LIVEKIT_SECRET!, {
        identity: 'anchor-bot',
        name: 'Диктор',
        ttl: '6h',
      });
      at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: false });
      const token = await at.toJwt();

      const room = new rtc.Room();
      await room.connect(process.env.LIVEKIT_URL!, token, { autoSubscribe: false, dynacast: false });
      const source = new rtc.AudioSource(SAMPLE_RATE, CHANNELS);
      const track = rtc.LocalAudioTrack.createAudioTrack('anchor', source);
      const opts = new rtc.TrackPublishOptions();
      opts.source = rtc.TrackSource.SOURCE_MICROPHONE;
      if (room.localParticipant) {
        await room.localParticipant.publishTrack(track, opts);
      }

      this.bots.set(roomCode, { room, source, playToken: 0, published: true });
      this.logger.log(`[${roomCode}] бот-диктор подключён к ${roomName}`);
      return true;
    } catch (e) {
      this.logger.error(`[${roomCode}] бот-диктор не подключился: ${(e as Error).message}`);
      return false;
    } finally {
      this.connecting.delete(roomCode);
    }
  }

  /** Проиграть аудио-файл строки. Прерывает текущее проигрывание. Тайминг рулит сервер-курсор. */
  async playFile(roomCode: string, filePath: string): Promise<void> {
    const bot = this.bots.get(roomCode);
    if (!bot) return;
    const rtc = await loadRtc();
    if (!rtc) return;
    const myToken = ++bot.playToken;
    // прервать прошлую строку
    this.killFfmpeg(bot);
    try {
      bot.source.clearQueue?.();
    } catch {
      // нет метода — не критично
    }
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`[${roomCode}] нет файла озвучки: ${filePath}`);
      return;
    }

    let pcm: Buffer;
    try {
      pcm = await this.decode(roomCode, bot, filePath, myToken);
    } catch (e) {
      this.logger.warn(`[${roomCode}] декод озвучки: ${(e as Error).message}`);
      return;
    }
    if (bot.playToken !== myToken || pcm.length < FRAME_BYTES) return;

    for (let o = 0; o + FRAME_BYTES <= pcm.length; o += FRAME_BYTES) {
      if (bot.playToken !== myToken) return; // началась другая строка
      const int16 = new Int16Array(SAMPLES_PER_FRAME * CHANNELS);
      for (let i = 0; i < int16.length; i++) int16[i] = pcm.readInt16LE(o + i * 2);
      try {
        const frame = new rtc.AudioFrame(int16, SAMPLE_RATE, CHANNELS, SAMPLES_PER_FRAME);
        await bot.source.captureFrame(frame); // паузит до реального времени проигрывания
      } catch {
        return;
      }
    }
  }

  /** Отключить бота от комнаты (конец фазы новостей / очистка комнаты). */
  async disconnect(roomCode: string): Promise<void> {
    const bot = this.bots.get(roomCode);
    if (!bot) return;
    this.bots.delete(roomCode);
    bot.playToken++;
    bot.published = false;
    this.killFfmpeg(bot);
    try {
      await bot.room.disconnect();
    } catch {
      // уже отключён
    }
    this.logger.log(`[${roomCode}] бот-диктор отключён`);
  }

  private killFfmpeg(bot: Bot) {
    if (bot.ffmpeg) {
      try {
        bot.ffmpeg.kill('SIGKILL');
      } catch {
        // уже мёртв
      }
      bot.ffmpeg = undefined;
    }
  }

  /** ffmpeg: любой формат → сырой PCM s16le 48k mono в память. */
  private decode(roomCode: string, bot: Bot, filePath: string, token: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-loglevel', 'error',
        '-i', filePath,
        '-f', 's16le',
        '-acodec', 'pcm_s16le',
        '-ac', String(CHANNELS),
        '-ar', String(SAMPLE_RATE),
        'pipe:1',
      ]);
      bot.ffmpeg = ff;
      const chunks: Buffer[] = [];
      ff.stdout.on('data', (c: Buffer) => chunks.push(c));
      ff.on('error', (e) => reject(e));
      ff.on('close', () => {
        if (bot.ffmpeg === ff) bot.ffmpeg = undefined;
        if (bot.playToken !== token) return resolve(Buffer.alloc(0));
        resolve(Buffer.concat(chunks));
      });
    });
  }
}
