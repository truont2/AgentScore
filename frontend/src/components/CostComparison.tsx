import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostComparisonProps {
  currentCost: number;
  optimizedCost: number;
  currentCalls?: number;
  optimizedCalls?: number;
}

export function CostComparison({
  currentCost,
  optimizedCost,
  currentCalls = 87,
  optimizedCalls = 42
}: CostComparisonProps) {
  const savings = currentCost - optimizedCost;
  const savingsPercent = currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0;

  const formatCurrency = (val: number) => {
    // For large numbers (> $1,000), drop decimals. 
    // For huge numbers (> $100,000), use 'k' notation.
    if (val >= 100000) return `$${(val / 1000).toFixed(1)}k`;
    if (val >= 1000) return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `$${val.toFixed(2)}`;
  };

  const getFontSize = (val: number) => {
    // Dynamic font size scaling
    if (val > 100000) return 'text-xl';
    if (val > 10000) return 'text-xl';
    return 'text-2xl';
  };

  return (
    <div className="bg-card border border-border rounded-md p-5 pr-12">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-5">
        Cost Analysis
      </h3>

      {/* Three Column Layout */}
      <div className="grid grid-cols-7 gap-2 items-center">
        {/* Current */}
        <div className="col-span-2 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Current</p>
          <p className={cn("font-semibold font-mono text-foreground tracking-tight whitespace-nowrap", getFontSize(currentCost))}>
            {formatCurrency(currentCost)}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {currentCalls} calls
          </p>
        </div>

        {/* Arrow */}
        <div className="col-span-1 flex justify-center">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Optimized */}
        <div className="col-span-2 space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Optimized</p>
          <p className={cn("font-semibold font-mono text-score-good tracking-tight whitespace-nowrap", getFontSize(optimizedCost))}>
            {formatCurrency(optimizedCost)}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {optimizedCalls} calls
          </p>
        </div>

        {/* Equals */}
        <div className="col-span-1 flex justify-center">
          <span className="text-muted-foreground">=</span>
        </div>

        {/* Saved */}
        <div className="col-span-1 space-y-1">
          <p className="text-[10px] text-score-good uppercase tracking-wide">Saved</p>
          <p className={cn("font-semibold font-mono text-score-good tracking-tight whitespace-nowrap", getFontSize(savings))}>
            {formatCurrency(savings)}
          </p>
          <p className="text-xs text-score-good font-semibold">
            {savingsPercent}%
          </p>
        </div>
      </div>

      {/* Waste bar visualization */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-2 uppercase tracking-wide">
          <span>Spend Breakdown</span>
          <span className="text-score-poor">{savingsPercent}% waste</span>
        </div>
        <div className="h-2 rounded-sm overflow-hidden flex bg-secondary">
          <div
            className="bg-score-poor/80 transition-all duration-500"
            style={{ width: `${savingsPercent}%` }}
          />
          <div
            className="bg-score-good transition-all duration-500"
            style={{ width: `${100 - savingsPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1.5">
          <span className="text-score-poor">Recoverable</span>
          <span className="text-score-good">Necessary</span>
        </div>
      </div>
    </div>
  );
}
