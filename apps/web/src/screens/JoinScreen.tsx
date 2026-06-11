import { useState } from 'react';
import { useGame } from '../lib/useGame';

export function JoinScreen() {
  const { createRoom, joinRoom, connected } = useGame();
  const [name, setName] = useState(localStorage.getItem('leaders.name') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const remember = () => localStorage.setItem('leaders.name', name.trim());

  const submit = async (action: () => Promise<void>) => {
    if (!name.trim()) return;
    remember();
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-center text-4xl font-black tracking-tight">
        ЛИДЕРЫ <span className="text-amber-400">ГОСУДАРСТВ</span>
      </h1>
      <p className="max-w-sm text-center text-sm text-slate-400">
        Пати-игра про власть, деньги и враньё. Победит не великая держава, а богатый лидер.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="Ваше имя"
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-amber-400"
        />
        <button
          disabled={busy || !connected || !name.trim()}
          onClick={() => void submit(() => createRoom(name.trim()))}
          className="rounded-xl bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-40"
        >
          Создать комнату
        </button>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
            placeholder="КОД"
            className="w-28 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center font-mono tracking-widest outline-none focus:border-amber-400"
          />
          <button
            disabled={busy || !connected || !name.trim() || code.length !== 4}
            onClick={() => void submit(() => joinRoom(code, name.trim()))}
            className="flex-1 rounded-xl border border-amber-500 px-4 py-3 font-bold text-amber-400 disabled:opacity-40"
          >
            Войти по коду
          </button>
        </div>
      </div>
      {!connected && <div className="text-sm text-red-400">Нет связи с сервером…</div>}
    </div>
  );
}
