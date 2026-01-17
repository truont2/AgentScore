import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { type DependencyGraphData } from '@/data/dependencyGraphData';

interface GeminiAnalysisProps {
  data: DependencyGraphData;
}

const GeminiAnalysis = ({ data }: GeminiAnalysisProps) => {
  const deadBranchCount = data.calls.filter(c => c.isDeadBranch).length;
  const criticalPathCalls = data.calls.filter(c => c.isCriticalPath);
  const savingsPercent = Math.round((data.deadBranchCost / data.totalCost) * 100);

  return (
    <Card className="p-4 border-border/50 relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(34, 197, 94, 0.08) 100%)',
        }}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Gemini Analysis</h3>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">{deadBranchCount} dead branches</strong> detected,
            wasting <strong className="text-destructive">${data.deadBranchCost.toFixed(2)}</strong> ({savingsPercent}% of total cost).
            The Entity Extraction → Translation chain and the Fact Checker → QA chain
            produce output that is never consumed downstream.
          </p>

          <p>
            The <strong className="text-score-warning">critical path</strong> runs through{' '}
            {criticalPathCalls.map(c => c.agent).join(' → ')},
            taking <strong className="text-score-warning">{data.criticalPathLatency.toFixed(1)}s</strong>.
            The Synthesizer merge step ({criticalPathCalls.find(c => c.agent === 'Synthesizer')?.latency.toFixed(1)}s)
            is the primary bottleneck.
          </p>

          <p className="text-primary font-medium">
            💡 Recommendation: Remove or rewire the dead branches to save ${data.deadBranchCost.toFixed(2)}/run.
            Consider parallelizing the Summarizer calls to reduce critical path latency by ~{Math.round(data.parallelizationPotential * 100)}%.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default GeminiAnalysis;
