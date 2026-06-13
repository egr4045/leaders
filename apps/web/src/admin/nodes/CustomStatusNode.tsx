import { Handle, Position } from '@xyflow/react';
import { StatusEntry } from '../api';

const STATUS_COLORS: Record<string, string> = {
  state: '#334155',   // slate-700
  law: '#1e3a8a',     // blue-900
  tech: '#164e63',    // cyan-900
  regime: '#7f1d1d',  // red-900
  wonder: '#78350f',  // amber-900
};

interface CustomStatusNodeData {
  status: StatusEntry;
}

export function CustomStatusNode({ data }: { data: CustomStatusNodeData }) {
  const { status } = data;
  
  const bgColor = STATUS_COLORS[status.type] || STATUS_COLORS.state;

  // Handles for when this status is GIVEN by a card (inputs on top left maybe? Actually left/right is fine)
  // Cards target status nodes. So status needs a generic input handle on the left for "Adds this status".
  // And a generic output handle on the right for "Requires this status".
  
  // Actually, React Flow edges can connect to the node generically without specifying `id` if there's only one Handle of that type/position, 
  // but since we specified `id` in edges for specific things (or didn't? wait). 
  // In `ContentSchema.tsx`, I wrote edge `target: cardNodeId`, `source: statusNodeId`. So the Status needs a source handle.
  // Wait, `source: status_${sid}` (for requirements) means Status needs a `source` on the right.
  // And `target: status_${sid}` (for adding statuses) means Status needs a `target` on the left.

  return (
    <div className="flex flex-col min-w-[200px] rounded-lg shadow-xl bg-slate-800 border border-slate-900 font-sans overflow-hidden">
      {/* Universal Handles for the node itself if we don't bind strictly to id. Actually we MUST provide id if edges specify it, OR we just use a generic handle without id if edges don't specify sourceHandle/targetHandle. My edges didn't specify sourceHandle/targetHandle, so React Flow connects to the first Handle it finds! To be safe, we can just give generic handles. */}
      
      <Handle type="target" position={Position.Left} className="w-2 h-2 bg-slate-400 !left-[-5px]" />
      <Handle type="source" position={Position.Right} className="w-2 h-2 bg-slate-400 !right-[-5px]" />

      {/* Header */}
      <div 
        className="px-3 py-2 border-b border-slate-900 flex flex-col"
        style={{ backgroundColor: bgColor }}
      >
        <span className="text-slate-300 font-bold text-[10px] uppercase">{status.type}</span>
        <span className="text-white font-bold text-sm">{status.name}</span>
      </div>

      {/* Body */}
      <div className="p-2 flex flex-col gap-1 bg-slate-800/80">
        {status.description && (
          <div className="text-[10px] text-slate-400 italic mb-1 leading-tight">
            "{status.description}"
          </div>
        )}

        {/* Display simple effects text if any */}
        {status.effects && Object.keys(status.effects).length > 0 && (
          <div className="text-[10px] text-sky-200 mt-1">
            Эффекты: {JSON.stringify(status.effects).substring(0, 40)}...
          </div>
        )}
      </div>
    </div>
  );
}
