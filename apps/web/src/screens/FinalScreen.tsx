import { useGame } from '../lib/useGame';

export function FinalScreen() {
  const { snapshot, leaveRoom } = useGame();
  if (!snapshot?.finalForbes) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-6 p-6">
      <h1 className="text-4xl font-black text-amber-400">СПИСОК ФОРБС</h1>
      <p className="text-sm text-slate-400">Реальные состояния вскрыты. Сравните с тем, что вам заявляли.</p>

      <ol className="flex w-full flex-col gap-2">
        {snapshot.finalForbes.map((f, i) => (
          <li
            key={f.playerId}
            className={`flex items-center gap-4 rounded-xl p-4 ${
              i === 0 ? 'border-2 border-amber-400 bg-amber-950/30' : 'bg-slate-900'
            }`}
          >
            <div className="text-3xl font-black text-slate-600">{i + 1}</div>
            <div className="flex-1">
              <div className="font-bold">
                {f.playerName} <span className="text-slate-400">· {f.countryName}</span>
              </div>
              <div className="text-xs text-slate-500">
                заявлял: {f.declared ?? 'молчал'}
                {f.questName && (
                  <> · квест «{f.questName}»: {f.questDone ? '✅' : '❌'}</>
                )}
              </div>
            </div>
            <div className="text-2xl font-black tabular-nums text-amber-400">{f.real}</div>
          </li>
        ))}
      </ol>

      <button onClick={() => void leaveRoom()} className="rounded-xl bg-slate-800 px-6 py-3">
        В главное меню
      </button>
    </div>
  );
}
