import { AlertTriangle, Zap, BarChart3, GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface GraphMetricsBarProps {
  deadBranchCost: number;
  criticalPathLatency: number;
  informationEfficiency: number;
  parallelizationPotential: number;
}

const GraphMetricsBar = ({
  deadBranchCost,
  criticalPathLatency,
  informationEfficiency,
  parallelizationPotential,
}: GraphMetricsBarProps) => {
  const metrics = [
    {
      icon: AlertTriangle,
      label: 'Dead Branch Cost',
      value: `$${deadBranchCost.toFixed(2)}`,
      subtext: 'Wasted on unused outputs',
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    },
    {
      icon: Zap,
      label: 'Critical Path',
      value: `${criticalPathLatency.toFixed(1)}s`,
      subtext: 'Minimum latency bottleneck',
      colorClass: 'text-score-warning',
      bgClass: 'bg-score-warning/10',
    },
    {
      icon: BarChart3,
      label: 'Info Efficiency',
      value: `${Math.round(informationEfficiency * 100)}%`,
      subtext: 'Output actually used downstream',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      icon: GitBranch,
      label: 'Parallelization',
      value: `${Math.round(parallelizationPotential * 100)}%`,
      subtext: 'Time saveable with optimization',
      colorClass: 'text-score-good',
      bgClass: 'bg-score-good/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="p-4 bg-card border-border/50 hover:border-border transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${metric.bgClass}`}>
              <metric.icon className={`w-4 h-4 ${metric.colorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
              <p className={`text-xl font-bold ${metric.colorClass} font-mono`}>
                {metric.value}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{metric.subtext}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GraphMetricsBar;
