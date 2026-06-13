import { useState } from 'react';

interface StatusInfo {
  id: string;
  name: string;
  type: string;
  description?: string;
}

const TYPE_LABELS: Record<string, string> = {
  law: 'закон',
  regime: 'режим',
  tech: 'техно',
  wonder: 'чудо',
  state: 'статус',
  special: 'особое',
};

const TYPE_COLORS: Record<string, { badge: string; chip: string }> = {
  law:     { badge: 'bg-blue-900/40 text-blue-300 hover:bg-blue-800/50',     chip: 'bg-blue-800 text-blue-200' },
  regime:  { badge: 'bg-purple-900/40 text-purple-300 hover:bg-purple-800/50', chip: 'bg-purple-800 text-purple-200' },
  tech:    { badge: 'bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/50',     chip: 'bg-cyan-800 text-cyan-200' },
  wonder:  { badge: 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/50',  chip: 'bg-amber-800 text-amber-200' },
  state:   { badge: 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60',  chip: 'bg-slate-700 text-slate-300' },
  special: { badge: 'bg-rose-900/40 text-rose-300 hover:bg-rose-800/50',     chip: 'bg-rose-800 text-rose-200' },
};

export function StatusBadge({ status }: { status: StatusInfo }) {
  const [open, setOpen] = useState(false);
  const colors = TYPE_COLORS[status.type] ?? TYPE_COLORS['state']!;
  const label = TYPE_LABELS[status.type] ?? status.type;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`rounded px-2 py-0.5 text-xs transition-colors cursor-pointer ${colors.badge}`}
      >
        {status.name}
        <span className="ml-1 opacity-60 text-[10px]">{label}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-white">{status.name}</div>
                <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors.chip}`}>
                  {label}
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 text-lg">✕</button>
            </div>
            {status.description ? (
              <p className="text-sm text-slate-300 leading-relaxed">{status.description}</p>
            ) : (
              <p className="text-sm text-slate-600 italic">Описание не указано</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
