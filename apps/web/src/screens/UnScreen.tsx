import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';
import { VideoGrid } from '../video/VideoGrid';
import { NewsPlayer } from '../news/NewsPlayer';
import { SocketEvents, type GamePhase, type PublicCountryView, type PlayerInfo } from '@leaders/shared';
import { BottomDrawer } from '../ui/BottomDrawer';

const PHASE_TITLES: Record<string, string> = {
  un_summary: 'Новости ООН',
  un_comments: 'Круг комментариев',
  un_debate: 'Свободные дебаты',
  un_vote: 'Голосование ООН',
  results: 'Итоги года',
};

function DeclareForbes() {
  const { snapshot, declareForbes } = useGame();
  const [value, setValue] = useState('');
  if (!snapshot?.you) return null;

  const others = snapshot.others.filter((o) => o.declaredForbes !== null);
  const myDeclared = snapshot.you.declaredForbes;
  const rank =
    myDeclared !== null
      ? others.filter((o) => (o.declaredForbes ?? 0) > myDeclared).length + 1
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-900 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Реальный Форбс: <b className="text-amber-400">{Math.round(snapshot.you.forbes.total)}</b>
        </span>
        {myDeclared !== null && (
          <span>
            Заявлено: <b className="text-slate-200">{myDeclared}</b>
            {rank !== null && (
              <span className="ml-1 text-amber-400">
                — #{rank} из {snapshot.players.filter((p) => !p.isBot).length}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ваш «форбс»"
          className="w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
        />
        <button
          disabled={!value}
          onClick={() => {
            void declareForbes(Number(value));
            setValue('');
          }}
          className="rounded bg-amber-600 px-4 py-1.5 font-semibold disabled:opacity-40"
        >
          Заявить
        </button>
      </div>
    </div>
  );
}

export function ForbesLeaderboard() {
  const { snapshot, session } = useGame();
  if (!snapshot) return null;
  const list = [];
  if (snapshot.you && snapshot.you.declaredForbes !== null) {
    const me = snapshot.players.find((p) => p.playerId === session?.playerId);
    list.push({
      countryName: snapshot.you.countryName,
      playerName: me?.name ?? 'Вы',
      declared: snapshot.you.declaredForbes,
      isMe: true,
    });
  }
  for (const o of snapshot.others) {
    if (o.declaredForbes !== null) {
      list.push({ countryName: o.countryName, playerName: o.playerName, declared: o.declaredForbes, isMe: false });
    }
  }
  if (list.length === 0) return null;
  list.sort((a, b) => b.declared - a.declared);

  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">🏆 Заявленный рейтинг Форбс</div>
      <div className="flex flex-col gap-1">
        {list.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between text-sm ${item.isMe ? 'font-bold text-amber-400' : 'text-slate-300'}`}
          >
            <span>
              #{i + 1} {item.countryName}{' '}
              <span className="text-xs text-slate-500">({item.playerName})</span>
            </span>
            <span>{item.declared}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewsFeed() {
  const { snapshot } = useGame();
  if (!snapshot?.news) return null;
  return (
    <div className="flex flex-col gap-3">
      {snapshot.news.map((n) => (
        <div key={n.countryId} className="rounded-xl bg-slate-900 p-4">
          <div className="mb-1 font-bold text-amber-400">{n.countryName}</div>
          <ul className="list-inside list-disc text-sm text-slate-300">
            {n.lines.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WarCourtPanel() {
  const { snapshot, emitRaw } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  if (!snapshot?.you) return null;

  const pending = snapshot.wars.filter((w) => w.unVerdict === 'pending');
  if (pending.length === 0) return null;

  const vote = async (warId: string, verdict: 'just' | 'unjust') => {
    const res = await emitRaw(SocketEvents.UnWarVote, { warId, verdict });
    setMsg(res.ok ? '✓ Вердикт учтён' : (res.error ?? 'Ошибка'));
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="font-bold text-amber-400">⚖️ Суд ООН: справедливы ли войны?</div>
        {msg && <span className="text-xs text-amber-400">{msg}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {pending.map((w) => {
          const tally = snapshot.warVoteTally[w.id];
          const iAmIn = !!w.yourSide;
          return (
            <div key={w.id} className="rounded-xl bg-slate-900 p-3 text-sm">
              <div className="font-bold text-red-300">
                ⚔️ {w.attacker.countryNames.join(' + ')}{' '}
                <span className="text-slate-500">vs</span>{' '}
                {w.defender.countryNames.join(' + ')}
              </div>
              <div className="my-1 rounded border-l-2 border-amber-600 bg-slate-950 px-2 py-1 text-xs italic text-slate-300">
                «{w.casusBelli}»
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  справедлива {tally?.just ?? 0} · несправедлива {tally?.unjust ?? 0}
                </span>
                {iAmIn ? (
                  <span className="text-xs text-slate-600">участники не голосуют</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void vote(w.id, 'just')}
                      className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold hover:bg-emerald-600"
                    >
                      Справедлива
                    </button>
                    <button
                      onClick={() => void vote(w.id, 'unjust')}
                      className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-600"
                    >
                      Несправедлива
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VotePanel() {
  const { snapshot, emitRaw } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  if (!snapshot?.you) return null;

  const vote = async (targetCountryId: string, kind: 'sanction' | 'support') => {
    const res = await emitRaw('un:vote', { targetCountryId, kind });
    setMsg(res.ok ? '✓ Голос учтён' : (res.error ?? 'Ошибка'));
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Влияние: <b className="text-sky-400">{snapshot.you.resources.influence}</b>
          <span className="ml-2 text-slate-600">· голос = 10 влияния</span>
        </span>
        {msg && <span className="text-amber-400">{msg}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {snapshot.others.map((o: PublicCountryView) => {
          const tally = snapshot.voteTally[o.countryId];
          return (
            <div
              key={o.countryId}
              className="flex flex-col gap-2 rounded-xl bg-slate-900 p-2.5 text-xs"
            >
              <div>
                <div className="font-bold text-sm leading-tight">{o.countryName}</div>
                <div className="text-slate-500">
                  🚫{tally?.sanction ?? 0} · ✅{tally?.support ?? 0}
                  {o.sanctions > 0 && <span className="ml-1 text-red-400">({o.sanctions})</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => void vote(o.countryId, 'sanction')}
                  className="flex-1 rounded-lg bg-red-700 py-1.5 text-xs font-semibold hover:bg-red-600"
                >
                  Санкции
                </button>
                <button
                  onClick={() => void vote(o.countryId, 'support')}
                  className="flex-1 rounded-lg bg-emerald-700 py-1.5 text-xs font-semibold hover:bg-emerald-600"
                >
                  ✅
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chairman panel (content only, rendered inside BottomDrawer) ─────────
const SEGMENTS: { phase: GamePhase; label: string }[] = [
  { phase: 'un_summary', label: 'Новости' },
  { phase: 'un_comments', label: 'Выступления' },
  { phase: 'un_debate', label: 'Дебаты' },
  { phase: 'un_vote', label: 'Голосование' },
];
const LAYOUTS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Авто' },
  { value: 'spotlight', label: 'Спикер' },
  { value: 'grid', label: 'Сетка' },
];

function ChairmanContent() {
  const { snapshot, session, emitRaw } = useGame();
  if (!snapshot) return null;

  const phase = snapshot.phase;
  const inUn = phase.startsWith('un_');
  const act = (event: string, body?: unknown) => void emitRaw(event, body);
  const btn = 'rounded-lg px-3 py-2 text-sm font-semibold transition-colors';

  return (
    <div className="flex flex-col gap-4 text-sm">
      {inUn && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Сегмент</div>
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.phase}
                disabled={s.phase === phase}
                onClick={() => act(SocketEvents.RoomHostSetPhase, { phase: s.phase })}
                className={`${btn} ${s.phase === phase ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Раскладка видео</div>
        <div className="flex gap-2">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              disabled={snapshot.unLayout === l.value}
              onClick={() => act(SocketEvents.RoomHostLayout, { layout: l.value })}
              className={`${btn} ${snapshot.unLayout === l.value ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => act(SocketEvents.RoomHostPause, { paused: true })}
          className={`${btn} border border-slate-600 text-slate-300 hover:bg-slate-800`}
        >
          ☕ Перерыв
        </button>
        {phase === 'un_comments' && (
          <button
            onClick={() => act(SocketEvents.RoomHostSkipSpeaker)}
            className={`${btn} border border-amber-700 text-amber-400 hover:bg-amber-950/40`}
          >
            ⏭ Пропустить спикера
          </button>
        )}
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Игроки</div>
        <div className="flex flex-wrap gap-2">
          {snapshot.players.map((p: PlayerInfo) => {
            const isSpeaker = p.playerId === snapshot.currentSpeakerId;
            const isSelf = p.playerId === session?.playerId;
            return (
              <div
                key={p.playerId}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs ${
                  isSpeaker ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <span>{p.isBot ? '🤖 ' : ''}{p.name}</span>
                {phase === 'un_comments' && !isSpeaker && (
                  <button
                    title="Дать слово"
                    onClick={() => act(SocketEvents.RoomHostSetSpeaker, { playerId: p.playerId })}
                    className="rounded bg-slate-700 px-1.5 py-0.5 hover:bg-emerald-800"
                  >
                    🎤
                  </button>
                )}
                {!p.isBot && !isSelf && (
                  <button
                    title="Попросить выключить микрофон"
                    onClick={() => act(SocketEvents.RoomHostMute, { playerId: p.playerId })}
                    className="rounded bg-slate-700 px-1.5 py-0.5 hover:bg-red-900"
                  >
                    🔇
                  </button>
                )}
                {!isSelf && (
                  <button
                    title="Исключить"
                    onClick={() => act(SocketEvents.RoomKick, { targetPlayerId: p.playerId })}
                    className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-red-900/60 hover:text-red-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main UnScreen ───────────────────────────────────────────────────────
export function UnScreen() {
  const { snapshot, session, commentDone, hostContinue, emitRaw } = useGame();
  const [chairOpen, setChairOpen] = useState(false);

  if (!snapshot) return null;

  const me = snapshot.players.find((p: PlayerInfo) => p.playerId === session?.playerId);
  const isHost = me?.isHost ?? false;
  const speaker = snapshot.players.find((p: PlayerInfo) => p.playerId === snapshot.currentSpeakerId);
  const itsMe = snapshot.currentSpeakerId === session?.playerId;
  const phase = snapshot.phase;

  const effectiveLayout: 'spotlight' | 'grid' | 'strip' =
    snapshot.unLayout !== 'auto'
      ? snapshot.unLayout
      : phase === 'un_debate' || phase === 'un_vote'
      ? 'grid'
      : 'spotlight'; // un_summary, un_comments, results — spotlight

  const duckOthers =
    phase === 'un_summary' || (phase === 'un_comments' && !!snapshot.currentSpeakerId);
  // un_summary → null (авто-выбор по громкости), иначе — текущий спикер/ведущий
  const spotlightId = phase === 'un_summary' ? null : snapshot.currentSpeakerId;

  // Control bar buttons passed into VideoGrid
  const barControls = (
    <>
      {itsMe && phase === 'un_comments' && (
        <button
          onClick={() => void commentDone()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          Я закончил 🎤
        </button>
      )}
      {isHost && phase === 'un_debate' && (
        <>
          <button
            onClick={() => void emitRaw(SocketEvents.RoomHostExtend, { extraSeconds: 120 })}
            className="rounded-lg border border-amber-600 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-950/40"
          >
            +2 мин
          </button>
          <button
            onClick={() => void emitRaw(SocketEvents.RoomHostExtend, { extraSeconds: 0 })}
            className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-500"
          >
            Завершить
          </button>
        </>
      )}
      {isHost && snapshot.waitingContinue && (
        <button
          onClick={() => void hostContinue()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          ▶ Продолжить
        </button>
      )}
      {!isHost && snapshot.waitingContinue && (
        <span className="text-xs text-amber-400">⏳ Ждём хоста…</span>
      )}
      {isHost && snapshot.pause.paused && !snapshot.pause.manual && (
        <button
          onClick={() => void emitRaw(SocketEvents.RoomHostResume, {})}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-500"
        >
          ▶ Продолжить без него
        </button>
      )}
      {isHost && (
        <motion.button
          onClick={() => setChairOpen((v) => !v)}
          whileTap={{ scale: 0.95 }}
          title="Пульт председателя"
          className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
            chairOpen ? 'bg-amber-500 text-slate-950' : 'border border-amber-700 text-amber-400 hover:bg-amber-950/40'
          }`}
        >
          👑
        </motion.button>
      )}
    </>
  );

  // Phase-specific content rendered below video
  const phaseContent = (
    <AnimatePresence mode="wait">
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-3"
      >
        {phase === 'un_summary' && (
          <>
            {snapshot.news ? (
              <NewsPlayer
                news={snapshot.news}
                isHost={isHost}
                cursor={snapshot.newsCursor}
                onSkip={() => void emitRaw(SocketEvents.RoomHostNewsSkip)}
              />
            ) : (
              <NewsFeed />
            )}
          </>
        )}

        {phase === 'un_comments' && (
          <>
            {snapshot.you && <DeclareForbes />}
            <NewsFeed />
          </>
        )}

        {phase === 'un_debate' && (
          <>
            {snapshot.you && <DeclareForbes />}
            <NewsFeed />
          </>
        )}

        {phase === 'un_vote' && (
          <>
            {snapshot.you && <DeclareForbes />}
            <ForbesLeaderboard />
            <WarCourtPanel />
            <VotePanel />
          </>
        )}

        {phase === 'results' && (
          <>
            {snapshot.lastResults?.map((r: { countryId: string; countryName: string; lines: string[] }) => (
              <div key={r.countryId} className="rounded-xl bg-slate-900 p-4">
                <div className="mb-1 font-bold text-amber-400">{r.countryName}</div>
                <ul className="list-inside list-disc text-sm text-slate-300">
                  {r.lines.map((l: string, i: number) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            ))}
            {!snapshot.lastResults?.length && <p className="text-slate-400">Год пересчитан…</p>}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );

  // un_summary: news content is main, video is a strip
  const newsFirst = phase === 'un_summary';

  // Shared header block used in news-first mode
  const phaseHeader = (
    <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-2">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-400">
          {PHASE_TITLES[phase] ?? phase}
        </div>
        <div className="text-xs text-slate-400">Год {snapshot.year}/{snapshot.totalYears}</div>
      </div>
      <div className="text-right">
        {snapshot.waitingContinue ? (
          <span className="text-xs text-amber-400">Таймер завершён</span>
        ) : (
          <Timer endsAt={snapshot.phaseEndsAt} />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 md:flex-row">
      {newsFirst ? (
        <>
          {/* NEWS-FIRST (un_summary): scrollable content top, video strip at bottom */}
          <div className="flex min-h-0 flex-1 flex-col">
            {phaseHeader}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-4 py-3">{phaseContent}</div>
            </div>
            {/* Video strip: horizontal at bottom across full width */}
            <div className="h-36 shrink-0 border-t border-slate-800">
              <VideoGrid
                kind="un"
                players={snapshot.players}
                layout="strip"
                spotlightId={spotlightId}
                duckOthers={duckOthers}
                showControls={false}
                showControlBar={true}
                hostControls={barControls}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* VIDEO-FIRST (default): video is main, content below/sidebar */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Floating header overlay */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-slate-950/90 to-transparent px-4 pb-6 pt-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                  {PHASE_TITLES[phase] ?? phase}
                </div>
                <div className="text-xs text-slate-400">Год {snapshot.year}/{snapshot.totalYears}</div>
              </div>
              <div className="text-right">
                {snapshot.waitingContinue ? (
                  <span className="text-xs text-amber-400">Таймер завершён</span>
                ) : (
                  <Timer endsAt={snapshot.phaseEndsAt} />
                )}
              </div>
            </div>

            {/* Current speaker indicator for un_comments */}
            {phase === 'un_comments' && speaker && (
              <div className="pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center">
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full bg-emerald-900/80 px-4 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm"
                >
                  🎤 {speaker.name} {speaker.countryName ? `· ${speaker.countryName}` : ''}
                </motion.div>
              </div>
            )}

            <VideoGrid
              kind="un"
              players={snapshot.players}
              layout={effectiveLayout}
              spotlightId={spotlightId}
              duckOthers={duckOthers}
              showControls={false}
              showControlBar={true}
              hostControls={barControls}
            />
          </div>

          {/* Phase content: below video (mobile) or right sidebar (md+) */}
          <div className="max-h-[30dvh] shrink-0 overflow-y-auto border-t border-slate-800 md:max-h-none md:w-72 md:border-l md:border-t-0">
            <div className="px-4 py-3">{phaseContent}</div>
          </div>
        </>
      )}

      {/* Chairman panel: BottomDrawer */}
      <BottomDrawer
        open={isHost && chairOpen}
        onClose={() => setChairOpen(false)}
        title="👑 Пульт председателя ООН"
      >
        <ChairmanContent />
      </BottomDrawer>
    </div>
  );
}
