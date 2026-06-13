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

  // sticky speaker map: identity → last-active timestamp
  const stickyRef = useRef<Map<string, number>>(new Map());
  const STICKY_MS = 4000;

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
      // stamp currently active speakers
      for (const p of active) stickyRef.current.set(p.identity, now);
      // prune expired entries
      for (const [id, ts] of stickyRef.current) {
        if (now - ts >= STICKY_MS) stickyRef.current.delete(id);
      }
      const activeSet = new Set(active.map((p) => p.identity));
      // sort: currently active first (LiveKit order), then recently-sticky (by recency)
      const sorted = [...stickyRef.current.keys()].sort((a, b) => {
        const ai = active.findIndex((p) => p.identity === a);
        const bi = active.findIndex((p) => p.identity === b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (activeSet.has(a)) return -1;
        if (activeSet.has(b)) return 1;
        return (stickyRef.current.get(b) ?? 0) - (stickyRef.current.get(a) ?? 0);
      });
      setSpeakingIds(sorted);
    };
    room.on(RoomEvent.ActiveSpeakersChanged, flushSpeakers);
    // periodic cleanup so stale entries expire even when no new speaker event fires
    const speakerInterval = setInterval(flushSpeakers, 1000);

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
        await room.localParticipant.enableCameraAndMicrophone();
        rebuild();
      } catch (e) {
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
      stickyRef.current.clear();
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
