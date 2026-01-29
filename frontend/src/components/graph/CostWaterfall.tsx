import { useMemo, useRef } from 'react';
import type { DependencyGraphData, GraphCall } from '@/data/dependencyGraphData';
import { DollarSign, Database, ShieldAlert, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostWaterfallProps {
    data: DependencyGraphData;
    selectedCall: GraphCall | null;
    onSelectCall: (call: GraphCall | null) => void;
}

const ROW_HEIGHT = 72; // Fixed height for redundancy bridge calculations

const CostWaterfall = ({ data, selectedCall, onSelectCall }: CostWaterfallProps) => {
    const items = data.calls || (data as any).nodes || [];
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Calculate total cost and latency for scaling
    const metrics = useMemo(() => {
        const totalCost = items.reduce((sum: number, call: any) => sum + (call.cost || 0), 0);
        const totalLatency = items.reduce((sum: number, call: any) => sum + (call.latency || 0), 0);
        const maxCost = Math.max(...items.map((call: any) => call.cost || 0), 0.01);
        return { totalCost, totalLatency, maxCost };
    }, [items]);

    // Map items with relative positioning for Gantt view
    const waterfallItems = useMemo(() => {
        let currentLatency = 0;
        return items.map((call: any, index: number) => {
            const callWithPos = {
                ...call,
                startTime: currentLatency,
                index
            };
            currentLatency += (call.latency || 0);
            return callWithPos;
        });
    }, [items]);

    // Extract redundancy pairs for the "Bridges"
    const redundancyBridges = useMemo(() => {
        return waterfallItems
            .filter(item => item.isRedundant && item.redundantWithId)
            .map(item => {
                const targetNode = waterfallItems.find(t => t.id === item.redundantWithId);
                if (!targetNode) return null;
                return {
                    sourceIndex: item.index,
                    targetIndex: targetNode.index,
                    isDoubleWhammy: targetNode.isOverkill || item.isOverkill // Check both ends to be safe
                };
            })
            .filter(Boolean);
    }, [waterfallItems]);

    return (
        <div className="w-full bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[650px]">
            <style>{`
                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .animate-pulse-red {
                    animation: pulse-red 2s infinite;
                }
            `}</style>

            {/* Header */}
            <div className="grid grid-cols-12 gap-4 pl-10 pr-6 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest z-10">
                <div className="col-span-4">Agent Cost Trace</div>
                <div className="col-span-2 text-center">Execution Cost</div>
                <div className="col-span-2 text-center">Assessment</div>
                <div className="col-span-4">Gantt Latency Profile ({metrics.totalLatency}ms)</div>
            </div>

            {/* Scrollable Container */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scrollbar">

                {/* Redundancy Bridges Background Layer */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40 z-0">
                    {redundancyBridges.map((bridge: any, i: number) => {
                        const startY = (bridge.sourceIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
                        const endY = (bridge.targetIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);

                        // Dynamic styling for Double Whammy
                        const strokeColor = bridge.isDoubleWhammy ? "#f59e0b" : "#94a3b8"; // Amber-500 vs Slate-400
                        const strokeWidth = bridge.isDoubleWhammy ? "2" : "2";

                        return (
                            <path
                                key={`bridge-${i}`}
                                d={`M 36 ${startY} C 8 ${startY}, 8 ${endY}, 36 ${endY}`}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={strokeWidth}
                                strokeDasharray="4 2"
                            />
                        );
                    })}
                </svg>

                {/* Rows */}
                <div className="relative z-10">
                    {waterfallItems.map((call: any, idx: number) => (
                        <div
                            key={call.id}
                            onClick={() => onSelectCall(selectedCall?.id === call.id ? null : call)}
                            style={{ height: `${ROW_HEIGHT}px` }}
                            className={cn(
                                "grid grid-cols-12 gap-4 pl-10 pr-6 border-b border-slate-100 items-center cursor-pointer transition-all hover:bg-slate-50/80",
                                selectedCall?.id === call.id && "bg-blue-50/50 border-blue-100",
                                call.isRedundant && "opacity-60 bg-slate-50/30"
                            )}
                        >
                            {/* Agent Info */}
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="relative">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]",
                                        call.isRedundant ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    {call.hasSecurityRisk && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse-red" title={call.vulnerabilityType} />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                        "text-[13px] font-bold truncate",
                                        call.isRedundant ? "text-slate-500 italic" : "text-slate-900"
                                    )}>
                                        {call.agent || call.label}
                                    </span>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[10px] text-slate-400 font-mono truncate">{call.model}</span>
                                        {call.isOverkill && call.recommendedModel && (
                                            <>
                                                <ArrowRight className="w-2.5 h-2.5 text-amber-500" />
                                                <span className="text-[10px] text-amber-600 font-bold font-mono">{call.recommendedModel}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Metrics */}
                            <div className="col-span-2 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                    <DollarSign className={cn("w-3 h-3", (call.cost / metrics.maxCost) > 0.8 ? "text-rose-500" : "text-slate-400")} />
                                    <span className={cn(
                                        "text-[11px] font-mono font-bold",
                                        (call.cost / metrics.maxCost) > 0.8 ? "text-rose-600" : "text-slate-700"
                                    )}>
                                        ${(call.cost || 0).toFixed(4)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                                    <Database className="w-3 h-3" />
                                    <span className="font-mono">{call.tokens_in || 0} in</span>
                                </div>
                            </div>

                            {/* Audit Sins */}
                            <div className="col-span-2 flex justify-center gap-1.5">
                                {call.hasSecurityRisk ? (
                                    <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                                ) : call.isRedundant ? (
                                    <div className="w-5 h-5 rounded bg-rose-500 flex items-center justify-center text-[10px] font-black text-white">R</div>
                                ) : call.isOverkill ? (
                                    <div className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-[10px] font-black text-white">O</div>
                                ) : call.isBloated ? (
                                    <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center text-[10px] font-black text-white">B</div>
                                ) : (
                                    <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                    </div>
                                )}
                            </div>

                            {/* Gantt Bar (Width = Latency, Darker = More Expensive) */}
                            <div className="col-span-4 relative h-6 bg-slate-50 rounded-md overflow-hidden border border-slate-100 shadow-inner">
                                <div
                                    className={cn(
                                        "absolute h-full transition-all duration-700 ease-out flex items-center px-2",
                                        call.isRedundant ? "bg-slate-300 border-l-2 border-slate-400" :
                                            call.hasSecurityRisk ? "bg-red-200 border-l-2 border-red-500" :
                                                (call.cost / metrics.maxCost) > 0.7 ? "bg-violet-500/80 border-l-2 border-violet-600" :
                                                    (call.cost / metrics.maxCost) > 0.4 ? "bg-blue-400/80 border-l-2 border-blue-500" :
                                                        "bg-emerald-400/80 border-l-2 border-emerald-500"
                                    )}
                                    style={{
                                        left: `${(call.startTime / metrics.totalLatency) * 100}%`,
                                        width: `${((call.latency || 0) / metrics.totalLatency) * 100}%`,
                                        minWidth: '12px'
                                    }}
                                >
                                    <span className="text-[8px] font-black text-white drop-shadow-sm truncate whitespace-nowrap">
                                        {call.latency}ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center z-10">
                <div className="flex gap-5">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-red" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Security Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Redundant Bridge</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Model Overkill</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-slate-900 font-black font-mono text-sm">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Trace Totals:</span>
                        <span className="text-rose-500">${metrics.totalCost.toFixed(4)}</span>
                        <span className="text-slate-300 px-1">|</span>
                        <span className="text-emerald-500">{metrics.totalLatency}ms</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostWaterfall;
