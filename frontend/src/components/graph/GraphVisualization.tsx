import { useMemo } from 'react';
import { type DependencyGraphData, type GraphCall } from '@/data/dependencyGraphData';
import GraphNode from './GraphNode';
import GraphEdge from './GraphEdge';

interface GraphVisualizationProps {
  data: DependencyGraphData;
  showDeadBranches: boolean;
  showCriticalPath: boolean;
  selectedCall: GraphCall | null;
  onSelectCall: (call: GraphCall | null) => void;
}

const HORIZONTAL_SPACING = 140;
const VERTICAL_SPACING = 100;
const PADDING = 60;

const GraphVisualization = ({
  data,
  showDeadBranches,
  showCriticalPath,
  selectedCall,
  onSelectCall,
}: GraphVisualizationProps) => {
  // Calculate node positions using BFS layering
  const { nodePositions, dimensions } = useMemo(() => {
    const levels: Map<string, number> = new Map();
    // const callMap = new Map((data.calls as any).map((c: any) => [c.id, c]));

    // BFS to assign levels
    const queue: string[] = [];
    data.calls.forEach((call: any) => {
      if (call.parents.length === 0) {
        levels.set(call.id, 0);
        queue.push(call.id);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentLevel = levels.get(current)!;

      data.edges
        .filter((e: any) => e.source === current)
        .forEach((edge: any) => {
          const existingLevel = levels.get(edge.target);
          if (existingLevel === undefined || existingLevel < currentLevel + 1) {
            levels.set(edge.target, currentLevel + 1);
            queue.push(edge.target);
          }
        });
    }

    // Group nodes by level
    const levelGroups: Map<number, string[]> = new Map();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(id);
    });

    // Calculate positions
    const positions: Map<string, { x: number; y: number }> = new Map();
    const maxLevel = Math.max(...levels.values());
    let maxWidth = 0;

    levelGroups.forEach((nodes, level) => {
      const levelWidth = nodes.length * HORIZONTAL_SPACING;
      maxWidth = Math.max(maxWidth, levelWidth);
      const startX = PADDING + (nodes.length - 1) * HORIZONTAL_SPACING / 2;

      nodes.forEach((id, index) => {
        positions.set(id, {
          x: startX + (index - (nodes.length - 1) / 2) * HORIZONTAL_SPACING + maxWidth / 2,
          y: PADDING + level * VERTICAL_SPACING,
        });
      });
    });

    return {
      nodePositions: positions,
      dimensions: {
        width: maxWidth + PADDING * 2,
        height: (maxLevel + 1) * VERTICAL_SPACING + PADDING * 2,
      },
    };
  }, [data]);

  const handleNodeClick = (call: GraphCall) => {
    onSelectCall(selectedCall?.id === call.id ? null : call);
  };

  return (
    <div className="relative w-full h-full overflow-auto bg-[#0a0a0b] rounded-lg border border-border/30">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 197, 94, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 197, 94, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)',
        }}
      />

      <svg
        width={Math.max(dimensions.width, 600)}
        height={Math.max(dimensions.height, 500)}
        className="block"
      >
        {/* Render edges first (behind nodes) */}
        {data.edges.map((edge: any) => {
          const sourcePos = nodePositions.get(edge.source);
          const targetPos = nodePositions.get(edge.target);
          const sourceCall = data.calls.find((c: any) => c.id === edge.source);
          const targetCall = data.calls.find((c: any) => c.id === edge.target);

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
        {(data.calls as any[]).map(call => {
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

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex gap-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-score-good" />
          <span className="text-xs text-muted-foreground">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-score-warning" />
          <span className="text-xs text-muted-foreground">Critical Path</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Dead Branch</span>
        </div>
      </div>
    </div>
  );
};

export default GraphVisualization;
