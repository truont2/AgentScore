import { useMemo } from 'react';
import ReactFlow, {
    type Node,
    type Edge,
    Background,
    Controls,
    Handle,
    Position,
    MiniMap,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Activity, Zap, Trash2, Clock, DollarSign, Box } from 'lucide-react';

interface GraphNodeData {
    id: string;
    label: string;
    model: string;
    cost: number;
    latency: number;
    type: 'normal' | 'critical' | 'dead';
}

const CustomNode = ({ data }: { data: GraphNodeData }) => {
    const styles = {
        normal: {
            border: 'border-emerald-500/50',
            bg: 'bg-emerald-50/50 backdrop-blur-md',
            text: 'text-emerald-900',
            icon: <Activity className="w-4 h-4 text-emerald-600" />,
            glow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]'
        },
        critical: {
            border: 'border-amber-500/50',
            bg: 'bg-amber-50/50 backdrop-blur-md',
            text: 'text-amber-900',
            icon: <Zap className="w-4 h-4 text-amber-600" />,
            glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]'
        },
        dead: {
            border: 'border-rose-500/50',
            bg: 'bg-rose-50/50 backdrop-blur-md',
            text: 'text-rose-900',
            icon: <Trash2 className="w-4 h-4 text-rose-600" />,
            glow: 'shadow-[0_0_15px_rgba(244,63,94,0.1)]'
        }
    }[data.type || 'normal'];

    return (
        <div className={`p-4 rounded-xl border-2 ${styles.border} ${styles.bg} ${styles.glow} min-w-[220px] transition-all hover:scale-105 group`}>
            <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-400 border-none" />

            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="p-1.5 rounded-lg bg-white/50 shadow-sm">
                        {styles.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 shadow-sm ${styles.text}`}>
                        {data.type}
                    </span>
                </div>

                <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{data.model}</h3>
                    <p className="text-[10px] text-slate-500 font-medium truncate opacity-70 group-hover:opacity-100">ID: {data.id.split('-')[0]}...</p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/40 border border-white/50">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700">{data.latency}ms</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/40 border border-white/50">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-700">${data.cost.toFixed(4)}</span>
                    </div>
                </div>

                {data.type === 'critical' && (
                    <div className="w-full bg-amber-200/50 h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-amber-500 h-full w-[80%] animate-pulse" />
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-400 border-none" />
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

interface WorkflowGraphProps {
    nodes: any[];
    edges: any[];
    onNodeClick: (node: any) => void;
}

export default function WorkflowGraph({ nodes: rawNodes, edges: rawEdges, onNodeClick }: WorkflowGraphProps) {
    // Simple layout algorithm: arrange by layers based on incoming edges
    const layoutedNodes = useMemo(() => {
        if (!rawNodes.length) return [];

        const nodeLevels: Record<string, number> = {};
        const adj: Record<string, string[]> = {};
        rawNodes.forEach(n => {
            nodeLevels[n.id] = 0;
            adj[n.id] = [];
        });

        rawEdges.forEach(e => {
            adj[e.source].push(e.target);
        });

        // Simple BFS to find levels
        const q = rawNodes.filter(n => !rawEdges.some(e => e.target === n.id)).map(n => n.id);
        let head = 0;
        while (head < q.length) {
            const u = q[head++];
            adj[u].forEach(v => {
                nodeLevels[v] = Math.max(nodeLevels[v], nodeLevels[u] + 1);
                q.push(v);
            });
        }

        const levels: Record<number, string[]> = {};
        rawNodes.forEach(n => {
            const level = nodeLevels[n.id];
            if (!levels[level]) levels[level] = [];
            levels[level].push(n.id);
        });

        const HORIZONTAL_SPACING = 250;
        const VERTICAL_SPACING = 150;

        return rawNodes.map(n => {
            const level = nodeLevels[n.id];
            const itemsInLevel = levels[level];
            const indexInLevel = itemsInLevel.indexOf(n.id);

            // Center the nodes in each level
            const xOffset = -(itemsInLevel.length - 1) * (HORIZONTAL_SPACING / 2);

            return {
                id: n.id,
                type: 'custom',
                data: n,
                position: {
                    x: xOffset + indexInLevel * HORIZONTAL_SPACING,
                    y: level * VERTICAL_SPACING
                },
            } as Node;
        });
    }, [rawNodes, rawEdges]);

    const convertedEdges = useMemo(() => {
        return rawEdges.map(e => {
            const isHighFlow = e.score > 0.5;
            // Check if this edge is between critical nodes
            const sourceNode = rawNodes.find(n => n.id === e.source);
            const targetNode = rawNodes.find(n => n.id === e.target);
            const isCriticalEdge = sourceNode?.type === 'critical' && targetNode?.type === 'critical';

            return {
                ...e,
                animated: isHighFlow || isCriticalEdge,
                style: {
                    strokeWidth: isHighFlow ? 3 : 2,
                    stroke: isCriticalEdge ? '#f59e0b' : (isHighFlow ? '#6366f1' : '#cbd5e1'),
                    strokeOpacity: isHighFlow ? 1 : 0.6
                }
            };
        }) as Edge[];
    }, [rawEdges, rawNodes]);

    return (
        <div style={{ width: '100%', height: '600px' }} className="border rounded-2xl bg-white shadow-inner overflow-hidden relative group">
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700">Execution DAG</span>
                </div>
            </div>

            <ReactFlow
                nodes={layoutedNodes}
                edges={convertedEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => onNodeClick(node.data)}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={1.5}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#e2e8f0"
                    className="bg-slate-50/50"
                />
                <Controls className="!bg-white !border-slate-200 !shadow-lg rounded-lg overflow-hidden" />
                <MiniMap
                    nodeStrokeColor={(n: any) => {
                        if (n.data.type === 'critical') return '#f59e0b';
                        if (n.data.type === 'dead') return '#f43f5e';
                        return '#10b981';
                    }}
                    nodeColor={(n: any) => {
                        if (n.data.type === 'critical') return '#fef3c7';
                        if (n.data.type === 'dead') return '#ffe4e6';
                        return '#ecfdf5';
                    }}
                    className="!bg-white/80 !backdrop-blur-md !border-slate-200 !shadow-lg !rounded-xl"
                />
            </ReactFlow>
        </div>
    );
}
