import type { GraphCall } from '@/data/dependencyGraphData';

interface GraphNodeProps {
  call: GraphCall;
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (call: GraphCall) => void;
  showDeadBranches: boolean;
  showCriticalPath: boolean;
}

const NODE_WIDTH = 130;
const NODE_HEIGHT = 70;

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
        bg: '#ffffff',
        border: '#f87171',
        glow: 'rgba(239, 68, 68, 0.1)',
        accent: '#ef4444'
      };
    }
    if (call.isCriticalPath && showCriticalPath) {
      return {
        bg: '#ffffff',
        border: '#fbbf24',
        glow: 'rgba(245, 158, 11, 0.2)',
        accent: '#f59e0b'
      };
    }
    return {
      bg: '#ffffff',
      border: '#e2e8f0',
      glow: 'rgba(34, 197, 94, 0.05)',
      accent: '#22c55e'
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
      {/* Glossy/Glow Filter */}
      <defs>
        <filter id={`glow-${call.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={isSelected ? "4" : "1"} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Node Card background */}
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="8"
        fill={colors.bg}
        stroke={isSelected ? '#3b82f6' : colors.border}
        strokeWidth={isSelected ? 2 : 1}
        className="transition-all duration-300"
      />

      {/* Audit Badges (Horizontal row at top right) */}
      <g transform={`translate(${NODE_WIDTH - 45}, 8)`}>
        {call.isRedundant && (
          <rect width="12" height="12" rx="2" fill="#ef4444" opacity="0.9">
            <title>Redundant Call</title>
          </rect>
        )}
        {call.isRedundant && <text x="6" y="9" fontSize="7" fontWeight="bold" fill="white" textAnchor="middle">R</text>}

        {call.isOverkill && (
          <rect x="15" width="12" height="12" rx="2" fill="#f59e0b" opacity="0.9">
            <title>Model Overkill</title>
          </rect>
        )}
        {call.isOverkill && <text x="21" y="9" fontSize="7" fontWeight="bold" fill="white" textAnchor="middle">O</text>}

        {call.isBloated && (
          <rect x="30" width="12" height="12" rx="2" fill="#3b82f6" opacity="0.9">
            <title>Prompt Bloat</title>
          </rect>
        )}
        {call.isBloated && <text x="36" y="9" fontSize="7" fontWeight="bold" fill="white" textAnchor="middle">B</text>}
      </g>

      {/* Model Name - Clean Sans */}
      <text
        x="12"
        y="18"
        fontSize="7"
        fontWeight="600"
        fill="#64748b"
        fontFamily="Inter, sans-serif"
        className="uppercase tracking-wider"
      >
        {call.model ? (call.model.split('-').slice(1).join('-') || call.model).substring(0, 18) : 'AGENT'}
      </text>

      {/* Primary Context / Label */}
      <text
        x="12"
        y="34"
        fontSize="11"
        fontWeight="600"
        fill="#0f172a"
        fontFamily="Inter, sans-serif"
      >
        {call.label ? call.label.substring(0, 16) : 'Execution'}
      </text>

      {/* Metrics Row */}
      <text
        x="12"
        y="50"
        fontSize="9"
        fontWeight="500"
        fill="#475569"
        fontFamily="JetBrains Mono, monospace"
      >
        ${(call.cost || 0).toFixed(4)}
      </text>

      <text
        x="12"
        y="62"
        fontSize="8"
        fontWeight="500"
        fill="#94a3b8"
        fontFamily="JetBrains Mono, monospace"
      >
        {call.latency ? (call.latency / 1000).toFixed(1) : '0.0'}s • {call.tokens_in || 0}t
      </text>
    </g>
  );
};

export default GraphNode;
export { NODE_WIDTH, NODE_HEIGHT };
