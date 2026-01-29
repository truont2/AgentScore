import { type GraphCall } from '@/data/dependencyGraphData';
import { Card } from '@/components/ui/card';
import { ShieldAlert, Zap, Clock, DollarSign, Database, AlertTriangle } from 'lucide-react';

interface GraphDetailsPanelProps {
  selectedCall: GraphCall | null;
}

const GraphDetailsPanel = ({ selectedCall }: GraphDetailsPanelProps) => {
  if (!selectedCall) {
    return (
      <Card className="p-8 bg-slate-50/30 border-dashed border-2 border-slate-200 shadow-none h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-slate-300 border-dashed rounded-full" />
        </div>
        <h4 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2">No Node Selected</h4>
        <p className="text-[12px] text-slate-400 max-w-[180px] leading-relaxed font-medium">
          Select any agent node in the audit trace to inspect its
          <span className="text-slate-600 font-black italic"> security & financial footprint</span>.
        </p>
      </Card>
    );
  }

  const hasIssues = selectedCall.isRedundant || selectedCall.isOverkill || selectedCall.isBloated || selectedCall.hasSecurityRisk;

  return (
    <Card className="p-6 bg-white border-slate-200/60 shadow-lg h-full overflow-y-auto flex flex-col">
      <div className="space-y-6 flex-1">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2">Audit Investigation</h3>

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

          <p className="text-xl font-black text-slate-900 leading-tight">{selectedCall.agent || 'Agent'}</p>
          <p className="text-sm text-slate-500 mt-1 font-medium">{selectedCall.label || 'Agent Call'}</p>
        </div>

        {/* Security Alert Section */}
        {selectedCall.hasSecurityRisk && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex gap-3 items-start animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-[12px] font-black text-red-700 uppercase leading-none mb-1">{selectedCall.vulnerabilityType || 'Vulnerability Detected'}</p>
              <p className="text-[11px] text-red-600/80 leading-relaxed font-semibold italic">
                This call may have leaked sensitive strings or failed PII scrubbing protocols.
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Spend</span>
            </div>
            <p className="text-sm font-black text-slate-900 font-mono">${selectedCall.cost.toFixed(4)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Latency</span>
            </div>
            <p className="text-sm font-black text-slate-900 font-mono">{selectedCall.latency}ms</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Database className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Tokens</span>
            </div>
            <p className="text-sm font-black text-slate-900 font-mono">{selectedCall.tokens.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Zap className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Model</span>
            </div>
            <p className="text-[11px] font-black text-slate-900 truncate uppercase">{selectedCall.model.split('-').pop()}</p>
          </div>
        </div>

        {/* Audit Findings */}
        {hasIssues && (
          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Optimization Path</h4>

            {selectedCall.isRedundant && (
              <div className="flex gap-3 items-start p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Duplicate of <span className="font-bold text-rose-600">Call #{selectedCall.redundantWithId}</span>. Recommend caching or sharing state.
                </p>
              </div>
            )}

            {selectedCall.isOverkill && (
              <div className="flex gap-3 items-start p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Right-size to <span className="font-bold text-amber-600">{selectedCall.recommendedModel}</span> for 85% cost recovery.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-slate-100">
        <button className="w-full py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-colors">
          Apply Recommendation
        </button>
      </div>
    </Card>
  );
};

export default GraphDetailsPanel;
