import { useEffect, useRef, useState } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteParticipant,
} from 'livekit-client';
import { useGame } from '../lib/useGame';

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

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const rebuild = () => {
      if (cancelled) return;
      const list: VideoTile[] = [];
      const lp = room.localParticipant;
      list.push({
        identity: lp.identity,
        name: lp.name || 'Я',
        isLocal: true,
        videoTrack: lp.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack ?? null,
        audioTrack: null,
      });
      for (const p of room.remoteParticipants.values()) {
        list.push({
          identity: p.identity,
          name: p.name || p.identity,
          isLocal: false,
          videoTrack: p.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack ?? null,
          audioTrack:
            p.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack ?? null,
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
    ];
    for (const e of events) room.on(e, rebuild);

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
      for (const e of events) room.off(e, rebuild);
      void room.disconnect();
      roomRef.current = null;
      setTiles([]);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, callId, enabled, emitRaw]);

  const toggleMic = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    void room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  };

  const toggleCam = () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camEnabled;
    void room.localParticipant.setCameraEnabled(next);
    setCamEnabled(next);
  };

  return { tiles, error, micEnabled, camEnabled, toggleMic, toggleCam };
}

export function attachTrack(el: HTMLMediaElement | null, track: MediaStreamTrack | null) {
  if (!el) return;
  if (track) el.srcObject = new MediaStream([track]);
  else el.srcObject = null;
}

export type { RemoteTrack, RemoteParticipant };
