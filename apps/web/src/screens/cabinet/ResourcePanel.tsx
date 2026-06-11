import { useState } from 'react';
import type { PrivateCountryView } from '@leaders/shared';

const SECTOR_NAMES: Record<string, string> = {
  economy: 'Экономика',
  science: 'Наука',
  army: 'Армия',
  smi: 'СМИ',
  intel: 'Разведка',
};
const POP_NAMES: Record<string, string> = {
  rabotyagi: 'Работяги',
  umniki: 'Умники',
  siloviki: 'Силовики',
  mediyshchiki: 'Медийщики',
  ministry: 'Министры',
};

export function ResourcePanel({ you }: { you: PrivateCountryView }) {
  const [open, setOpen] = useState(false);
  const r = you.resources;

  return (
    <div className="w-full max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-sm"
      >
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          <b>💰 {r.money}</b>
          <b className="text-amber-400">🥇 {r.gold}</b>
          <b className="text-lime-400">🌾 {r.food}</b>
          <b className="text-sky-400">🗳 {r.influence}</b>
          <b className={you.dovolstvo < 25 ? 'text-red-400' : 'text-emerald-400'}>
            😊 {you.dovolstvo}
          </b>
        </span>
        <span className="text-slate-500">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-slate-900 p-3 text-sm">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Сектора</div>
            {Object.entries(you.sectors).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{SECTOR_NAMES[k] ?? k}</span>
                <span className="font-mono">{'▰'.repeat(Math.min(10, v))}{v}</span>
              </div>
            ))}
            <div className="mt-1 text-xs text-slate-500">наука: {you.sciencePoints} очк.</div>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Население</div>
            {Object.entries(you.population).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{POP_NAMES[k] ?? k}</span>
                <span className="font-mono">{v}</span>
              </div>
            ))}
          </div>
          <div className="col-span-2">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Статусы</div>
            <div className="flex flex-wrap gap-1">
              {you.statuses.map((s) => (
                <span key={s.id} className="rounded bg-slate-800 px-2 py-0.5 text-xs">
                  {s.name}
                </span>
              ))}
              {you.statuses.length === 0 && <span className="text-xs text-slate-600">нет</span>}
            </div>
          </div>
          {you.quest && (
            <div className="col-span-2 rounded-lg border border-purple-700/50 bg-purple-950/30 p-2">
              <div className="text-xs font-semibold uppercase text-purple-400">
                Тайный квест {you.quest.completed && '✓ выполнен'}
              </div>
              <div className="text-sm">{you.quest.name}</div>
              {you.quest.description && (
                <div className="text-xs text-slate-400">{you.quest.description}</div>
              )}
            </div>
          )}
          <div className="col-span-2 text-xs text-slate-500">
            Курс валюты: {you.moneyRate.toFixed(2)} · Инфляция: {(you.inflation * 100).toFixed(1)}% ·
            Форбс (реальный, видите только вы): <b className="text-amber-400">{Math.round(you.forbes.total)}</b>
          </div>
        </div>
      )}
    </div>
  );
}
