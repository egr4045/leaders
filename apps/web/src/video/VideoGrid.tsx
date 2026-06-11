import { useEffect, useRef } from 'react';
import { useVideoRoom, attachTrack, type VideoTile } from './useVideoRoom';

function Tile({ tile, large }: { tile: VideoTile; large?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => attachTrack(videoRef.current, tile.videoTrack), [tile.videoTrack]);
  useEffect(() => attachTrack(audioRef.current, tile.audioTrack), [tile.audioTrack]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 ${large ? 'aspect-video' : 'aspect-square sm:aspect-video'}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.isLocal}
        className={`h-full w-full object-cover ${tile.isLocal ? 'scale-x-[-1]' : ''}`}
      />
      {!tile.isLocal && <audio ref={audioRef} autoPlay />}
      {!tile.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🎩</div>
      )}
      <div className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-xs">
        {tile.name}
      </div>
    </div>
  );
}

/** Видеосетка комнаты ООН: 6–9 говорящих голов. */
export function VideoGrid({ kind, callId }: { kind: 'un' | 'call'; callId?: string }) {
  const { tiles, error } = useVideoRoom(kind, callId);

  if (error) {
    return (
      <div className="w-full rounded-xl border border-red-900 bg-red-950/30 p-2 text-center text-xs text-red-300">
        Видео: {error}
      </div>
    );
  }
  const large = kind === 'call' || tiles.length <= 2;
  return (
    <div
      className={`grid w-full gap-2 ${
        large ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
      }`}
    >
      {tiles.map((t) => (
        <Tile key={t.identity} tile={t} large={large} />
      ))}
    </div>
  );
}
