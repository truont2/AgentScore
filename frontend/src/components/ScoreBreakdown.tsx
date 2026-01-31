import { cn } from '@/lib/utils';
import { RefreshCw, Zap, FileText } from 'lucide-react';

interface ScoreBreakdownProps {
  redundancyScore: number;
  modelFitScore: number;
  contextEfficiencyScore: number;
  redundancySavings?: number;
  modelShapeSavings?: number;
  contextSavings?: number;
}

interface SinCardProps {
  icon: React.ReactNode;
  label: string;
  issueCount: number;
  waste: string;
  status: 'good' | 'warning' | 'poor';
}

const getStatusColor = (score: number) => {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
};

function SinCard({ icon, label, issueCount, waste, status }: SinCardProps) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-md p-4 hover-lift cursor-pointer group',
      status === 'poor' && 'glow-poor'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'p-2 rounded-md transition-colors',
          status === 'good' && 'bg-score-good/10 text-score-good',
          status === 'warning' && 'bg-score-warning/10 text-score-warning',
          status === 'poor' && 'bg-score-poor/10 text-score-poor'
        )}>
          {icon}
        </div>
        <span className={cn(
          'status-dot',
          status === 'good' && 'status-dot-good',
          status === 'warning' && 'status-dot-warning',
          status === 'poor' && 'status-dot-poor'
        )} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-2xl font-semibold font-mono text-foreground tracking-tight">
          {issueCount} <span className="text-sm text-muted-foreground font-normal">issues</span>
        </p>
        <p className={cn(
          'text-sm font-mono',
          status === 'good' && 'text-score-good',
          status === 'warning' && 'text-score-warning',
          status === 'poor' && 'text-score-poor'
        )}>
          {waste} waste
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          View Details →
        </span>
      </div>
    </div>
  );
}

export function ScoreBreakdown({
  redundancyScore,
  modelFitScore,
  contextEfficiencyScore,
  redundancySavings,
  modelShapeSavings,
  contextSavings,
  issueCounts,
  onViewDetails
}: ScoreBreakdownProps & {
  issueCounts?: { redundancy: number; model: number; context: number };
  onViewDetails?: (section: string) => void;
}) {
  // Use real counts if provided, otherwise fallback to heuristic (legacy support)
  const redundancyIssues = issueCounts ? issueCounts.redundancy : Math.max(0, Math.round((100 - redundancyScore) / 8));
  const modelIssues = issueCounts ? issueCounts.model : Math.max(0, Math.round((100 - modelFitScore) / 10));
  const contextIssues = issueCounts ? issueCounts.context : Math.max(0, Math.round((100 - contextEfficiencyScore) / 12));

  const formatWaste = (val?: number, score?: number, factor?: number) => {
    if (val !== undefined) return `$${val.toFixed(2)}`;
    if (score !== undefined && factor !== undefined) return `$${((100 - score) * factor).toFixed(2)}`;
    return '$0.00';
  };

  const redundancyWaste = formatWaste(redundancySavings, redundancyScore, 0.02);
  const modelWaste = formatWaste(modelShapeSavings, modelFitScore, 0.015);
  const contextWaste = formatWaste(contextSavings, contextEfficiencyScore, 0.01);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
        The Three Sins
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div onClick={() => onViewDetails?.('redundancy')}>
          <SinCard
            icon={<RefreshCw className="w-4 h-4" />}
            label="Redundant Calls"
            issueCount={redundancyIssues}
            waste={redundancyWaste}
            status={getStatusColor(redundancyScore)}
          />
        </div>
        <div onClick={() => onViewDetails?.('model')}>
          <SinCard
            icon={<Zap className="w-4 h-4" />}
            label="Model Overkill"
            issueCount={modelIssues}
            waste={modelWaste}
            status={getStatusColor(modelFitScore)}
          />
        </div>
        <div onClick={() => onViewDetails?.('context')}>
          <SinCard
            icon={<FileText className="w-4 h-4" />}
            label="Prompt Bloat"
            issueCount={contextIssues}
            waste={contextWaste}
            status={getStatusColor(contextEfficiencyScore)}
          />
        </div>
      </div>
    </div>
  );
}
