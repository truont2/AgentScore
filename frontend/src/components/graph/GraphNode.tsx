import { type GraphCall } from '@/data/dependencyGraphData';
import { cn } from '@/lib/utils';

interface GraphNodeProps {
  call: GraphCall;
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (call: GraphCall) => void;
  showDeadBranches: boolean;
  showCriticalPath: boolean;
}

const NODE_WIDTH = 110;
const NODE_HEIGHT = 56;

const GraphNode = ({
  call,
  x,
  y,
  isSelected,
  onSelect,
  showDeadBranches,
  showCriticalPath,
}: GraphNodeProps) => {
  const getNodeColors = () => {
    if (call.isDeadBranch && showDeadBranches) {
      return {
        bg: '#2d1f1f',
        border: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.3)',
      };
    }
    if (call.isCriticalPath && showCriticalPath) {
      return {
        bg: '#2d2a1f',
        border: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.3)',
      };
    }
    return {
      bg: '#1a2e1a',
      border: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.3)',
    };
  };

  const colors = getNodeColors();

  return (
    <g
      transform={`translate(${x - NODE_WIDTH / 2}, ${y - NODE_HEIGHT / 2})`}
      onClick={() => onSelect(call)}
      className="cursor-pointer"
      style={{ transition: 'transform 0.2s ease' }}
    >
      {/* Glow effect */}
      <defs>
        <filter id={`glow-${call.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={isSelected ? "6" : "3"} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Node background */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="8"
        fill={colors.bg}
        stroke={colors.border}
        strokeWidth={isSelected ? 2 : 1}
        filter={`url(#glow-${call.id})`}
        className={cn(
          "transition-all duration-200",
          isSelected && "stroke-2"
        )}
        style={{
          boxShadow: isSelected ? `0 0 20px ${colors.glow}` : 'none',
        }}
      />

      {/* Agent badge */}
      <rect
        x="4"
        y="4"
        width={NODE_WIDTH - 8}
        height="14"
        rx="4"
        fill="rgba(255,255,255,0.08)"
      />
      <text
        x={NODE_WIDTH / 2}
        y="13"
        textAnchor="middle"
        fontSize="8"
        fill="#a1a1aa"
        fontFamily="Inter, sans-serif"
      >
        {call.agent}
      </text>

      {/* Cost - large centered */}
      <text
        x={NODE_WIDTH / 2}
        y="34"
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill="#e4e4e7"
        fontFamily="JetBrains Mono, monospace"
      >
        ${call.cost.toFixed(2)}
      </text>

      {/* Latency + tokens */}
      <text
        x={NODE_WIDTH / 2}
        y="48"
        textAnchor="middle"
        fontSize="8"
        fill="#71717a"
        fontFamily="JetBrains Mono, monospace"
      >
        {call.latency.toFixed(1)}s • {call.tokens}tok
      </text>

      {/* Status indicator dot */}
      {(call.isDeadBranch || call.isCriticalPath) && (
        <circle
          cx={NODE_WIDTH - 8}
          cy="8"
          r="4"
          fill={call.isDeadBranch ? '#ef4444' : '#f59e0b'}
        />
      )}
    </g>
  );
};

export default GraphNode;
export { NODE_WIDTH, NODE_HEIGHT };
