import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import { adminApi, CardEntry } from '../api';

interface CustomCardNodeData {
  card: CardEntry;
  onRefresh: () => void;
}

export function CustomCardNode({ data }: { data: CustomCardNodeData }) {
  const { card, onRefresh } = data;
  
  // Local state for condition editing
  const initialConditions = (card.raw?.requires as any)?.conditions?.join(', ') || '';
  const [conditions, setConditions] = useState(initialConditions);
  const [saving, setSaving] = useState(false);

  const handleSaveConditions = async () => {
    setSaving(true);
    try {
      const condArray = conditions.split(',').map(c => c.trim()).filter(Boolean);
      const newRequires = { ...(card.raw?.requires as any) };
      if (condArray.length > 0) {
        newRequires.conditions = condArray;
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

  // Compile inputs (requirements)
  const reqStatuses = (card.raw?.requires as any)?.statuses as string[] || [];

  // Compile outputs (triggers)
  const addStatuses = new Set<string>();
  const removeStatuses = new Set<string>();
  const resourceEffects = new Set<string>();

  card.choices.forEach(ch => {
    const ef = ch.effects as any;
    if (ef) {
      if (ef.addStatuses) ef.addStatuses.forEach((s: string) => addStatuses.add(s));
      if (ef.removeStatuses) ef.removeStatuses.forEach((s: string) => removeStatuses.add(s));
      // Try to parse basic resource impacts to show
      ['money', 'food', 'influence', 'population', 'industry'].forEach(res => {
        if (ef[res]) resourceEffects.add(res + (ef[res] > 0 ? '+' : '-'));
      });
    }
  });

  return (
    <div className="flex flex-col min-w-[250px] rounded-lg shadow-xl bg-slate-800 border border-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-700 to-slate-800 border-b border-slate-900 flex flex-col relative">
        <span className="text-amber-500 font-bold text-xs uppercase">{card.speaker}</span>
        <span className="text-slate-100 font-medium text-sm">{card.cardId}</span>
        {card.once && <span className="absolute top-2 right-2 text-[9px] bg-purple-900/50 text-purple-300 px-1 rounded">ОДНОРАЗ</span>}
      </div>

      {/* Body */}
      <div className="flex flex-row p-0">
        
        {/* Left Side (Inputs) */}
        <div className="flex flex-col flex-1 border-r border-slate-700/50 p-2 min-h-[50px] gap-2">
          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Требует</div>
          
          {reqStatuses.map((s, idx) => (
            <div key={`req_${s}`} className="relative flex items-center h-5">
              <Handle 
                type="target" 
                position={Position.Left} 
                id={`req_${s}`}
                className="w-2 h-2 bg-slate-400 border border-slate-600 !left-[-13px]"
              />
              <span className="text-xs text-slate-300 ml-1">{s}</span>
            </div>
          ))}
          {reqStatuses.length === 0 && <span className="text-[10px] text-slate-600 ml-1 italic">Без статусов</span>}
        </div>

        {/* Right Side (Outputs) */}
        <div className="flex flex-col flex-1 p-2 gap-2 text-right">
          <div className="text-[10px] uppercase text-slate-500 font-semibold mb-1">Триггерит</div>
          
          {Array.from(addStatuses).map(s => (
            <div key={`add_${s}`} className="relative flex items-center justify-end h-5">
              <span className="text-xs text-emerald-400 mr-1">+ {s}</span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`add_${s}`}
                className="w-2 h-2 bg-emerald-500 border border-emerald-700 !right-[-13px]"
              />
            </div>
          ))}

          {Array.from(removeStatuses).map(s => (
            <div key={`rem_${s}`} className="relative flex items-center justify-end h-5">
              <span className="text-xs text-red-400 mr-1">- {s}</span>
              <Handle 
                type="source" 
                position={Position.Right} 
                id={`rem_${s}`}
                className="w-2 h-2 bg-red-500 border border-red-700 !right-[-13px]"
              />
            </div>
          ))}

          {Array.from(resourceEffects).map(r => (
            <div key={`res_${r}`} className="relative flex items-center justify-end h-5">
              <span className="text-[10px] text-amber-200 mr-1 bg-amber-900/30 px-1 rounded">{r}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Footer / Editor */}
      <div className="p-2 bg-slate-900 border-t border-slate-950 flex flex-col gap-1">
        <label className="text-[10px] text-slate-500 font-semibold uppercase">Conditions (движок)</label>
        <div className="flex gap-1">
          <input 
            type="text" 
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="no_rich, hunger..."
            className="flex-1 bg-slate-950 text-slate-300 text-xs px-1.5 py-1 rounded border border-slate-700 focus:outline-none focus:border-amber-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveConditions();
            }}
          />
          {(conditions !== initialConditions) && (
            <button 
              onClick={handleSaveConditions}
              disabled={saving}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-[10px] font-bold text-slate-900 rounded"
            >
              {saving ? '...' : 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
