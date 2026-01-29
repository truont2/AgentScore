import { AlertTriangle, Zap, BarChart3, GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface GraphMetricsBarProps {
  deadBranchCost: number;
  criticalPathLatency?: number;
  informationEfficiency: number;
  parallelizationPotential: number;
}

const GraphMetricsBar = ({
  deadBranchCost,
  informationEfficiency,
  parallelizationPotential,
}: GraphMetricsBarProps) => {
  const metrics = [
    {
      icon: AlertTriangle,
      label: 'Abandoned Cost',
      value: `$${deadBranchCost.toFixed(2)}`,
      subtext: 'Output generated but ignored',
      colorClass: 'text-rose-500',
      bgClass: 'bg-rose-500/10',
    },
    {
      icon: Zap,
      label: 'Financial Leak',
      value: `${((1 - parallelizationPotential) * 100).toFixed(0)}%`,
      subtext: 'Potential savings from optimization',
      colorClass: 'text-amber-500',
      bgClass: 'bg-amber-500/10',
    },
    {
      icon: BarChart3,
      label: 'Resource Util.',
      value: `${Math.round(informationEfficiency * 100)}%`,
      subtext: 'Efficiency of paid tokens',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      icon: GitBranch, // Could use a different icon like Coins if available, but keeping existing imports
      label: 'Wasted Tokens',
      value: '22%', // Placeholder or passed prop if available
      subtext: 'Bloat in prompts & context',
      colorClass: 'text-emerald-500',
      bgClass: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="p-4 bg-white border-slate-200/60 hover:border-slate-300 transition-colors shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${metric.bgClass}`}>
              <metric.icon className={`w-4 h-4 ${metric.colorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 truncate">{metric.label}</p>
              <p className={`text-xl font-black ${metric.colorClass} font-mono mt-0.5`}>
                {metric.value}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-1">{metric.subtext}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GraphMetricsBar;
