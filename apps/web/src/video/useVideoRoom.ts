import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  type RemoteTrack,
  type RemoteParticipant,
} from 'livekit-client';
import { SocketEvents } from '@leaders/shared';
import { useGame } from '../lib/useGame';
import { socket } from '../socket';

/** Мобильный клиент — режем разрешение/битрейт, чтобы пинг и нагрузка не зашкаливали. */
const isMobile =
  typeof navigator !== 'undefined' &&
  (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth < 768));

/**
 * Конфиг LiveKit под слабую/мобильную сеть:
 * - simulcast — зритель, у которого тайл маленький, тянет низкий слой (меньше трафика);
 * - h264 — аппаратный декодер на телефонах тянет легче VP8/VP9;
 * - capped resolution/encoding — не шлём 1080p в соту;
 * - adaptiveStream + dynacast — авто-подбор качества и подписка только на видимое.
 */
function buildRoom(): Room {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: isMobile ? VideoPresets.h360.resolution : VideoPresets.h540.resolution,
    },
    publishDefaults: {
      simulcast: true,
      videoCodec: 'h264',
      videoEncoding: isMobile ? VideoPresets.h360.encoding : VideoPresets.h540.encoding,
      videoSimulcastLayers: isMobile
        ? [VideoPresets.h180, VideoPresets.h360]
        : [VideoPresets.h180, VideoPresets.h360, VideoPresets.h540],
    },
  });
}

export interface VideoTile {
  identity: string;
  name: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
}

export function useVideoRoom(kind: 'lobby' | 'un' | 'call', callId?: string, enabled = true) {
  const { emitRaw } = useGame();
  const roomRef = useRef<Room | null>(null);
  const [tiles, setTiles] = useState<VideoTile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  /** identity говорящих прямо сейчас, [0] = самый громкий (доминантный) */
  const [speakingIds, setSpeakingIds] = useState<string[]>([]);
  /** имя председателя, попросившего выключить микрофон (null = не просили) */
  const [forceMutedBy, setForceMutedBy] = useState<string | null>(null);

  // ordered queue of speakers (front = most recent dominant)
  const speakerQueueRef = useRef<string[]>([]);
  // freeze grid reordering until this timestamp
  const frozenUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const room = buildRoom();
    roomRef.current = room;

    const rebuild = () => {
      if (cancelled) return;
      const list: VideoTile[] = [];
      const getCam = (p: any) => {
        const pub = p.getTrackPublication(Track.Source.Camera);
        return pub && !pub.isMuted ? pub.track?.mediaStreamTrack ?? null : null;
      };
      const getMic = (p: any) => {
        const pub = p.getTrackPublication(Track.Source.Microphone);
        return pub && !pub.isMuted ? pub.track?.mediaStreamTrack ?? null : null;
      };

      const lp = room.localParticipant;
      list.push({
        identity: lp.identity,
        name: lp.name || 'Я',
        isLocal: true,
        videoTrack: getCam(lp),
        audioTrack: null,
      });
      for (const p of room.remoteParticipants.values()) {
        list.push({
          identity: p.identity,
          name: p.name || p.identity,
          isLocal: false,
          videoTrack: getCam(p),
          audioTrack: getMic(p),
        });
      }
      setTiles(list);
    };

    const events: RoomEvent[] = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.TrackMuted,
      RoomEvent.TrackUnmuted,
    ];
    for (const e of events) room.on(e, rebuild);

    const flushSpeakers = () => {
      if (cancelled) return;
      const now = Date.now();
      const active = room.activeSpeakers;
      const dominant = active[0]?.identity ?? null;

      if (now < frozenUntilRef.current) {
        // grid frozen — emit current queue without reordering
        setSpeakingIds([...speakerQueueRef.current]);
        return;
      }

      if (dominant) {
        if (speakerQueueRef.current[0] !== dominant) {
          // new dominant speaker → move to front and freeze for 5 seconds
          speakerQueueRef.current = [
            dominant,
            ...speakerQueueRef.current.filter((id) => id !== dominant),
          ];
          frozenUntilRef.current = now + 5000;
        }
        // ensure all currently-active speakers are in the queue
        for (const p of active) {
          if (!speakerQueueRef.current.includes(p.identity)) {
            speakerQueueRef.current.push(p.identity);
          }
        }
      }

      setSpeakingIds([...speakerQueueRef.current]);
    };
    room.on(RoomEvent.ActiveSpeakersChanged, flushSpeakers);
    const speakerInterval = setInterval(flushSpeakers, 500);

    // председатель попросил замьютиться: глушим локальный мик (включить обратно можно)
    const onForceMute = (d: { by: string }) => {
      if (cancelled) return;
      void room.localParticipant.setMicrophoneEnabled(false);
      setMicEnabled(false);
      setForceMutedBy(d?.by ?? 'Председатель');
    };
    socket.on(SocketEvents.VideoForceMute, onForceMute);

    void (async () => {
      const res = await emitRaw<{ url: string; token: string }>('video:token', { kind, callId });
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Не получил токен');
        return;
      }
      try {
        await room.connect(res.data.url, res.data.token);
        // Камеру и микрофон включаем ПО ОТДЕЛЬНОСТИ: отсутствие/занятость одного
        // устройства (нет вебки, камеру держит OBS и т.п.) не должно блокировать
        // второе и ронять весь созвон ошибкой "Requested device not found".
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          if (!cancelled) setMicEnabled(false);
        }
        try {
          await room.localParticipant.setCameraEnabled(true);
        } catch {
          if (!cancelled) setCamEnabled(false);
        }
        rebuild();
      } catch (e) {
        // сюда попадаем только при ошибке самого подключения к LiveKit, не устройств
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(speakerInterval);
      for (const e of events) room.off(e, rebuild);
      room.off(RoomEvent.ActiveSpeakersChanged, flushSpeakers);
      socket.off(SocketEvents.VideoForceMute, onForceMute);
      void room.disconnect();
      roomRef.current = null;
      setTiles([]);
      setSpeakingIds([]);
      speakerQueueRef.current = [];
      frozenUntilRef.current = 0;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, callId, enabled, emitRaw]);

  const toggleMic = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    void room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
    if (next) setForceMutedBy(null);
  };

  const toggleCam = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camEnabled;
    void room.localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  };

  return {
    tiles,
    error,
    micEnabled,
    camEnabled,
    toggleMic,
    toggleCam,
    speakingIds,
    forceMutedBy,
    clearForceMuted: () => setForceMutedBy(null),
  };
}

export function attachTrack(el: HTMLMediaElement | null, track: MediaStreamTrack | null) {
  if (!el) return;
  if (track) el.srcObject = new MediaStream([track]);
  else el.srcObject = null;
}

export type { RemoteTrack, RemoteParticipant };
