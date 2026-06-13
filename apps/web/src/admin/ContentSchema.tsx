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

export function ContentSchema({ cards, statuses }: { cards: CardEntry[]; statuses: StatusEntry[] }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    
    // Auto layout initial positions
    let statusX = 100;
    let statusY = 100;

    statuses.forEach((s) => {
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

    cards.forEach((c) => {
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
    statuses.forEach((s) => {
        const reqSt = (s.requires as any)?.statuses as string[];
        if (reqSt) {
            reqSt.forEach(sid => {
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
  }, [cards, statuses]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div className="flex flex-col gap-3">
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
