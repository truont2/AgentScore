import { useMemo } from 'react';
import type { DependencyGraphData, GraphCall } from '@/data/dependencyGraphData';
import GraphNode from './GraphNode';
import GraphEdge from './GraphEdge';

interface GraphVisualizationProps {
  data: DependencyGraphData;
  showDeadBranches: boolean;
  showCriticalPath: boolean;
  selectedCall: GraphCall | null;
  onSelectCall: (call: GraphCall | null) => void;
}

const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 150;
const PADDING = 100;

const GraphVisualization = ({
  data,
  showDeadBranches,
  showCriticalPath,
  selectedCall,
  onSelectCall,
}: GraphVisualizationProps) => {
  // Calculate node positions strictly sequential (chronological)
  const { nodePositions, dimensions } = useMemo(() => {
    if (!data.calls.length) return { nodePositions: new Map(), dimensions: { width: 0, height: 0 } };

    const positions: Map<string, { x: number; y: number }> = new Map();
    const columnX = PADDING + (HORIZONTAL_SPACING / 2);

    data.calls.forEach((call, index) => {
      positions.set(call.id, {
        x: columnX,
        y: PADDING + index * VERTICAL_SPACING,
      });
    });

    return {
      nodePositions: positions,
      dimensions: {
        width: columnX + PADDING,
        height: data.calls.length * VERTICAL_SPACING + PADDING * 2,
      },
    };
  }, [data.calls]);

  const handleNodeClick = (call: GraphCall) => {
    onSelectCall(selectedCall?.id === call.id ? null : call);
  };

  return (
    <div className="relative w-full h-[600px] overflow-auto bg-[#ffffff] rounded-xl border border-slate-200/60 shadow-inner">
      {/* Professional subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <svg
        width={Math.max(dimensions.width, 800)}
        height={Math.max(dimensions.height, 500)}
        className="block"
      >
        {/* Render edges first (behind nodes) */}
        {data.edges.map(edge => {
          const sourcePos = nodePositions.get(edge.source);
          const targetPos = nodePositions.get(edge.target);
          const sourceCall = data.calls.find(c => c.id === edge.source);
          const targetCall = data.calls.find(c => c.id === edge.target);

          if (!sourcePos || !targetPos || !sourceCall || !targetCall) return null;

          return (
            <GraphEdge
              key={`${edge.source}-${edge.target}`}
              edge={edge}
              sourcePos={sourcePos}
              targetPos={targetPos}
              sourceCall={sourceCall}
              targetCall={targetCall}
              showDeadBranches={showDeadBranches}
              showCriticalPath={showCriticalPath}
            />
          );
        })}

        {/* Render nodes */}
        {data.calls.map(call => {
          const pos = nodePositions.get(call.id);
          if (!pos) return null;

          return (
            <GraphNode
              key={call.id}
              call={call}
              x={pos.x}
              y={pos.y}
              isSelected={selectedCall?.id === call.id}
              onSelect={handleNodeClick}
              showDeadBranches={showDeadBranches}
              showCriticalPath={showCriticalPath}
            />
          );
        })}
      </svg>

      {/* Professional Legend */}
      <div className="absolute top-4 right-4 flex items-center gap-6 bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-slate-200/60 shadow-sm transition-opacity hover:opacity-100 opacity-80">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-slate-600">Optimized Call</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[11px] font-semibold text-slate-600">Performance Bottleneck</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[11px] font-semibold text-slate-600">Audit Finding</span>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
