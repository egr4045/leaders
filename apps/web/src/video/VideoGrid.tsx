import { useEffect, useRef } from 'react';
import { useVideoRoom, attachTrack, type VideoTile } from './useVideoRoom';
import type { PlayerInfo } from '@leaders/shared';

function MicIcon({ on }: { on: boolean }) {
  return on ? (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3.27 3L2 4.27l7 7V11a3 3 0 006 0V9.27l2 2A5 5 0 0112 16v-2H5a7 7 0 0014 0h-2a5 5 0 01-4.65 4.96L12 19a7 7 0 01-6.96-6H3a7 7 0 007 7v2h2v-2a7 7 0 006.73-5l1 1L21 19.73 19.73 21 3.27 3z" />
    </svg>
  );
}

function CamIcon({ on }: { on: boolean }) {
  return on ? (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
    </svg>
  );
}

function Tile({
  tile,
  player,
  large,
  stripMode,
  showControls,
  micEnabled,
  camEnabled,
  onToggleMic,
  onToggleCam,
}: {
  tile: VideoTile;
  player?: PlayerInfo;
  large?: boolean;
  stripMode?: boolean;
  showControls?: boolean;
  micEnabled?: boolean;
  camEnabled?: boolean;
  onToggleMic?: () => void;
  onToggleCam?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => attachTrack(videoRef.current, tile.videoTrack), [tile.videoTrack]);
  useEffect(() => attachTrack(audioRef.current, tile.audioTrack), [tile.audioTrack]);

  const displayName = player?.name ?? tile.name;
  const countryName = player?.countryName ?? null;

  const sizeClass = stripMode
    ? 'h-full w-28 shrink-0'
    : large
    ? 'aspect-video'
    : 'aspect-square sm:aspect-video';

  return (
    <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${sizeClass}`}>
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

      {/* Name + country overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        <div className="text-xs font-semibold leading-tight text-white">{displayName}</div>
        {countryName && (
          <div className="text-[10px] leading-tight text-amber-300">{countryName}</div>
        )}
      </div>

      {/* Mic/cam controls on local tile */}
      {tile.isLocal && showControls && (
        <div className="absolute right-1 top-1 flex gap-1">
          <button
            onClick={onToggleMic}
            className={`rounded-full p-1.5 transition-colors ${
              micEnabled ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-red-600 text-white'
            }`}
          >
            <MicIcon on={micEnabled ?? true} />
          </button>
          <button
            onClick={onToggleCam}
            className={`rounded-full p-1.5 transition-colors ${
              camEnabled ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-red-600 text-white'
            }`}
          >
            <CamIcon on={camEnabled ?? true} />
          </button>
        </div>
      )}
    </div>
  );
}

function PlaceholderTile({
  player,
  stripMode,
  large,
}: {
  player: PlayerInfo;
  stripMode?: boolean;
  large?: boolean;
}) {
  const sizeClass = stripMode
    ? 'h-full w-28 shrink-0'
    : large
    ? 'aspect-video'
    : 'aspect-square sm:aspect-video';

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-800 ${sizeClass}`}
    >
      <div className="text-3xl">{player.isBot ? '🤖' : '👤'}</div>
      <div className="mt-1 px-1 text-center">
        <div className="text-xs font-semibold text-slate-300">{player.name}</div>
        {player.countryName && (
          <div className="text-[10px] text-amber-300">{player.countryName}</div>
        )}
        {player.isBot && <div className="text-[10px] text-slate-600">AI</div>}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';

export function VideoGrid({
  kind,
  callId,
  players,
  layout = 'grid',
  showControls = false,
  showControlBar = false,
  hostControls,
}: {
  kind: 'lobby' | 'un' | 'call';
  callId?: string;
  players?: PlayerInfo[];
  layout?: 'grid' | 'strip';
  showControls?: boolean;
  /** Показывать нижний бар с кнопками mic/cam */
  showControlBar?: boolean;
  /** Дополнительные кнопки хоста в нижнем баре */
  hostControls?: ReactNode;
}) {
  const { tiles, error, micEnabled, camEnabled, toggleMic, toggleCam } = useVideoRoom(
    kind === 'lobby' ? 'lobby' : kind === 'call' ? 'call' : 'un',
    callId,
  );

  if (error) {
    return (
      <div className="w-full rounded-xl border border-red-900 bg-red-950/30 p-2 text-center text-xs text-red-300">
        Видео: {error}
      </div>
    );
  }

  const large = kind === 'call' || tiles.length <= 2;
  const stripMode = layout === 'strip';

  const renderTile = (tile: VideoTile, player?: PlayerInfo) => (
    <Tile
      key={tile.identity}
      tile={tile}
      player={player}
      large={large}
      stripMode={stripMode}
      showControls={showControls}
      micEnabled={micEnabled}
      camEnabled={camEnabled}
      onToggleMic={toggleMic}
      onToggleCam={toggleCam}
    />
  );

  const tilesByIdentity = players && players.length > 0
    ? new Map(tiles.map((t) => [t.identity, t]))
    : null;

  const tileItems = tilesByIdentity
    ? players!.map((p) => {
        const tile = tilesByIdentity.get(p.playerId);
        return tile
          ? renderTile(tile, p)
          : <PlaceholderTile key={p.playerId} player={p} stripMode={stripMode} large={large} />;
      })
    : tiles.map((t) => renderTile(t));

  const tilesEl = stripMode
    ? <div className="flex h-full gap-2 overflow-x-auto">{tileItems}</div>
    : (
      <div
        className={`grid w-full gap-2 ${
          large ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5'
        }`}
      >
        {tileItems}
      </div>
    );

  if (!showControlBar) return tilesEl;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">{tilesEl}</div>
      <div className="flex items-center gap-2 border-t border-slate-800 bg-slate-950 px-3 py-2">
        <button
          onClick={toggleMic}
          title={micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            micEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-700 text-white'
          }`}
        >
          <MicIcon on={micEnabled} />
          <span className="hidden sm:inline">{micEnabled ? 'Микрофон' : 'Без звука'}</span>
        </button>
        <button
          onClick={toggleCam}
          title={camEnabled ? 'Выключить камеру' : 'Включить камеру'}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            camEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-700 text-white'
          }`}
        >
          <CamIcon on={camEnabled} />
          <span className="hidden sm:inline">{camEnabled ? 'Камера' : 'Камера выкл'}</span>
        </button>
        {hostControls && <div className="ml-auto flex gap-2">{hostControls}</div>}
      </div>
    </div>
  );
}
