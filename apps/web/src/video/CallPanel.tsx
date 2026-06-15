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
  hideList = false,
}: {
  you: PrivateCountryView;
  others: PublicCountryView[];
  hideList?: boolean;
}) {
  const { emitRaw } = useGame();
  const [open, setOpen] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [activeCallWithCountryId, setActiveCallWithCountryId] = useState<string | null>(null);
  const [invitingCountryId, setInvitingCountryId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const incomingCalls = you.incomingCalls ?? [];
  const outgoingCall = you.outgoingCall;

  useEffect(() => {
    if (you.activeCall) {
      setActiveCallId(you.activeCall.callId);
      setActiveCallWithCountryId(you.activeCall.withCountryId);
    } else {
      setActiveCallId(null);
      setActiveCallWithCountryId(null);
    }
  }, [you.activeCall]);

  useEffect(() => {
    let osc: any;
    let ctx: any;
    let interval: any;
    if (outgoingCall?.isBusy) {
      try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 425; // busy tone frequency
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        
        let on = true;
        interval = setInterval(() => {
          on = !on;
          gain.gain.setValueAtTime(on ? 1 : 0, ctx.currentTime);
        }, 500); // 0.5s on, 0.5s off
      } catch (e) {}
    }
    return () => {
      if (interval) clearInterval(interval);
      if (osc) { osc.stop(); osc.disconnect(); }
      if (ctx) ctx.close().catch(() => {});
    };
  }, [outgoingCall?.isBusy]);

  useEffect(() => {
    const onStarted = (d: { callId: string }) => {
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
    };
    socket.on(SocketEvents.CallStarted, onStarted);
    socket.on(SocketEvents.CallEnded, onEnded);
    return () => {
      socket.off(SocketEvents.CallStarted, onStarted);
      socket.off(SocketEvents.CallEnded, onEnded);
    };
  }, []);

  const invite = async (toCountryId: string) => {
    setMsg(null);
    setInvitingCountryId(toCountryId);
    const res = await emitRaw<{ callId: string }>(SocketEvents.CallInvite, { toCountryId });
    if (!res.ok) {
      setMsg(res.error ?? 'Ошибка');
      setInvitingCountryId(null);
    }
  };

  const accept = async (callId: string, fromCountryId: string) => {
    if (activeCallId) {
      // Сбрасываем текущий звонок перед ответом
      await emitRaw(SocketEvents.CallEnd, { callId: activeCallId });
      setActiveCallId(null);
      setActiveCallWithCountryId(null);
    }
    const res = await emitRaw(SocketEvents.CallAccept, { callId });
    if (res.ok) {
      setActiveCallId(callId);
      setActiveCallWithCountryId(fromCountryId);
    }
  };

  const decline = async (callId: string) => {
    await emitRaw(SocketEvents.CallDecline, { callId });
  };

  const hangup = async () => {
    if (activeCallId) await emitRaw(SocketEvents.CallEnd, { callId: activeCallId });
    setActiveCallId(null);
  };
  const firstCall = incomingCalls[0];

  return (
    <>
      {/* входящий звонок */}
      {firstCall && !activeCallId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-6 backdrop-blur">
          <div className="animate-bounce text-5xl">📞</div>
          <div className="text-center">
            <b>{firstCall.fromCountryName}</b><br />
            предлагает поговорить тет-а-тет
          </div>
          <div className="flex gap-3">
            <button onClick={() => void accept(firstCall.callId, firstCall.fromCountryId)} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold">
              Принять
            </button>
            <button onClick={() => void decline(firstCall.callId)} className="rounded-xl bg-red-700 px-6 py-3 font-bold">
              Отклонить
            </button>
          </div>
          {incomingCalls.length > 1 && (
            <div className="mt-4 text-sm text-slate-400">
              Также звонят: {incomingCalls.slice(1).map(c => c.fromCountryName).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* исходящий звонок (в режиме hideList Caller ничего не видит, дадим ему оверлей) */}
      {outgoingCall && !activeCallId && !firstCall && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 p-6 backdrop-blur">
          <div className="animate-pulse text-5xl">📞</div>
          <div className="text-center">
            <b>{outgoingCall.toCountryName}</b><br />
            {outgoingCall.isBusy ? (
              <span className="text-amber-400 font-bold">⚠️ Абонент занят. Вы {outgoingCall.queuePosition}-й в очереди...</span>
            ) : (
              <span className="text-emerald-400 font-bold">Звоним...</span>
            )}
          </div>
          <button
            onClick={() => void emitRaw(SocketEvents.CallEnd, { callId: outgoingCall.callId })}
            className="mt-4 rounded-xl bg-slate-700 px-6 py-3 font-bold hover:bg-slate-600"
          >
            Отменить вызов
          </button>
        </div>
      )}

      {/* активный звонок */}
      {activeCallId && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-slate-950/95 p-3">
          {/* Уведомления о входящих во время звонка */}
          {incomingCalls.length > 0 && (
            <div className="absolute right-4 top-4 z-50 flex flex-col gap-2">
              {incomingCalls.map(c => (
                <div key={c.callId} className="rounded-lg border border-amber-500/50 bg-slate-900/90 p-3 shadow-lg backdrop-blur">
                  <div className="text-sm font-bold text-slate-200">📞 {c.fromCountryName} (в очереди)</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => void accept(c.callId, c.fromCountryId)}
                      className="rounded bg-emerald-700 px-3 py-1 text-xs text-white hover:bg-emerald-600"
                    >
                      Ответить
                    </button>
                    <button
                      onClick={() => void decline(c.callId)}
                      className="rounded bg-red-800 px-3 py-1 text-xs text-white hover:bg-red-700"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="shrink-0 pb-1 text-center text-xs text-slate-500">Приватный звонок — никто не слышит</div>

          {/* Main body: video + trade side-by-side on md+ */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
            <div className="min-h-0 flex-1">
              <VideoGrid kind="call" callId={activeCallId} />
            </div>
            {activeCallWithCountryId && (
              <div className="shrink-0 overflow-y-auto md:w-80">
                <TradePanel
                  you={you}
                  others={others.filter(o => o.countryId === activeCallWithCountryId)}
                  defaultTargetCountryId={activeCallWithCountryId}
                  forceOpen={true}
                />
              </div>
            )}
          </div>

          <button onClick={() => void hangup()} className="mx-auto mt-3 shrink-0 rounded-xl bg-red-700 px-8 py-3 font-bold hover:bg-red-600">
            Положить трубку
          </button>
        </div>
      )}

      {/* кнопка-список (скрыто в hideList режиме) */}
      {!hideList && (
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
                  disabled={you.callsLeft <= 0 || !!outgoingCall}
                  onClick={() => void invite(o.countryId)}
                  className="rounded-lg border border-slate-800 px-3 py-2 text-left hover:border-amber-400 disabled:opacity-40"
                >
                  {o.countryName} <span className="text-slate-500">({o.playerName})</span>
                </button>
              ))}
              {outgoingCall && (
                <div className="rounded-lg bg-slate-800 px-3 py-2 text-center text-xs mt-2">
                  {outgoingCall.isBusy ? (
                    <span className="text-amber-400 font-bold">⚠️ Абонент занят. Вы {outgoingCall.queuePosition}-й в очереди...</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">📞 Звоним...</span>
                  )}
                </div>
              )}
              {outgoingCall && (
                <button
                  onClick={() => void emitRaw(SocketEvents.CallEnd, { callId: outgoingCall.callId })}
                  className="rounded-lg bg-slate-700 px-3 py-2 text-xs"
                >
                  Отменить вызов
                </button>
              )}
              {msg && <div className="text-center text-xs text-rose-400">{msg}</div>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
