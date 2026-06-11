import { useState } from 'react';
import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';

const PHASE_TITLES: Record<string, string> = {
  un_summary: '📺 Новости ООН',
  un_comments: '🎤 Круг комментариев',
  un_debate: '🗣 Свободные дебаты',
  un_vote: '🗳 Голосование ООН',
  results: '📊 Итоги года',
};

/** Заявить публичный Форбс: блеф — занизить или завысить (раздел 8). */
function DeclareForbes() {
  const { snapshot, declareForbes } = useGame();
  const [value, setValue] = useState('');
  if (!snapshot?.you) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3 text-sm">
      <div className="flex-1">
        <div className="text-xs text-slate-500">
          Ваш реальный Форбс: <b className="text-amber-400">{Math.round(snapshot.you.forbes.total)}</b>{' '}
          (видите только вы). Публично заявлено: <b>{snapshot.you.declaredForbes ?? '—'}</b>
        </div>
      </div>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="число"
        className="w-24 rounded border border-slate-700 bg-slate-950 px-2 py-1"
      />
      <button
        disabled={!value}
        onClick={() => {
          void declareForbes(Number(value));
          setValue('');
        }}
        className="rounded bg-amber-600 px-3 py-1 font-semibold disabled:opacity-40"
      >
        Заявить
      </button>
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
            {n.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
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
  };

  return (
    <div className="w-full">
      <div className="mb-2 text-sm text-slate-400">
        Голос стоит влияния. У вас: <b className="text-sky-400">🗳 {snapshot.you.resources.influence}</b>
        {msg && <span className="ml-3">{msg}</span>}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {snapshot.others.map((o) => {
          const tally = snapshot.voteTally[o.countryId];
          return (
            <div key={o.countryId} className="flex items-center justify-between rounded-xl bg-slate-900 p-3 text-sm">
              <div>
                <div className="font-bold">{o.countryName}</div>
                <div className="text-xs text-slate-500">
                  санкции {tally?.sanction ?? 0} · поддержка {tally?.support ?? 0}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => void vote(o.countryId, 'sanction')} className="rounded bg-red-700 px-2 py-1 text-xs font-semibold">
                  Санкции
                </button>
                <button onClick={() => void vote(o.countryId, 'support')} className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold">
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
  const { snapshot, session, commentDone } = useGame();
  if (!snapshot) return null;

  const speaker = snapshot.players.find((p) => p.playerId === snapshot.currentSpeakerId);
  const itsMe = snapshot.currentSpeakerId === session?.playerId;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center gap-5 p-5">
      <header className="flex w-full items-center justify-between">
        <div className="text-xs uppercase text-slate-500">
          Год {snapshot.year}/{snapshot.totalYears}
        </div>
        <div className="text-2xl">
          <Timer endsAt={snapshot.phaseEndsAt} />
        </div>
      </header>

      <h1 className="text-3xl font-black">{PHASE_TITLES[snapshot.phase] ?? snapshot.phase}</h1>

      {snapshot.you && <DeclareForbes />}

      {snapshot.phase === 'un_summary' && <NewsFeed />}

      {snapshot.phase === 'un_comments' && (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-lg">
            Говорит: <b className="text-amber-400">{speaker?.name ?? '…'}</b>
            {speaker?.countryName && <span className="text-slate-400"> ({speaker.countryName})</span>}
          </p>
          {itsMe && (
            <button
              onClick={() => void commentDone()}
              className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950"
            >
              Я закончил 🎤
            </button>
          )}
          <NewsFeed />
        </div>
      )}

      {snapshot.phase === 'un_debate' && (
        <>
          <p className="text-slate-400">Спорьте, торгуйтесь, обещайте. Обещания можно нарушать.</p>
          <NewsFeed />
        </>
      )}

      {snapshot.phase === 'un_vote' && <VotePanel />}

      {snapshot.phase === 'results' && (
        <div className="flex w-full flex-col gap-3">
          {snapshot.lastResults?.map((r) => (
            <div key={r.countryId} className="rounded-xl bg-slate-900 p-4">
              <div className="mb-1 font-bold text-amber-400">{r.countryName}</div>
              <ul className="list-inside list-disc text-sm text-slate-300">
                {r.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
          {!snapshot.lastResults?.length && <p className="text-slate-400">Год пересчитан…</p>}
        </div>
      )}
    </div>
  );
}
