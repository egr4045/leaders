import { useState } from 'react';
import type { PublicCountryView } from '@leaders/shared';
import { useGame } from '../../lib/useGame';

const ACTIONS: { kind: string; label: string; needsTarget: boolean; needsText: boolean }[] = [
  { kind: 'conceal', label: 'Умолчать о своём факте в сводке', needsTarget: false, needsText: true },
  { kind: 'insert_lie', label: 'Вставить ложь в чужую сводку', needsTarget: true, needsText: true },
  { kind: 'reveal', label: 'Вскрыть статы и Форбс соседа', needsTarget: true, needsText: false },
  { kind: 'steal_science', label: 'Украсть науку', needsTarget: true, needsText: false },
  { kind: 'wreck_wonder', label: 'Сорвать чудо', needsTarget: true, needsText: false },
];

export function SpyPanel({
  others,
  myCountryId,
}: {
  others: PublicCountryView[];
  myCountryId: string;
}) {
  const { spyOrder } = useGame();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(ACTIONS[2]!.kind);
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const action = ACTIONS.find((a) => a.kind === kind)!;

  const send = async () => {
    setBusy(true);
    setResult(null);
    const targetId = action.needsTarget ? target : myCountryId;
    const res = await spyOrder(kind, targetId, action.needsText ? text : undefined);
    if (res) {
      setResult(res.success ? '✅ Операция удалась' : '❌ Провал: вас раскусили');
    }
    setBusy(false);
  };

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"
      >
        🕵️ Разведка {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 rounded-xl bg-slate-900 p-3 text-sm">
          <select
            value={kind}
            onChange={(e) => { setKind(e.target.value); setResult(null); }}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
          >
            {ACTIONS.map((a) => (
              <option key={a.kind} value={a.kind}>{a.label}</option>
            ))}
          </select>
          {action.needsTarget && (
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
            >
              <option value="">— цель —</option>
              {others.map((o) => (
                <option key={o.countryId} value={o.countryId}>
                  {o.countryName} ({o.playerName})
                </option>
              ))}
            </select>
          )}
          {action.needsText && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === 'conceal' ? 'О чём умолчать (например: голод)' : 'Текст лжи для сводки'}
              maxLength={200}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
            />
          )}
          <button
            disabled={busy || (action.needsTarget && !target) || (action.needsText && !text.trim())}
            onClick={() => void send()}
            className="rounded-lg bg-rose-600 px-3 py-2 font-semibold disabled:opacity-40"
          >
            Провести операцию
          </button>
          {result && <div className="text-center">{result}</div>}
          <p className="text-xs text-slate-500">
            Шанс зависит от вашей Разведки против Разведки и СМИ цели. Лимит операций в год ограничен.
          </p>
        </div>
      )}
    </div>
  );
}
