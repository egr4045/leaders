import { useState, useEffect, useCallback, useMemo } from 'react';
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
import dagre from 'dagre';
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

import { CustomCardNode } from './nodes/CustomCardNode';
import { CustomStatusNode } from './nodes/CustomStatusNode';

export function ContentSchema({ cards, statuses, onRefresh }: { cards: CardEntry[]; statuses: StatusEntry[]; onRefresh: () => void }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);

  const nodeTypes = useMemo(() => ({ customCard: CustomCardNode, customStatus: CustomStatusNode }), []);

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
      c.choices.forEach((ch, idx) => {
        const rawChoice = (c.raw.choices as any[])?.[idx];
        const addSt = rawChoice?.addStatuses || (ch.effects as any)?.addStatuses as string[];
        addSt?.forEach((s: string) => relatedStatusIds.add(s));
        const remSt = rawChoice?.removeStatuses || (ch.effects as any)?.removeStatuses as string[];
        remSt?.forEach((s: string) => relatedStatusIds.add(s));
      });
    });

    const visibleStatuses = countryFilter === null
      ? statuses
      : statuses.filter(s => relatedStatusIds.has(s.id));

    // We will use dagre for layout after defining nodes and edges
    visibleStatuses.forEach((s) => {
      newNodes.push({
        id: `status_${s.id}`,
        type: 'customStatus',
        position: { x: 0, y: 0 },
        data: { status: s },
      });
    });

    visibleCards.forEach((c) => {
      const cardNodeId = `card_${c.cardId}`;
      newNodes.push({
        id: cardNodeId,
        type: 'customCard',
        position: { x: 0, y: 0 },
        data: { card: c, onRefresh },
      });

      // Edges for requires
      const reqStatuses = (c.raw?.requires as any)?.statuses as string[];
      if (reqStatuses) {
        reqStatuses.forEach((sid) => {
          if (!visibleStatuses.some(vs => vs.id === sid)) return;
          newEdges.push({
            id: `e_${sid}_${c.cardId}`,
            source: `status_${sid}`,
            target: cardNodeId,
            targetHandle: `req_${sid}`,
            animated: true,
            style: { stroke: '#94a3b8', strokeWidth: 2 }
          });
        });
      }

      // Edges for choices adding statuses
      c.choices.forEach((choice, idx) => {
        const rawChoice = (c.raw.choices as any[])?.[idx];
        const addSt = rawChoice?.addStatuses || (choice.effects as any)?.addStatuses as string[];
        if (addSt) {
          addSt.forEach((sid: string) => {
            if (!visibleStatuses.some(vs => vs.id === sid)) return;
            newEdges.push({
              id: `e_${c.cardId}_${sid}_${idx}`,
              source: cardNodeId,
              sourceHandle: `add_${idx}_${sid}`,
              target: `status_${sid}`,
              animated: true,
              style: { stroke: '#10b981', strokeWidth: 2 }
            });
          });
        }
        
        const remSt = rawChoice?.removeStatuses || (choice.effects as any)?.removeStatuses as string[];
        if (remSt) {
          remSt.forEach((sid: string) => {
            if (!visibleStatuses.some(vs => vs.id === sid)) return;
            newEdges.push({
              id: `e_rm_${c.cardId}_${sid}_${idx}`,
              source: cardNodeId,
              sourceHandle: `rem_${idx}_${sid}`,
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

    // Apply Dagre layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', align: 'UL', nodesep: 50, ranksep: 200 });

    newNodes.forEach((node) => {
      // Approximate sizes: customCard is ~250px wide, customStatus is ~150px wide
      const width = node.type === 'customCard' ? 250 : 150;
      const height = node.type === 'customCard' ? 200 : 80;
      dagreGraph.setNode(node.id, { width, height });
    });

    newEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = newNodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWithPosition.width / 2,
          y: nodeWithPosition.y - nodeWithPosition.height / 2,
        },
      };
    });

    setNodes(layoutedNodes);
    setEdges(newEdges);
  }, [cards, statuses, countryFilter, onRefresh]);

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
          key={countryFilter || 'all'}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
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
