import { useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { useGame } from '../lib/useGame';

/**
 * Скрытое аудио-подключение шпиона к чужому созвону (фича 12).
 * Ничего не публикует и не показывает видео — только слушает аудио.
 * Активируется, когда snapshot.wiretap не null (цель сейчас на связи).
 */
export function WiretapListener() {
  const { snapshot, emitRaw } = useGame();
  const wiretap = snapshot?.wiretap ?? null;
  const callId = wiretap?.callId ?? null;
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;
    const els: HTMLMediaElement[] = [];

    const onSub = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        el.style.display = 'none';
        document.body.appendChild(el);
        els.push(el);
        void (el as HTMLAudioElement).play?.();
      }
    };
    room.on(RoomEvent.TrackSubscribed, onSub);

    void (async () => {
      const res = await emitRaw<{ url: string; token: string }>('video:token', { kind: 'wiretap', callId });
      if (!res.ok || !res.data || cancelled) return;
      try {
        await room.connect(res.data.url, res.data.token);
      } catch {
        /* созвон мог уже закончиться */
      }
    })();

    return () => {
      cancelled = true;
      room.off(RoomEvent.TrackSubscribed, onSub);
      for (const el of els) {
        try {
          el.remove();
        } catch {
          /* noop */
        }
      }
      void room.disconnect();
      roomRef.current = null;
    };
  }, [callId, emitRaw]);

  if (!wiretap) return null;
  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-lg border border-violet-600 bg-violet-950/80 px-3 py-1.5 text-xs text-violet-200 shadow-lg">
      <span className="animate-pulse">🎧</span>
      Прослушка: {wiretap.targetCountryName} ↔ {wiretap.withCountryName}
    </div>
  );
}
