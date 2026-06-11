import { useGame } from '../lib/useGame';
import { Timer } from '../ui/Timer';

const PHASE_TITLES: Record<string, string> = {
  un_summary: '📺 Новости ООН',
  un_comments: '🎤 Круг комментариев',
  un_debate: '🗣 Свободные дебаты',
  un_vote: '🗳 Голосование ООН',
  results: '📊 Итоги года',
};

/** Каркас фазы ООН. Сводки, голосование и видеосетка добавляются на Э6/Э7. */
export function UnScreen() {
  const { snapshot, session, commentDone } = useGame();
  if (!snapshot) return null;

  const speaker = snapshot.players.find((p) => p.playerId === snapshot.currentSpeakerId);
  const itsMe = snapshot.currentSpeakerId === session?.playerId;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center gap-6 p-6">
      <header className="flex w-full items-center justify-between">
        <div className="text-xs uppercase text-slate-500">
          Год {snapshot.year}/{snapshot.totalYears}
        </div>
        <div className="text-2xl">
          <Timer endsAt={snapshot.phaseEndsAt} />
        </div>
      </header>

      <h1 className="text-3xl font-black">{PHASE_TITLES[snapshot.phase] ?? snapshot.phase}</h1>

      {snapshot.phase === 'un_summary' && (
        <p className="text-slate-400">Сводка новостей появится здесь (Э6). Пока — пауза на чай.</p>
      )}

      {snapshot.phase === 'un_comments' && (
        <div className="flex flex-col items-center gap-4">
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
        </div>
      )}

      {snapshot.phase === 'un_debate' && (
        <p className="text-slate-400">Общие дебаты: спорьте, торгуйтесь, обещайте.</p>
      )}

      {snapshot.phase === 'un_vote' && (
        <p className="text-slate-400">Голосование за санкции/поддержку появится здесь (Э6).</p>
      )}

      {snapshot.phase === 'results' && (
        <p className="text-slate-400">Год пересчитан. Скоро следующий…</p>
      )}

      <section className="w-full">
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Страны</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {snapshot.others.map((o) => (
            <div key={o.countryId} className="rounded-xl bg-slate-900 p-3 text-sm">
              <div className="font-bold">{o.countryName}</div>
              <div className="text-xs text-slate-400">{o.playerName}</div>
              <div className="mt-1 text-xs">
                Форбс (заявл.): {o.declaredForbes ?? '—'}
                {o.sanctions > 0 && <span className="text-red-400"> · санкции ×{o.sanctions}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
