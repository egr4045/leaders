import { useEffect, useRef } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';
import { useGame } from '../lib/useGame';

/**
 * Скрытое подключение шпиона к чужому созвону (фича 12).
 * Слушает аудио + показывает мини-видео двух участников разговора.
 * Активируется когда snapshot.wiretap не null (цель сейчас на связи).
 */
export function WiretapListener() {
  const { snapshot, emitRaw } = useGame();
  const wiretap = snapshot?.wiretap ?? null;
  const callId = wiretap?.callId ?? null;
  const roomRef = useRef<Room | null>(null);
  const vid1Ref = useRef<HTMLVideoElement>(null);
  const vid2Ref = useRef<HTMLVideoElement>(null);
  const audioEls = useRef<HTMLAudioElement[]>([]);
  const videoSlot = useRef(0);

  useEffect(() => {
    if (!callId) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;
    audioEls.current = [];
    videoSlot.current = 0;

    const onSub = (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach() as HTMLAudioElement;
        el.autoplay = true;
        el.style.display = 'none';
        document.body.appendChild(el);
        audioEls.current.push(el);
        void el.play?.();
      } else if (track.kind === Track.Kind.Video) {
        const slot = videoSlot.current === 0 ? vid1Ref.current : vid2Ref.current;
        if (slot && videoSlot.current < 2) {
          videoSlot.current += 1;
          track.attach(slot);
        }
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
      for (const el of audioEls.current) {
        try { el.remove(); } catch { /* noop */ }
      }
      audioEls.current = [];
      videoSlot.current = 0;
      if (vid1Ref.current) vid1Ref.current.srcObject = null;
      if (vid2Ref.current) vid2Ref.current.srcObject = null;
      void room.disconnect();
      roomRef.current = null;
    };
  }, [callId, emitRaw]);

  if (!wiretap) return null;
  return (
    <div className="fixed bottom-3 left-3 z-50 flex flex-col gap-1.5">
      {/* Мини-видео двух участников звонка */}
      <div className="flex gap-1.5">
        <div className="relative overflow-hidden rounded-lg bg-slate-900" style={{ width: 112, height: 80 }}>
          <video ref={vid1Ref} autoPlay playsInline muted className="h-full w-full object-contain bg-slate-950" />
          <div className="absolute inset-0 flex items-center justify-center text-xl opacity-25 pointer-events-none">🎩</div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-slate-900" style={{ width: 112, height: 80 }}>
          <video ref={vid2Ref} autoPlay playsInline muted className="h-full w-full object-contain bg-slate-950" />
          <div className="absolute inset-0 flex items-center justify-center text-xl opacity-25 pointer-events-none">🎩</div>
        </div>
      </div>
      {/* Индикатор */}
      <div className="flex items-center gap-2 rounded-lg border border-violet-600 bg-violet-950/90 px-2.5 py-1 text-xs text-violet-200 shadow-lg">
        <span className="animate-pulse">🎧</span>
        <span className="truncate max-w-[200px]">{wiretap.targetCountryName} ↔ {wiretap.withCountryName}</span>
      </div>
    </div>
  );
}
