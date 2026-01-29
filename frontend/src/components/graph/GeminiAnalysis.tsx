import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { DependencyGraphData } from '@/data/dependencyGraphData';

interface GeminiAnalysisProps {
  data: DependencyGraphData;
}

const GeminiAnalysis = ({ data }: GeminiAnalysisProps) => {
  // Support both 'calls' (standard interface) and 'nodes' (backend raw format)
  const items = data?.calls || (data as any)?.nodes || [];

  // Extract metrics from both flat and nested structures, supporting both snake_case and camelCase
  const totalRedundantCost = items.filter((c: any) => c.isRedundant).reduce((acc: number, c: any) => acc + (c.cost || 0), 0);
  const totalOverkillCost = items.filter((c: any) => c.isOverkill).reduce((acc: number, c: any) => acc + (c.cost || 0), 0);
  const totalBloatedCost = items.filter((c: any) => c.isBloated).reduce((acc: number, c: any) => acc + (c.cost || 0), 0);

  const totalWasted = totalRedundantCost + totalOverkillCost + totalBloatedCost;

  return (
    <Card className="p-6 border-slate-200/60 shadow-sm bg-white h-full flex flex-col justify-between">
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-6 border-b border-slate-100 pb-4">
          <div className="p-1.5 bg-slate-100 rounded-md">
            <Sparkles className="w-4 h-4 text-slate-600" />
          </div>
          <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Optimization Analysis</h3>
        </div>

        <div className="space-y-6 text-[13px] leading-relaxed">
          <section className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-500 flex items-center justify-center text-[10px] font-bold text-white">R</div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">Redundancy</p>
                  <p className="text-[10px] text-slate-600 font-medium">{items.filter((c: any) => c.isRedundant).length} duplicate calls detected</p>
                </div>
              </div>
              <p className="text-[13px] font-mono font-bold text-slate-700">${totalRedundantCost.toFixed(3)}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white">O</div>
                <div>
                  <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight">Model Overkill</p>
                  <p className="text-[10px] text-amber-600 font-medium">{items.filter((c: any) => c.isOverkill).length} inefficient model fits</p>
                </div>
              </div>
              <p className="text-[13px] font-mono font-bold text-amber-700">${totalOverkillCost.toFixed(3)}</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100/50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">B</div>
                <div>
                  <p className="text-[11px] font-bold text-purple-900 uppercase tracking-tight">Prompt Bloat</p>
                  <p className="text-[10px] text-purple-600 font-medium">{items.filter((c: any) => c.isBloated).length} excessive token traces</p>
                </div>
              </div>
              <p className="text-[13px] font-mono font-bold text-purple-700">${totalBloatedCost.toFixed(3)}</p>
            </div>
          </section>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-end mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Wasted Compute</p>
              <p className="text-[18px] font-mono font-bold text-slate-900">${totalWasted.toFixed(3)}</p>
            </div>
            <p className="text-[11px] text-slate-500 italic">Financial impact per single workflow execution</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GeminiAnalysis;
