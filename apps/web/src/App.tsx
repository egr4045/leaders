import { useEffect, useState } from 'react';
import { SocketEvents } from '@leaders/shared';
import { socket } from './socket';

export default function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [pong, setPong] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      socket.emit(SocketEvents.Ping, { hello: 'мир' }, (res: unknown) => {
        setPong(JSON.stringify(res));
      });
    };
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Лидеры государств</h1>
      <p className="text-slate-400">Каркас работает. Этап Э0.</p>
      <div className="rounded-lg border border-slate-700 px-4 py-2 text-sm">
        Сокет: {connected ? '🟢 подключён' : '🔴 нет связи'}
      </div>
      {pong && (
        <pre className="max-w-full overflow-auto rounded bg-slate-900 p-3 text-xs text-emerald-400">
          {pong}
        </pre>
      )}
    </div>
  );
}
