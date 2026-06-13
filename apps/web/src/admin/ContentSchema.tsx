import { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CardEntry, StatusEntry } from './api';

const STATUS_COLORS: Record<string, string> = {
  state: '#334155',   // slate-700
  law: '#1e3a8a',     // blue-900
  tech: '#164e63',    // cyan-900
  regime: '#7f1d1d',  // red-900
  wonder: '#78350f',  // amber-900
};

const COUNTRY_NAMES: Record<string, string> = {
  russia: 'Россия',
  usa: 'США',
  china: 'Китай',
  dprk: 'КНДР',
  uk: 'Великобритания',
  germany: 'Германия',
  india: 'Индия',
  japan: 'Япония',
  armenia: 'Армения',
  israel: 'Израиль',
};

export function ContentSchema({ cards, statuses }: { cards: CardEntry[]; statuses: StatusEntry[] }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    const visibleCards = countryFilter === null
      ? cards
      : countryFilter === '__common__'
      ? cards.filter(c => c.deckCountry === null)
      : cards.filter(c => c.deckCountry === countryFilter);

    const relatedStatusIds = new Set<string>();
    visibleCards.forEach(c => {
      const reqStatuses = (c.raw?.requires as any)?.statuses as string[];
      reqStatuses?.forEach(s => relatedStatusIds.add(s));
      c.choices.forEach(ch => {
        const addSt = (ch.effects as any)?.addStatuses as string[];
        addSt?.forEach(s => relatedStatusIds.add(s));
        const remSt = (ch.effects as any)?.removeStatuses as string[];
        remSt?.forEach(s => relatedStatusIds.add(s));
      });
    });

    const visibleStatuses = countryFilter === null
      ? statuses
      : statuses.filter(s => relatedStatusIds.has(s.id));

    // Auto layout initial positions
    let statusX = 100;
    let statusY = 100;

    visibleStatuses.forEach((s) => {
      newNodes.push({
        id: `status_${s.id}`,
        position: { x: statusX, y: statusY },
        data: { label: s.name },
        style: { 
          backgroundColor: STATUS_COLORS[s.type] || STATUS_COLORS.state, 
          color: '#f8fafc', 
          border: '1px solid #475569', 
          borderRadius: '8px',
          padding: '10px',
          fontWeight: 'bold',
          fontSize: '12px'
        },
      });
      statusX += 200;
      if (statusX > 1200) {
        statusX = 100;
        statusY += 150;
      }
    });

    let cardX = 100;
    let cardY = statusY + 200;

    visibleCards.forEach((c) => {
      const cardNodeId = `card_${c.cardId}`;
      newNodes.push({
        id: cardNodeId,
        position: { x: cardX, y: cardY },
        data: { label: c.cardId },
        style: {
          backgroundColor: '#1e293b',
          color: '#fbbf24',
          border: '1px solid #fbbf24',
          borderRadius: '4px',
          padding: '10px',
          fontSize: '12px'
        }
      });
      cardX += 180;
      if (cardX > 1200) {
        cardX = 100;
        cardY += 100;
      }

      // Edges for requires
      const reqStatuses = (c.raw?.requires as any)?.statuses as string[];
      if (reqStatuses) {
        reqStatuses.forEach((sid) => {
          if (!visibleStatuses.some(vs => vs.id === sid)) return;
          newEdges.push({
            id: `e_${sid}_${c.cardId}`,
            source: `status_${sid}`,
            target: cardNodeId,
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          });
        });
      }

      // Edges for choices adding statuses
      c.choices.forEach((choice, idx) => {
        const addSt = (choice.effects as any)?.addStatuses as string[];
        if (addSt) {
          addSt.forEach((sid) => {
            if (!visibleStatuses.some(vs => vs.id === sid)) return;
            newEdges.push({
              id: `e_${c.cardId}_${sid}_${idx}`,
              source: cardNodeId,
              target: `status_${sid}`,
              animated: true,
              style: { stroke: '#10b981', strokeWidth: 2 }
            });
          });
        }
        
        const remSt = (choice.effects as any)?.removeStatuses as string[];
        if (remSt) {
          remSt.forEach((sid) => {
            if (!visibleStatuses.some(vs => vs.id === sid)) return;
            newEdges.push({
              id: `e_rm_${c.cardId}_${sid}_${idx}`,
              source: cardNodeId,
              target: `status_${sid}`,
              animated: true,
              style: { stroke: '#ef4444', strokeWidth: 2 }
            });
          });
        }
      });
    });

    // Edges for status -> status (unlocks / requires)
    visibleStatuses.forEach((s) => {
        const reqSt = (s.requires as any)?.statuses as string[];
        if (reqSt) {
            reqSt.forEach(sid => {
                if (!visibleStatuses.some(vs => vs.id === sid)) return;
                newEdges.push({
                    id: `e_st_${sid}_${s.id}`,
                    source: `status_${sid}`,
                    target: `status_${s.id}`,
                    animated: true,
                    style: { stroke: '#3b82f6', strokeWidth: 2 }
                });
            })
        }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [cards, statuses, countryFilter]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const countries = Array.from(new Set(cards.filter((c) => c.deckCountry).map((c) => c.deckCountry as string))).sort();

  return (
    <div className="flex flex-col gap-3">
      {/* Country filter buttons */}
      <div className="flex flex-wrap gap-1 bg-slate-900 p-2 rounded-xl">
        <button
          onClick={() => setCountryFilter(null)}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            countryFilter === null ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Все (очень много нод)
        </button>
        <button
          onClick={() => setCountryFilter('__common__')}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
            countryFilter === '__common__' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          Общие
        </button>
        {countries.map((id) => (
          <button
            key={id}
            onClick={() => setCountryFilter(id)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
              countryFilter === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {COUNTRY_NAMES[id] ?? id}
          </button>
        ))}
      </div>

      <div className="text-xs text-slate-400">
        Схема связей карточек и статусов. Зеленые стрелки: карточка выдает статус. Красные: забирает. Серые: статус нужен для карточки. Синие: статус нужен для статуса.
      </div>
      <div style={{ height: '75vh' }} className="rounded-xl border border-slate-700 bg-slate-950 overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          colorMode="dark"
          nodesDraggable={true}
        >
          <Background color="#334155" gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
