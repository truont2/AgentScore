import { cn } from '@/lib/utils';
// import { Progress } from '@/components/ui/progress';
import { RefreshCw, Zap, Package } from 'lucide-react';

interface ScoreBreakdownProps {
  redundancyScore: number;
  modelFitScore: number;
  contextEfficiencyScore: number;
}

interface BreakdownItemProps {
  label: string;
  score: number;
  icon: React.ReactNode;
}

function BreakdownItem({ label, score, icon }: BreakdownItemProps) {
  const getProgressColor = (score: number) => {
    if (score >= 71) return 'bg-score-good';
    if (score >= 41) return 'bg-score-warning';
    return 'bg-score-poor';
  };

  const getTextColor = (score: number) => {
    if (score >= 71) return 'text-score-good';
    if (score >= 41) return 'text-score-warning';
    return 'text-score-poor';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className={cn('text-sm font-semibold', getTextColor(score))}>
          {score}/100
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full transition-all duration-500', getProgressColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function ScoreBreakdown({ redundancyScore, modelFitScore, contextEfficiencyScore }: ScoreBreakdownProps) {
  return (
    <div className="space-y-5">
      <BreakdownItem
        label="Redundancy Score"
        score={redundancyScore}
        icon={<RefreshCw className="w-4 h-4 text-muted-foreground" />}
      />
      <BreakdownItem
        label="Model Fit Score"
        score={modelFitScore}
        icon={<Zap className="w-4 h-4 text-muted-foreground" />}
      />
      <BreakdownItem
        label="Context Efficiency"
        score={contextEfficiencyScore}
        icon={<Package className="w-4 h-4 text-muted-foreground" />}
      />
    </div>
  );
}
