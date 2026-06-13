import { useEffect, useState } from 'react';
import type { PrivateCountryView, PublicCountryView } from '@leaders/shared';
import { SocketEvents } from '@leaders/shared';
import { socket } from '../socket';
import { useGame } from '../lib/useGame';
import { VideoGrid } from './VideoGrid';
import { TradePanel } from '../screens/cabinet/TradePanel';

interface IncomingCall {
  callId: string;
  fromCountryId: string;
  fromName: string;
  fromCountryName: string;
}

/** Приватные звонки 1-на-1 в фазе Кабинета (раздел 9). */
export function CallPanel({
  you,
  others,
}: {
  you: PrivateCountryView;
  others: PublicCountryView[];
}) {
  const { emitRaw } = useGame();
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallWithCountryId, setActiveCallWithCountryId] = useState<string | null>(null);
  const [invitingCountryId, setInvitingCountryId] = useState<string | null>(null);
  const [outgoingId, setOutgoingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const onIncoming = (c: IncomingCall) => setIncoming(c);
    const onStarted = (d: { callId: string }) => {
      setOutgoingId(null);
      setActiveCallId(d.callId);
      setInvitingCountryId((prev) => {
        if (prev) setActiveCallWithCountryId(prev);
        return null;
      });
    };
    const onEnded = (d: { callId: string }) => {
      setActiveCallId((cur) => {
        if (cur === d.callId) setActiveCallWithCountryId(null);
        return cur === d.callId ? null : cur;
      });
      setOutgoingId((cur) => (cur === d.callId ? null : cur));
      setIncoming((cur) => (cur?.callId === d.callId ? null : cur));
    };
    socket.on(SocketEvents.CallIncoming, onIncoming);
    socket.on(SocketEvents.CallStarted, onStarted);
    socket.on(SocketEvents.CallEnded, onEnded);
    return () => {
      socket.off(SocketEvents.CallIncoming, onIncoming);
      socket.off(SocketEvents.CallStarted, onStarted);
      socket.off(SocketEvents.CallEnded, onEnded);
    };
  }, []);

  const invite = async (toCountryId: string) => {
    setMsg(null);
    setInvitingCountryId(toCountryId);
    const res = await emitRaw<{ callId: string }>(SocketEvents.CallInvite, { toCountryId });
    if (res.ok && res.data) {
      setOutgoingId(res.data.callId);
      setMsg('📞 Звоним…');
    } else {
      setMsg(res.error ?? 'Ошибка');
      setInvitingCountryId(null);
    }
  };

  const accept = async () => {
    if (!incoming) return;
    const res = await emitRaw(SocketEvents.CallAccept, { callId: incoming.callId });
    if (res.ok) {
      setActiveCallId(incoming.callId);
      setActiveCallWithCountryId(incoming.fromCountryId);
    }
    setIncoming(null);
  };

  const decline = async () => {
    if (!incoming) return;
    await emitRaw(SocketEvents.CallDecline, { callId: incoming.callId });
    setIncoming(null);
  };

  const hangup = async () => {
    if (activeCallId) await emitRaw(SocketEvents.CallEnd, { callId: activeCallId });
    setActiveCallId(null);
  };

  return (
    <>
      {/* входящий звонок */}
      {incoming && !activeCallId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-6 backdrop-blur">
          <div className="animate-bounce text-5xl">📞</div>
          <div className="text-center">
            <b>{incoming.fromName}</b> ({incoming.fromCountryName})<br />
            предлагает поговорить тет-а-тет
          </div>
          <div className="flex gap-3">
            <button onClick={() => void accept()} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold">
              Принять
            </button>
            <button onClick={() => void decline()} className="rounded-xl bg-red-700 px-6 py-3 font-bold">
              Отклонить
            </button>
          </div>
        </div>
      )}

      {/* активный звонок */}
      {activeCallId && (
        <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-slate-950/95 p-4 overflow-y-auto">
          <div className="text-center text-sm text-slate-400 shrink-0">Приватный звонок — никто не слышит</div>
          <div className="shrink-0">
            <VideoGrid kind="call" callId={activeCallId} />
          </div>
          
          {activeCallWithCountryId && (
            <div className="mx-auto w-full max-w-md shrink-0">
              <TradePanel 
                you={you} 
                others={others.filter(o => o.countryId === activeCallWithCountryId)} 
                defaultTargetCountryId={activeCallWithCountryId}
                forceOpen={true}
              />
            </div>
          )}

          <button onClick={() => void hangup()} className="mx-auto mt-auto rounded-xl bg-red-700 px-8 py-3 font-bold shrink-0">
            Положить трубку
          </button>
        </div>
      )}

      {/* кнопка-список */}
      <div className="w-full max-w-sm">
        <button
          onClick={() => setOpen(!open)}
          className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"
        >
          📞 Позвонить (осталось {you.callsLeft}) {open ? '▲' : '▼'}
        </button>
        {open && (
          <div className="mt-2 flex flex-col gap-1 rounded-xl bg-slate-900 p-3 text-sm">
            {others.map((o) => (
              <button
                key={o.countryId}
                disabled={you.callsLeft <= 0 || !!outgoingId}
                onClick={() => void invite(o.countryId)}
                className="rounded-lg border border-slate-800 px-3 py-2 text-left hover:border-amber-400 disabled:opacity-40"
              >
                {o.countryName} <span className="text-slate-500">({o.playerName})</span>
              </button>
            ))}
            {outgoingId && (
              <button
                onClick={() => void emitRaw(SocketEvents.CallEnd, { callId: outgoingId }).then(() => setOutgoingId(null))}
                className="rounded-lg bg-slate-700 px-3 py-2"
              >
                Отменить вызов
              </button>
            )}
            {msg && <div className="text-center text-xs">{msg}</div>}
          </div>
        )}
      </div>
    </>
  );
}
