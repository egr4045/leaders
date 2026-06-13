import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { adminApi, CardEntry } from '../api';

interface CustomCardNodeData {
  card: CardEntry;
  onRefresh: () => void;
}

const AVAILABLE_CONDITIONS = [
  { id: 'no_rich', label: 'Нет богачей' },
  { id: 'rich_exist', label: 'Есть богачи' },
  { id: 'siloviki_dominate', label: 'Силовики ≥20%' },
  { id: 'smi_strong', label: 'СМИ ≥7' },
  { id: 'food_surplus', label: 'Избыток еды' },
  { id: 'golod', label: 'Голод' },
  { id: 'giperinflyaciya', label: 'Инфляция ≥20%' },
];

export function CustomCardNode({ data }: { data: CustomCardNodeData }) {
  const { card, onRefresh } = data;
  
  // Local state for condition editing
  const initialConditions = (card.raw?.requires as any)?.conditions || [];
  const [conditions, setConditions] = useState<string[]>(initialConditions);
  const [saving, setSaving] = useState(false);

  const handleSaveConditions = async () => {
    setSaving(true);
    try {
      const newRequires = { ...(card.raw?.requires as any) };
      if (conditions.length > 0) {
        newRequires.conditions = conditions;
      } else {
        delete newRequires.conditions;
      }
      
      const newRaw = { ...card.raw, requires: newRequires };
      await adminApi.replaceCard(card.cardId, newRaw);
      onRefresh();
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleCondition = (id: string) => {
    if (conditions.includes(id)) {
      setConditions(conditions.filter(c => c !== id));
    } else {
      setConditions([...conditions, id]);
    }
  };

  const hasChanges = JSON.stringify(conditions.sort()) !== JSON.stringify([...initialConditions].sort());

  // Compile inputs (requirements)
  const reqStatuses = (card.raw?.requires as any)?.statuses as string[] || [];

  return (
    <div className="flex flex-col min-w-[280px] max-w-[350px] rounded-lg shadow-xl bg-slate-800 border border-slate-900 font-sans">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-900 flex flex-col relative gap-1">
        <div className="flex justify-between items-start">
          <span className="text-amber-500 font-bold text-[10px] uppercase">{card.speaker}</span>
          <span className="text-slate-500 text-[10px]">{card.cardId}</span>
        </div>
        <span className="text-slate-200 font-medium text-xs leading-snug">{card.situation || 'Нет описания ситуации'}</span>
        {card.once && <span className="absolute top-1 right-1 text-[9px] bg-purple-900/50 text-purple-300 px-1 rounded">ОДНОРАЗ</span>}
      </div>

      {/* Requires */}
      <div className="flex flex-col p-2 bg-slate-800/50 border-b border-slate-700/50 gap-1">
        <div className="text-[10px] uppercase text-slate-500 font-semibold">Требует статусы:</div>
        <div className="flex flex-wrap gap-1">
          {reqStatuses.length === 0 && <span className="text-[10px] text-slate-600 italic">Нет</span>}
          {reqStatuses.map((s) => (
            <div key={`req_${s}`} className="relative flex items-center h-4">
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`req_${s}`}
                className="w-2 h-2 bg-slate-400 border border-slate-600 !left-[-11px]"
              />
              <span className="text-[10px] bg-slate-700 text-slate-300 px-1 rounded">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Choices */}
      <div className="flex flex-col p-2 gap-2 border-b border-slate-700/50">
        <div className="text-[10px] uppercase text-slate-500 font-semibold">Варианты ответа:</div>
        {card.choices.map((ch, idx) => {
          const rawChoice = (card.raw?.choices as any[])?.[idx];
          const ef = ch.effects as any;
          const addSt = (rawChoice?.addStatuses || ef?.addStatuses || []) as string[];
          const remSt = (rawChoice?.removeStatuses || ef?.removeStatuses || []) as string[];
          const resourceEffects: string[] = [];
          if (ef) {
            ['money', 'food', 'influence', 'population', 'industry', 'dovolstvo'].forEach(res => {
              if (ef[res]) resourceEffects.push(res + (ef[res] > 0 ? '+' : '-'));
            });
            if (ef.sectors) {
              ['economy', 'science', 'army', 'smi', 'intel'].forEach(sec => {
                if (ef.sectors[sec]) resourceEffects.push(sec + (ef.sectors[sec] > 0 ? '+' : '-'));
              });
            }
          }

          return (
            <div key={idx} className="relative bg-slate-900/50 border border-slate-700 rounded p-2 flex flex-col gap-1">
              <span className="text-xs text-slate-300">{ch.label}</span>
              
              <div className="flex flex-wrap gap-1 justify-end mt-1">
                {addSt.map(s => (
                  <div key={`add_${s}`} className="relative flex items-center h-4">
                    <span className="text-[9px] text-emerald-400 font-medium px-1 bg-slate-800 rounded border border-emerald-900/50">+ {s}</span>
                    <Handle 
                      type="source" 
                      position={Position.Right} 
                      id={`add_${idx}_${s}`}
                      className="w-2 h-2 bg-emerald-500 border border-emerald-700 !right-[-13px]"
                    />
                  </div>
                ))}
                {remSt.map(s => (
                  <div key={`rem_${s}`} className="relative flex items-center h-4">
                    <span className="text-[9px] text-red-400 font-medium px-1 bg-slate-800 rounded border border-red-900/50">- {s}</span>
                    <Handle 
                      type="source" 
                      position={Position.Right} 
                      id={`rem_${idx}_${s}`}
                      className="w-2 h-2 bg-red-500 border border-red-700 !right-[-13px]"
                    />
                  </div>
                ))}
                {resourceEffects.map(r => (
                  <span key={r} className="text-[9px] text-amber-200 bg-amber-900/30 px-1 rounded">{r}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Editor */}
      <div className="p-2 bg-slate-900 border-t border-slate-950 flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">Условия появления</label>
          {hasChanges && (
            <button 
              onClick={handleSaveConditions}
              disabled={saving}
              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-[10px] font-bold text-slate-900 rounded"
            >
              {saving ? '...' : 'Сохранить'}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          {conditions.map(condId => {
            const label = AVAILABLE_CONDITIONS.find(c => c.id === condId)?.label || condId;
            return (
              <button
                key={condId}
                onClick={() => toggleCondition(condId)}
                title="Нажмите чтобы удалить"
                className="text-[9px] px-1.5 py-0.5 rounded border transition-colors bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50"
              >
                {label} &times;
              </button>
            );
          })}
          
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) toggleCondition(e.target.value);
            }}
            className="text-[9px] px-1.5 py-0.5 rounded border bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600 outline-none"
          >
            <option value="">+ Добавить...</option>
            {AVAILABLE_CONDITIONS.filter(c => !conditions.includes(c.id)).map(cond => (
              <option key={cond.id} value={cond.id}>{cond.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
