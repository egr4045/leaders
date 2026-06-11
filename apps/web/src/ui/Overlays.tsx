import { useGame } from '../lib/useGame';
import { Timer } from './Timer';

/** «Игрок X переподключается…» — блокирующий оверлей паузы (раздел 13). */
export function PauseOverlay() {
  const { snapshot } = useGame();
  if (!snapshot?.pause.paused) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-slate-950/90 backdrop-blur">
      <div className="text-4xl animate-pulse">📡</div>
      <div className="text-lg font-semibold">
        {snapshot.pause.waitingFor.length > 0
          ? `${snapshot.pause.waitingFor.join(', ')} переподключается…`
          : 'Пауза…'}
      </div>
      {snapshot.pause.resumeDeadline && (
        <div className="text-sm text-slate-400">
          Продолжим без них через <Timer endsAt={snapshot.pause.resumeDeadline} />
        </div>
      )}
    </div>
  );
}

export function ErrorToast() {
  const { error, clearError } = useGame();
  if (!error) return null;
  return (
    <button
      onClick={clearError}
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-red-600 px-4 py-2 text-sm shadow-lg"
    >
      {error} ✕
    </button>
  );
}
