import { useState } from 'react';
import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';
import { VideoGrid } from '../video/VideoGrid';
import { NewsPlayer } from '../news/NewsPlayer';
import { SocketEvents } from '@leaders/shared';

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
  const rank = myDeclared !== null
    ? others.filter((o) => (o.declaredForbes ?? 0) > myDeclared).length + 1
    : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-900 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>Реальный Форбс: <b className="text-amber-400">{Math.round(snapshot.you.forbes.total)}</b> (только вы)</span>
        {myDeclared !== null && (
          <span>Заявлено: <b className="text-slate-200">{myDeclared}</b>
            {rank !== null && <span className="ml-1 text-amber-400">— место #{rank} из {snapshot.players.filter(p => !p.isBot).length}</span>}
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
          className="w-32 rounded border border-slate-700 bg-slate-950 px-2 py-1"
        />
        <button
          disabled={!value}
          onClick={() => { void declareForbes(Number(value)); setValue(''); }}
          className="rounded bg-amber-600 px-3 py-1 font-semibold disabled:opacity-40"
        >
          Заявить
        </button>
      </div>
    </div>
  );
}

function NewsFeed() {
  const { snapshot } = useGame();
  if (!snapshot?.news) return null;
  return (
    <div className="flex w-full flex-col gap-3">
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
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-400">Влияние: <b className="text-sky-400">{snapshot.you.resources.influence}</b></span>
        {msg && <span className="text-amber-400 text-xs">{msg}</span>}
      </div>

      <details className="mb-3 rounded-lg border border-slate-700 text-xs">
        <summary className="cursor-pointer px-3 py-2 text-slate-400 hover:text-slate-200">Что дают санкции и поддержка?</summary>
        <div className="border-t border-slate-700 px-3 py-2 text-slate-400 leading-relaxed">
          <b className="text-red-400">Санкции</b> → +1 санкция у цели → +2% инфляции в год<br />
          <b className="text-emerald-400">Поддержка</b> → −1 санкция (или +10 влияния если санкций нет)<br />
          Стоимость голоса: 10 влияния
        </div>
      </details>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {snapshot.others.map((o) => {
          const tally = snapshot.voteTally[o.countryId];
          return (
            <div key={o.countryId} className="flex items-center justify-between rounded-xl bg-slate-900 p-3 text-sm">
              <div>
                <div className="font-bold">{o.countryName}</div>
                <div className="text-xs text-slate-500">
                  санкции {tally?.sanction ?? 0} · поддержка {tally?.support ?? 0}
                  {o.sanctions > 0 && <span className="ml-1 text-red-400">({o.sanctions} акт.)</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => void vote(o.countryId, 'sanction')} className="rounded bg-red-700 px-2 py-1 text-xs font-semibold hover:bg-red-600">
                  Санкции
                </button>
                <button onClick={() => void vote(o.countryId, 'support')} className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold hover:bg-emerald-600">
                  Поддержать
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnScreen() {
  const { snapshot, session, commentDone, hostContinue, emitRaw } = useGame();
  if (!snapshot) return null;

  const me = snapshot.players.find((p) => p.playerId === session?.playerId);
  const isHost = me?.isHost ?? false;
  const speaker = snapshot.players.find((p) => p.playerId === snapshot.currentSpeakerId);
  const itsMe = snapshot.currentSpeakerId === session?.playerId;
  const phase = snapshot.phase;

  const hostControls = isHost ? (
    <>
      {phase === 'un_debate' && (
        <>
          <button
            onClick={() => void emitRaw(SocketEvents.RoomHostExtend, { extraSeconds: 120 })}
            className="rounded-lg border border-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-950/40"
          >
            +2 мин
          </button>
          <button
            onClick={() => void emitRaw(SocketEvents.RoomHostExtend, { extraSeconds: 0 })}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-500"
          >
            Завершить дебаты
          </button>
        </>
      )}
      {snapshot.waitingContinue && (
        <button
          onClick={() => void hostContinue()}
          className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
        >
          ▶ Продолжить
        </button>
      )}
    </>
  ) : snapshot.waitingContinue ? (
    <span className="text-xs text-amber-400">⏳ Ждём хоста…</span>
  ) : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-2">
        <div>
          <div className="text-xs uppercase text-slate-500">Год {snapshot.year}/{snapshot.totalYears}</div>
          <div className="font-bold text-amber-400">{PHASE_TITLES[phase] ?? phase}</div>
        </div>
        <div className="text-right">
          {snapshot.waitingContinue ? (
            <span className="text-xs text-amber-400">Таймер завершён</span>
          ) : (
            <Timer endsAt={snapshot.phaseEndsAt} />
          )}
        </div>
      </header>

      {/* Main content — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">

        {/* un_summary */}
        {phase === 'un_summary' && (
          <div className="flex flex-col gap-3">
            {snapshot.you && <DeclareForbes />}
            {snapshot.news ? <NewsPlayer news={snapshot.news} /> : <NewsFeed />}
          </div>
        )}

        {/* un_comments */}
        {phase === 'un_comments' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
              <div className="text-xs uppercase text-slate-500 mb-1">Сейчас говорит</div>
              <div className="text-2xl font-bold text-amber-400">{speaker?.name ?? '…'}</div>
              {speaker?.countryName && (
                <div className="text-sm text-slate-400">{speaker.countryName}</div>
              )}
              {itsMe && (
                <button
                  onClick={() => void commentDone()}
                  className="mt-3 rounded-xl bg-amber-500 px-6 py-2.5 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Я закончил 🎤
                </button>
              )}
            </div>
            {snapshot.you && <DeclareForbes />}
            <NewsFeed />
          </div>
        )}

        {/* un_debate */}
        {phase === 'un_debate' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-slate-900 p-3 text-sm text-slate-400">
              Свободные дебаты — говорите все одновременно. Торгуйтесь, угрожайте, обещайте. Обещания можно нарушить.
            </div>
            {snapshot.you && <DeclareForbes />}
            <NewsFeed />
          </div>
        )}

        {/* un_vote */}
        {phase === 'un_vote' && (
          <div className="flex flex-col gap-3">
            {snapshot.you && <DeclareForbes />}
            <VotePanel />
          </div>
        )}

        {/* results */}
        {phase === 'results' && (
          <div className="flex flex-col gap-3">
            {snapshot.lastResults?.map((r) => (
              <div key={r.countryId} className="rounded-xl bg-slate-900 p-4">
                <div className="mb-1 font-bold text-amber-400">{r.countryName}</div>
                <ul className="list-inside list-disc text-sm text-slate-300">
                  {r.lines.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              </div>
            ))}
            {!snapshot.lastResults?.length && <p className="text-slate-400">Год пересчитан…</p>}
          </div>
        )}
      </div>

      {/* Video strip + control bar (single VideoGrid instance) */}
      <div className="shrink-0 border-t border-slate-800">
        <div className="px-2 pt-2" style={{ height: '7.5rem' }}>
          <VideoGrid
            kind="un"
            players={snapshot.players}
            layout="strip"
            showControls={false}
            showControlBar={true}
            hostControls={hostControls}
          />
        </div>
      </div>
    </div>
  );
}
