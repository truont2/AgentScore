import { type GraphCall } from '@/data/dependencyGraphData';
import { Card } from '@/components/ui/card';
import { ShieldAlert, Zap, Clock, DollarSign, Database, AlertTriangle } from 'lucide-react';

interface GraphDetailsPanelProps {
  selectedCall: GraphCall | null;
}

const GraphDetailsPanel = ({ selectedCall }: GraphDetailsPanelProps) => {
  if (!selectedCall) {
    return (
      <Card className="p-8 bg-slate-900/50 border-dashed border-2 border-slate-800 shadow-none h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-slate-700 border-dashed rounded-full" />
        </div>
        <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2">No Trace Step Selected</h4>
        <p className="text-[12px] text-slate-500 max-w-[180px] leading-relaxed font-medium">
          Select any execution step in the audit trace to inspect its
          <span className="text-slate-300 font-black italic"> security & financial footprint</span>.
        </p>
      </Card>
    );
  }

  const hasIssues = selectedCall.isRedundant || selectedCall.isOverkill || selectedCall.isBloated || selectedCall.hasSecurityRisk;

  return (
    <Card className="p-6 bg-slate-950 border-slate-800 shadow-lg flex flex-col h-full max-h-[800px]">
      <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div>
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-800 pb-2">Trace Step Details</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedCall.hasSecurityRisk && (
              <div className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase rounded animate-pulse">Security Alert</div>
            )}
            {selectedCall.isRedundant && (
              <div className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded">Redundant</div>
            )}
            {selectedCall.isOverkill && (
              <div className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded">Overkill</div>
            )}
            {selectedCall.isBloated && (
              <div className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded">Bloated</div>
            )}
          </div>

          <p className="text-xl font-black text-slate-100 leading-tight break-words">{selectedCall.agent || 'Agent'}</p>
          <p className="text-sm text-slate-400 mt-1 font-medium">{selectedCall.label || 'Agent Call'}</p>
        </div>

        {/* Security Alert Section */}
        {selectedCall.hasSecurityRisk && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex gap-3 items-start animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-black text-red-400 uppercase leading-none mb-1">{selectedCall.vulnerabilityType || 'Vulnerability Detected'}</p>
              <p className="text-[11px] text-red-300/80 leading-relaxed font-semibold italic">
                {selectedCall.reason ? `"${selectedCall.reason}"` : "This call may have leaked sensitive strings or failed PII scrubbing protocols."}
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Spend</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">${(selectedCall.cost || 0).toFixed(4)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Latency</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">{selectedCall.latency}ms</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Database className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Tokens</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">{selectedCall.tokens.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Zap className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Model</span>
            </div>
            <p className="text-[11px] font-black text-slate-200 truncate uppercase">{selectedCall.model.split('-').pop()}</p>
          </div>
        </div>

        {/* Audit Findings */}
        {hasIssues && (
          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Optimization Path</h4>

            {selectedCall.isRedundant && (
              <div className="flex gap-3 items-start p-3 bg-rose-950/20 rounded-xl border border-rose-900/30">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Duplicate of <span className="font-bold text-rose-400">Call #{selectedCall.redundantWithId}</span>. Recommend caching or sharing state.
                </p>
              </div>
            )}

            {selectedCall.isOverkill && (
              <div className="flex gap-3 items-start p-3 bg-amber-950/20 rounded-xl border border-amber-900/30">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Right-size to <span className="font-bold text-amber-500">{selectedCall.recommendedModel}</span> for 85% cost recovery.
                  </p>
                </div>
              </div>
            )}

            {/* General Reason Display (Covers Bloat, Redundancy details, Overkill reasoning) */}
            {selectedCall.reason && (
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Analysis Logic</span>
                <p className="text-[11px] text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-2">
                  "{selectedCall.reason}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payload / Context Data */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Payload Data</h4>

          {/* Input/Prompt */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Input / Prompt</span>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                {selectedCall.input || selectedCall.prompt || <span className="italic text-slate-600">No input captured</span>}
              </p>
            </div>
          </div>

          {/* Output/Response */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Output / Response</span>
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
              <p className="text-[10px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                {selectedCall.output || selectedCall.response || <span className="italic text-slate-600">No response captured</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GraphDetailsPanel;
