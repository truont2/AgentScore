import type { GraphCall, GraphEdge as GraphEdgeType } from '@/data/dependencyGraphData';
import { useMemo } from 'react';
import { NODE_HEIGHT } from './GraphNode';

interface GraphEdgeProps {
  edge: GraphEdgeType;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
  sourceCall: GraphCall;
  targetCall: GraphCall;
  showDeadBranches: boolean;
  showCriticalPath: boolean;
}

const GraphEdge = ({
  edge,
  sourcePos,
  targetPos,
  sourceCall,
  targetCall,
  showDeadBranches,
  showCriticalPath,
}: GraphEdgeProps) => {
  const isDeadBranch = (sourceCall as any).isDeadBranch || (targetCall as any).isDeadBranch;
  const isCriticalPath = (sourceCall as any).isCriticalPath && (targetCall as any).isCriticalPath;

  const getEdgeColor = () => {
    if (isDeadBranch && showDeadBranches) return '#ef4444';
    if (isCriticalPath && showCriticalPath) return '#f59e0b';
    return '#22c55e';
  };

  const color = getEdgeColor();
  const strokeWidth = Math.max(1, (edge as any).overlap * 3 || 2);
  const opacity = isDeadBranch && showDeadBranches ? 0.5 : 1;

  // Calculate bezier curve
  const startY = sourcePos.y + NODE_HEIGHT / 2;
  const endY = targetPos.y - NODE_HEIGHT / 2;
  const midY = (startY + endY) / 2;

  const pathD = useMemo(() => {
    return `M ${sourcePos.x} ${startY} C ${sourcePos.x} ${midY}, ${targetPos.x} ${midY}, ${targetPos.x} ${endY}`;
  }, [sourcePos.x, targetPos.x, startY, midY, endY]);

  return (
    <g opacity={opacity}>
      {/* Main edge path */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="transition-all duration-300"
      />



      {/* Animated flowing particles */}
      <circle r="3" fill={color}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={pathD}
        />
        <animate
          attributeName="opacity"
          values="0;1;1;0"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Second particle with offset */}
      <circle r="2" fill={color}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={pathD}
          begin="1s"
        />
        <animate
          attributeName="opacity"
          values="0;0.7;0.7;0"
          dur="2s"
          repeatCount="indefinite"
          begin="1s"
        />
      </circle>
    </g>
  );
};

export default GraphEdge;
