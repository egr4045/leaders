import { useEffect, useRef, useState, type ReactNode } from 'react';
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

/** Размер тайла: fill = занять контейнер, strip = фикс. ширина в полосе, иначе по сетке. */
function tileSizeClass(opts: { fill?: boolean; stripMode?: boolean; large?: boolean }) {
  if (opts.fill) return 'h-full w-full';
  if (opts.stripMode) return 'h-full w-28 md:w-36 shrink-0';
  return opts.large ? 'aspect-video' : 'aspect-square sm:aspect-video';
}

function Tile({
  tile,
  player,
  large,
  stripMode,
  fill,
  speaking,
  volume,
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
  fill?: boolean;
  /** говорит прямо сейчас — подсветка рамкой как в Мите */
  speaking?: boolean;
  /** громкость удалённого участника (приглушение при выбранном спикере) */
  volume?: number;
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
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume ?? 1;
  }, [volume, tile.audioTrack]);

  const displayName = player?.name ?? tile.name;
  const countryName = player?.countryName ?? null;
  const ring = speaking ? 'ring-2 ring-emerald-400' : '';

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 transition-shadow ${ring} ${tileSizeClass({ fill, stripMode, large })}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.isLocal}
        className={`h-full w-full object-contain bg-slate-950 ${tile.isLocal ? 'scale-x-[-1]' : ''}`}
      />
      {!tile.isLocal && <audio ref={audioRef} autoPlay />}
      {!tile.videoTrack && (
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🎩</div>
      )}

      {/* Name + country overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-2 backdrop-blur-0">
        <div className="flex items-center gap-1 text-xs font-semibold leading-tight text-white drop-shadow">
          {speaking && <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" />}
          {displayName}
        </div>
        {countryName && (
          <div className="text-[10px] leading-tight text-amber-300 drop-shadow">{countryName}</div>
        )}
      </div>

      {/* Mic/cam controls on local tile */}
      {tile.isLocal && showControls && (
        <div className="absolute right-1.5 top-1.5 flex gap-1.5">
          <button
            onClick={onToggleMic}
            className={`rounded-full p-2.5 shadow-lg transition-colors ${
              micEnabled ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-red-600 text-white'
            }`}
          >
            <MicIcon on={micEnabled ?? true} />
          </button>
          <button
            onClick={onToggleCam}
            className={`rounded-full p-2.5 shadow-lg transition-colors ${
              camEnabled ? 'bg-black/60 text-white hover:bg-black/80' : 'bg-red-600 text-white'
            }`}
          >
            <CamIcon on={camEnabled ?? true} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Детерминированный цвет по строке (hue 0-360). */
function strHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % 360;
}

/** Canvas-«вебкамера» для бота: цветной фон с лёгкой анимацией яркости. */
function BotCanvas({ playerId, fill }: { playerId: string; fill?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hue = strHue(playerId);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let t = Math.random() * Math.PI * 2; // random phase so bots don't pulse in sync

    const draw = () => {
      const { width: w, height: h } = canvas;
      t += 0.018;
      const bright = 18 + Math.sin(t) * 4; // 14-22% lightness

      // gradient: darker at edges, brighter center
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, `hsl(${hue},30%,${bright + 8}%)`);
      grad.addColorStop(1, `hsl(${hue},25%,${bright - 4}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // subtle scanline every 4px
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

      rafRef.current = requestAnimationFrame(draw);
    };

    // fit canvas to display size
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    });
    ro.observe(canvas);
    canvas.width = canvas.offsetWidth || 320;
    canvas.height = canvas.offsetHeight || 240;

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [hue]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 ${fill ? 'h-full w-full' : 'h-full w-full'}`}
    />
  );
}

function PlaceholderTile({
  player,
  stripMode,
  large,
  fill,
  speaking,
}: {
  player: PlayerInfo;
  stripMode?: boolean;
  large?: boolean;
  fill?: boolean;
  speaking?: boolean;
}) {
  const ring = speaking ? 'ring-2 ring-emerald-400' : '';
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 ${ring} ${tileSizeClass({ fill, stripMode, large })}`}
    >
      {player.isBot && <BotCanvas playerId={player.playerId} fill={fill} />}

      {/* Avatar / emoji centred */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={fill ? 'text-7xl drop-shadow-lg' : 'text-4xl'}>{player.isBot ? '🤖' : '👤'}</div>
      </div>

      {/* Name overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 py-2">
        <div className={`font-semibold leading-tight text-white drop-shadow ${fill ? 'text-sm' : 'text-xs'}`}>
          {speaking && <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
          {player.name}
        </div>
        {player.countryName && (
          <div className={`text-amber-300 drop-shadow ${fill ? 'text-xs' : 'text-[10px]'}`}>{player.countryName}</div>
        )}
      </div>
    </div>
  );
}

/** Запись участника: связывает игрока комнаты с его видеотайлом (если опубликован). */
interface Entry {
  id: string;
  player?: PlayerInfo;
  tile?: VideoTile;
}

export function VideoGrid({
  kind,
  callId,
  players,
  layout = 'grid',
  spotlightId = null,
  duckOthers = false,
  showControls = false,
  showControlBar = false,
  hostControls,
}: {
  kind: 'lobby' | 'un' | 'call';
  callId?: string;
  players?: PlayerInfo[];
  layout?: 'grid' | 'strip' | 'spotlight';
  /** кто в центре spotlight и кого НЕ приглушать; null = самый громкий */
  spotlightId?: string | null;
  /** приглушать всех, кроме spotlightId (выбранный спикер / новостная сводка) */
  duckOthers?: boolean;
  showControls?: boolean;
  /** Показывать нижний бар с кнопками mic/cam */
  showControlBar?: boolean;
  /** Дополнительные кнопки (хост/спикер) в нижнем баре */
  hostControls?: ReactNode;
}) {
  const {
    tiles,
    error,
    micEnabled,
    camEnabled,
    toggleMic,
    toggleCam,
    speakingIds,
    forceMutedBy,
    clearForceMuted,
  } = useVideoRoom(kind === 'lobby' ? 'lobby' : kind === 'call' ? 'call' : 'un', callId);

  if (error) {
    return (
      <div className="w-full rounded-xl border border-red-900 bg-red-950/30 p-2 text-center text-xs text-red-300">
        Видео: {error}
      </div>
    );
  }

  const stripMode = layout === 'strip';
  const large = kind === 'call' || tiles.length <= 2;

  const tilesByIdentity = new Map(tiles.map((t) => [t.identity, t]));
  const entries: Entry[] =
    players && players.length > 0
      ? players.map((p) => ({ id: p.playerId, player: p, tile: tilesByIdentity.get(p.playerId) }))
      : tiles.map((t) => ({ id: t.identity, tile: t }));

  const isSpeaking = (id: string) => speakingIds.includes(id);
  // приглушаем всех, кроме выбранного спикера (локальный тайл и так muted)
  const volumeFor = (e: Entry) =>
    duckOthers && e.id !== spotlightId ? 0.2 : 1;

  const renderEntry = (e: Entry, opts: { fill?: boolean; strip?: boolean } = {}) =>
    e.tile ? (
      <Tile
        key={e.id}
        tile={e.tile}
        player={e.player}
        large={large}
        stripMode={opts.strip}
        fill={opts.fill}
        speaking={isSpeaking(e.id)}
        volume={volumeFor(e)}
        showControls={showControls}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
      />
    ) : e.player ? (
      <PlaceholderTile
        key={e.id}
        player={e.player}
        stripMode={opts.strip}
        large={large}
        fill={opts.fill}
        speaking={isSpeaking(e.id)}
      />
    ) : null;

  let tilesEl: ReactNode;

  if (layout === 'spotlight') {
    // главный спикер крупно; на мобайле/планшете — полоса снизу; на lg+ — боковая колонка справа
    const mainId = spotlightId ?? speakingIds[0] ?? entries[0]?.id ?? null;
    const main = entries.find((e) => e.id === mainId) ?? entries[0];
    const rest = entries.filter((e) => e.id !== main?.id);
    tilesEl = (
      <>
        {/* Mobile / tablet: main top, strip bottom */}
        <div className="flex h-full flex-col gap-2 lg:hidden">
          <div className="min-h-0 flex-1">{main && renderEntry(main, { fill: true })}</div>
          {rest.length > 0 && (
            <div className="flex h-24 shrink-0 gap-2 overflow-x-auto">
              {rest.map((e) => renderEntry(e, { strip: true }))}
            </div>
          )}
        </div>
        {/* Desktop lg+: main left, sidebar right */}
        <div className="hidden h-full gap-2 lg:flex">
          <div className="min-h-0 min-w-0 flex-1">{main && renderEntry(main, { fill: true })}</div>
          {rest.length > 0 && (
            <div className="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto">
              {rest.map((e) => renderEntry(e, { strip: false }))}
            </div>
          )}
        </div>
      </>
    );
  } else if (stripMode) {
    tilesEl = (
      <div className="flex h-full gap-2 overflow-x-auto">
        {entries.map((e) => renderEntry(e, { strip: true }))}
      </div>
    );
  } else {
    // сетка («балаган»): говорящие — в начало, число колонок по количеству участников
    const rank = (id: string) => {
      const i = speakingIds.indexOf(id);
      return i === -1 ? speakingIds.length : i;
    };
    const sorted = [...entries].sort((a, b) => rank(a.id) - rank(b.id));
    const n = sorted.length;
    const isLobby = kind === 'lobby';
    // Lobby: fewer columns so aspect-video tiles grow tall enough to fill the screen height
    const cols = isLobby
      ? // Lobby: fewer cols so aspect-video tiles grow to fill the tall video panel
        n <= 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : n <= 6
        ? 'grid-cols-2'
        : 'grid-cols-2 md:grid-cols-3'
      : // UN grid (debate/vote): same fewer-col logic — video area is ~900px tall,
        // 2 cols for ≤6 gives 3 rows × 256px ≈ 784px, nearly filling the height
        n <= 1
      ? 'grid-cols-1'
      : n <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : n <= 6
      ? 'grid-cols-2'
      : n <= 9
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-3';
    tilesEl = (
      <div className={`grid gap-2 ${cols} ${isLobby ? 'h-full place-content-center' : 'h-full w-full content-center'}`}>
        {sorted.map((e) => renderEntry(e))}
      </div>
    );
  }

  const muteToast = forceMutedBy && (
    <button
      onClick={clearForceMuted}
      className="flex w-full items-center justify-center gap-2 bg-amber-900/60 px-3 py-1.5 text-xs text-amber-200"
    >
      🔇 {forceMutedBy} попросил вас выключить микрофон (можно включить обратно) ✕
    </button>
  );

  if (!showControlBar) {
    return (
      <div className="flex h-full flex-col">
        {muteToast}
        <div className="min-h-0 flex-1">{tilesEl}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {muteToast}
      <div className="min-h-0 flex-1 overflow-hidden">{tilesEl}</div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950 px-3 py-2.5">
        <button
          onClick={toggleMic}
          title={micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            micEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-700 text-white'
          }`}
        >
          <MicIcon on={micEnabled} />
          <span className="hidden sm:inline">{micEnabled ? 'Микрофон' : 'Без звука'}</span>
        </button>
        <button
          onClick={toggleCam}
          title={camEnabled ? 'Выключить камеру' : 'Включить камеру'}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            camEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-700 text-white'
          }`}
        >
          <CamIcon on={camEnabled} />
          <span className="hidden sm:inline">{camEnabled ? 'Камера' : 'Камера выкл'}</span>
        </button>
        {hostControls && <div className="ml-auto flex flex-wrap items-center gap-2">{hostControls}</div>}
      </div>
    </div>
  );
}
