import { useState, useMemo } from 'react';
import CostWaterfall from './graph/CostWaterfall';
import GraphDetailsPanel from './graph/GraphDetailsPanel';
import GeminiAnalysis from './graph/GeminiAnalysis';
import type { DependencyGraphData, GraphCall } from '@/data/dependencyGraphData';

interface RawBackendNode {
    id: string;
    label?: string;
    model?: string;
    cost?: number;
    latency?: number;
    tokens_in?: number;
    type?: string;
    isRedundant?: boolean;
    isOverkill?: boolean;
    isBloated?: boolean;
    hasSecurityRisk?: boolean;
    vulnerabilityType?: string;
    redundantWithId?: string;
    recommendedModel?: string;
    reason?: string;
    // Payload data
    input?: string;
    prompt?: string;
    output?: string;
    response?: string;
    [key: string]: any;
}

interface RawBackendEdge {
    source: string;
    target: string;
    score?: number;
}

interface WorkflowGraphProps {
    nodes: RawBackendNode[];
    edges: RawBackendEdge[];
    onNodeClick: (node: GraphCall) => void;
}

export default function WorkflowGraph({ nodes: rawNodes, edges: rawEdges, onNodeClick }: WorkflowGraphProps) {
    const [selectedCall, setSelectedCall] = useState<GraphCall | null>(null);

    // Transform raw backend nodes/edges to DependencyGraphData
    const graphData: DependencyGraphData = useMemo(() => {
        const calls: GraphCall[] = rawNodes.map(n => ({
            id: n.id,
            label: n.label || 'Agent Execution',
            agent: n.model ? n.model.replace('gemini-', '') : 'Agent',
            model: n.model || 'Unknown',
            cost: n.cost || 0,
            latency: n.latency || 0,
            tokens: n.tokens_in || 0,
            isDeadBranch: n.type === 'dead' || n.isRedundant,
            isCriticalPath: n.type === 'critical',
            isRedundant: n.isRedundant,
            isOverkill: n.isOverkill,
            isBloated: n.isBloated,
            hasSecurityRisk: n.hasSecurityRisk,
            vulnerabilityType: n.vulnerabilityType,
            redundantWithId: n.redundantWithId,
            recommendedModel: n.recommendedModel,
            reason: n.reason,
            // Pass through potential payload data for Details Panel
            input: n.input || n.prompt,
            output: n.output || n.response,
            parents: rawEdges.filter(e => e.target === n.id).map(e => e.source)
        }));

        const edges = rawEdges.map(e => ({
            source: e.source,
            target: e.target,
            overlap: e.score || 1.0
        }));

        // Calculate aggregate metrics (simulated if not provided in detail)
        const deadBranchCost = calls.filter(c => c.isDeadBranch).reduce((acc, c) => acc + c.cost, 0);
        const criticalPathLatency = Math.max(...calls.filter(c => c.isCriticalPath).map(c => c.latency), 0);
        const totalCost = calls.reduce((acc, c) => acc + c.cost, 0);

        return {
            calls,
            edges,
            deadBranchCost,
            criticalPathLatency,
            totalCost,
            informationEfficiency: 0.85, // Placeholder if not in raw data
            parallelizationPotential: 0.42 // Placeholder
        };
    }, [rawNodes, rawEdges]);

    const handleSelectCall = (call: GraphCall | null) => {
        setSelectedCall(call);
        if (call) {
            onNodeClick(call);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-1">
            <div className="lg:col-span-3">
                <CostWaterfall
                    data={graphData}
                    selectedCall={selectedCall}
                    onSelectCall={handleSelectCall}
                />
            </div>
            <div className="lg:col-span-1">
                <div className="sticky top-4 flex flex-col gap-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 custom-scrollbar">
                    <GeminiAnalysis data={graphData} />
                    <GraphDetailsPanel selectedCall={selectedCall} />
                </div>
            </div>
        </div>
    );
}
