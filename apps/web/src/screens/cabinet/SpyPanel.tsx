import { useState } from 'react';
import type { PublicCountryView } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

interface SpyAction {
  kind: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const ACTIONS: SpyAction[] = [
  {
    kind: 'reveal',
    label: 'Разведка',
    description: 'Вскрыть ресурсы, сектора и реальный Форбс соседа',
    icon: '🔍',
    color: 'border-sky-700 bg-sky-950/30 hover:border-sky-500',
  },
  {
    kind: 'steal_money',
    label: 'Похитить деньги',
    description: 'Украсть 15% казны цели',
    icon: '💸',
    color: 'border-amber-700 bg-amber-950/30 hover:border-amber-500',
  },
  {
    kind: 'steal_food',
    label: 'Похитить еду',
    description: 'Украсть 25% продовольственных запасов цели',
    icon: '🌾',
    color: 'border-lime-700 bg-lime-950/30 hover:border-lime-500',
  },
  {
    kind: 'steal_gold',
    label: 'Похитить золото',
    description: 'Украсть 10% золотого резерва цели',
    icon: '🥇',
    color: 'border-yellow-700 bg-yellow-950/30 hover:border-yellow-500',
  },
  {
    kind: 'steal_science',
    label: 'Украсть науку',
    description: 'Похитить до 50 очков науки у цели',
    icon: '🔬',
    color: 'border-cyan-700 bg-cyan-950/30 hover:border-cyan-500',
  },
  {
    kind: 'provoke_riot',
    label: 'Спровоцировать беспорядки',
    description: 'Снизить довольство цели на 15',
    icon: '🔥',
    color: 'border-orange-700 bg-orange-950/30 hover:border-orange-500',
  },
  {
    kind: 'wreck_wonder',
    label: 'Сорвать чудо',
    description: 'Уничтожить последнее построенное чудо цели',
    icon: '💣',
    color: 'border-red-700 bg-red-950/30 hover:border-red-500',
  },
  {
    kind: 'assassinate_minister',
    label: 'Устранить министра',
    description: 'Убрать одного министра; аппарат цели год работает за двойную цену',
    icon: '🗡️',
    color: 'border-rose-700 bg-rose-950/30 hover:border-rose-500',
  },
];

export function SpyPanel({
  others,
  myCountryId: _myCountryId,
}: {
  others: PublicCountryView[];
  myCountryId: string;
}) {
  const { spyOrder } = useGame();
  const [open, setOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<string | null>(null);
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<{ success: boolean; kind: string; target: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const action = ACTIONS.find((a) => a.kind === selectedKind);

  const send = async () => {
    if (!action || !targetId) return;
    setBusy(true);
    setResult(null);
    const res = await spyOrder(action.kind, targetId);
    const targetName = others.find((o) => o.countryId === targetId)?.countryName ?? targetId;
    if (res !== null) {
      setResult({ success: res.success, kind: action.label, target: targetName });
    }
    setBusy(false);
    setSelectedKind(null);
    setTargetId('');
  };

  return (
    <div className="w-full">
      <button
        onClick={() => { setOpen(!open); setSelectedKind(null); setResult(null); }}
        className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
      >
        🕵️ Разведка {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-xl bg-slate-900 p-3">
          {/* Last result */}
          {result && (
            <div className={`rounded-lg border p-2 text-sm text-center ${result.success ? 'border-emerald-700 bg-emerald-950/30 text-emerald-300' : 'border-red-700 bg-red-950/30 text-red-300'}`}>
              {result.success
                ? `✅ «${result.kind}» против ${result.target} — успех`
                : `❌ «${result.kind}» против ${result.target} — провал, вас раскусили`}
            </div>
          )}

          {/* Action cards 2-column grid */}
          {!selectedKind && (
            <>
              <div className="text-xs text-slate-500">Выберите операцию:</div>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.kind}
                    onClick={() => { setSelectedKind(a.kind); setResult(null); }}
                    className={`rounded-xl border p-2.5 text-left transition-colors ${a.color}`}
                  >
                    <div className="text-xl">{a.icon}</div>
                    <div className="mt-1 text-xs font-semibold leading-tight">{a.label}</div>
                    <div className="mt-0.5 text-[10px] leading-tight text-slate-400">{a.description}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                Шанс успеха: ваша Разведка vs Разведка + СМИ цели. Лимит операций ограничен в год.
              </p>
            </>
          )}

          {/* Target selection after picking action */}
          {selectedKind && action && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedKind(null)}
                className="self-start text-xs text-slate-500 hover:text-slate-300"
              >
                ← назад
              </button>
              <div className="flex items-center gap-2 rounded-lg border border-slate-700 p-2">
                <span className="text-xl">{action.icon}</span>
                <div>
                  <div className="text-sm font-semibold">{action.label}</div>
                  <div className="text-xs text-slate-400">{action.description}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">Выберите цель:</div>
              <div className="flex flex-col gap-1">
                {others.map((o) => (
                  <button
                    key={o.countryId}
                    onClick={() => setTargetId(o.countryId)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      targetId === o.countryId
                        ? 'border-amber-500 bg-amber-950/30'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-medium">{o.countryName}</span>
                    <span className="ml-2 text-xs text-slate-400">{o.playerName}</span>
                  </button>
                ))}
              </div>
              <button
                disabled={!targetId || busy}
                onClick={() => void send()}
                className="rounded-xl bg-rose-700 py-2.5 font-bold text-white hover:bg-rose-600 disabled:opacity-40"
              >
                {busy ? 'Проводим операцию…' : 'Провести операцию'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
