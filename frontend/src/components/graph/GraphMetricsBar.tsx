import { AlertTriangle, Zap, BarChart3, GitBranch } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface GraphMetricsBarProps {
  deadBranchCost: number;
  criticalPathLatency?: number;
  informationEfficiency: number;
  financialLeak: number;
  wastedTokens: number;
}

const GraphMetricsBar = ({
  deadBranchCost,
  informationEfficiency,
  financialLeak,
  wastedTokens,
}: GraphMetricsBarProps) => {
  const metrics = [
    {
      icon: AlertTriangle,
      label: 'Abandoned Cost',
      value: `$${deadBranchCost.toFixed(2)}`,
      subtext: 'Output generated but ignored',
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-950/30',
    },
    {
      icon: Zap,
      label: 'Financial Leak',
      value: `${Math.round(financialLeak * 100)}%`,
      subtext: 'Potential savings from optimization',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-950/30',
    },
    {
      icon: BarChart3,
      label: 'Information Flow',
      value: `${Math.round(informationEfficiency * 100)}%`,
      subtext: 'Efficiency of paid tokens',
      colorClass: 'text-blue-400',
      bgClass: 'bg-blue-950/30',
    },
    {
      icon: GitBranch, // Could use a different icon like Coins if available, but keeping existing imports
      label: 'Wasted Tokens',
      value: `${Math.round(wastedTokens * 100)}%`,
      subtext: 'Bloat in prompts & context',
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-950/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="p-4 bg-slate-950 border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${metric.bgClass}`}>
              <metric.icon className={`w-4 h-4 ${metric.colorClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 truncate">{metric.label}</p>
              <p className={`text-xl font-black ${metric.colorClass} font-mono mt-0.5`}>
                {metric.value}
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{metric.subtext}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default GraphMetricsBar;
