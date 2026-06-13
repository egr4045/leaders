import { useEffect, useState, useCallback } from 'react';
import { adminApi, type RoomSummary } from './api';

const PHASE_LABEL: Record<string, string> = {
  lobby: 'Лобби',
  cabinet: 'Кабинет',
  un_summary: 'ООН: сводка',
  un_comments: 'ООН: комментарии',
  un_debate: 'ООН: дебаты',
  un_vote: 'ООН: голосование',
  results: 'Итоги',
  year_summary: 'Сводка года',
  final: 'Финал',
};

export function SessionsPanel() {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [error, setError] = useState('');
  const [killing, setKilling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRooms(await adminApi.getRooms());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  const kill = async (code: string) => {
    if (!confirm(`Закрыть комнату ${code}? Игроков выкинет.`)) return;
    setKilling(code);
    try {
      await adminApi.killRoom(code);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setKilling(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Активных комнат: <span className="font-bold text-slate-200">{rooms.length}</span>
          <span className="ml-2 text-xs text-slate-600">обновляется каждые 5 сек</span>
        </div>
        <button onClick={() => void load()} className="text-xs text-amber-400 underline">
          Обновить
        </button>
      </div>

      {error && <div className="mb-3 rounded-lg border border-red-900 bg-red-950/30 p-2 text-sm text-red-300">{error}</div>}

      {rooms.length === 0 && <div className="py-10 text-center text-slate-600">Нет активных комнат</div>}

      <div className="flex flex-col gap-2">
        {rooms.map((r) => (
          <div key={r.code} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold tracking-widest text-amber-400">{r.code}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                  {PHASE_LABEL[r.phase] ?? r.phase}
                </span>
                {r.year != null && <span className="text-xs text-slate-500">год {r.year}</span>}
                {r.paused && <span className="text-xs text-amber-300">⏸ пауза</span>}
              </div>
              <button
                onClick={() => void kill(r.code)}
                disabled={killing === r.code}
                className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-40"
              >
                {killing === r.code ? 'Закрываю…' : '✕ Убить'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-500">
                👤 {r.humanCount} живых · 🤖 {r.botCount} ботов:
              </span>
              {r.players.map((p, i) => (
                <span
                  key={i}
                  className={`rounded px-1.5 py-0.5 text-xs ${
                    p.isBot ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-slate-200'
                  }`}
                  title={p.country ?? 'без страны'}
                >
                  <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${p.connected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  {p.name}
                  {p.isHost && ' 👑'}
                  {p.country ? ` · ${p.country}` : ''}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
