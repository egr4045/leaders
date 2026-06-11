import { useGame } from '../lib/useGame';

export function LobbyScreen() {
  const { snapshot, session, pickCountry, startGame, leaveRoom } = useGame();
  if (!snapshot || !session) return null;

  const me = snapshot.players.find((p) => p.playerId === session.playerId);
  const myCountry = me?.countryId ?? null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-black">Лобби</h1>
        <div className="rounded-lg bg-slate-800 px-3 py-1 font-mono text-2xl tracking-widest text-amber-400">
          {snapshot.roomCode}
        </div>
      </header>
      <p className="text-sm text-slate-400">
        Скажи друзьям код комнаты. Игроков: {snapshot.players.length} (нужно{' '}
        {snapshot.totalYears >= 0 ? '6–9' : ''})
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Игроки</h2>
        <ul className="flex flex-col gap-1">
          {snapshot.players.map((p) => (
            <li
              key={p.playerId}
              className="flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2"
            >
              <span>
                {p.connected ? '🟢' : '⚪'} {p.name} {p.isHost && '👑'}
              </span>
              <span className="text-sm text-slate-400">{p.countryName ?? 'выбирает страну…'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Свободные страны</h2>
        <div className="flex flex-wrap gap-2">
          {snapshot.availableCountries.map((c) => (
            <button
              key={c.id}
              onClick={() => void pickCountry(c.id)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-amber-400"
            >
              {c.name}
            </button>
          ))}
          {snapshot.availableCountries.length === 0 && (
            <span className="text-sm text-slate-500">Все страны разобраны</span>
          )}
        </div>
        {myCountry && (
          <p className="mt-2 text-sm">
            Ваша страна:{' '}
            <b className="text-amber-400">
              {snapshot.players.find((p) => p.playerId === session.playerId)?.countryName}
            </b>
          </p>
        )}
      </section>

      <div className="mt-auto flex flex-col gap-2">
        {me?.isHost && (
          <button
            onClick={() => void startGame()}
            className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950"
          >
            Начать партию
          </button>
        )}
        <button onClick={() => void leaveRoom()} className="text-sm text-slate-500 underline">
          Выйти из комнаты
        </button>
      </div>
    </div>
  );
}
