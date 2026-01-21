import { useMemo } from 'react';
import type { TimePeriod } from './FrequencyInput';
import { TrendingUp, DollarSign } from 'lucide-react';

interface ProjectionDisplayProps {
    savingsPerRun: number;
    currentCostPerRun: number;
    frequency: number;
    period: TimePeriod;
}

export function ProjectionDisplay({
    savingsPerRun,
    currentCostPerRun,
    frequency,
    period,
}: ProjectionDisplayProps) {
    const projections = useMemo(() => {
        // Convert to annual runs
        const multipliers: Record<TimePeriod, number> = {
            hour: 24 * 365,
            day: 365,
            week: 52,
            month: 12,
        };

        const annualRuns = frequency * multipliers[period];
        const dailyRuns = annualRuns / 365;
        const weeklyRuns = annualRuns / 52;
        const monthlyRuns = annualRuns / 12;

        return {
            daily: savingsPerRun * dailyRuns,
            weekly: savingsPerRun * weeklyRuns,
            monthly: savingsPerRun * monthlyRuns,
            yearly: savingsPerRun * annualRuns,
            currentAnnual: currentCostPerRun * annualRuns,
            optimizedAnnual: (currentCostPerRun - savingsPerRun) * annualRuns,
        };
    }, [savingsPerRun, currentCostPerRun, frequency, period]);

    const percentageSaved = currentCostPerRun > 0
        ? Math.round((savingsPerRun / currentCostPerRun) * 100)
        : 0;

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return `$${value.toFixed(0)}`;
    };

    return (
        <div className="space-y-6">
            {/* Hero Number */}
            <div className="bg-gradient-to-br from-score-good/10 to-score-good/5 border border-score-good/20 rounded-xl p-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-score-good/10 via-transparent to-transparent" />
                <div className="relative">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-score-good" />
                        <span className="text-sm font-medium text-score-good uppercase tracking-wide">
                            Projected Annual Savings
                        </span>
                    </div>
                    <p className="text-5xl font-bold text-score-good font-mono tracking-tight">
                        {formatCurrency(projections.yearly)}
                    </p>
                    <p className="text-muted-foreground mt-2">saved per year</p>
                </div>
            </div>

            {/* Breakdown Row */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Daily', value: projections.daily },
                    { label: 'Weekly', value: projections.weekly },
                    { label: 'Monthly', value: projections.monthly },
                    { label: 'Yearly', value: projections.yearly },
                ].map(({ label, value }) => (
                    <div
                        key={label}
                        className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center"
                    >
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-lg font-semibold font-mono text-foreground">
                            {formatCurrency(value)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Annual Spend Comparison */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current annual spend</span>
                    <span className="font-mono text-foreground">{formatCurrency(projections.currentAnnual)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Optimized annual spend</span>
                    <span className="font-mono text-score-good">{formatCurrency(projections.optimizedAnnual)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-score-good pt-2 border-t border-border/50">
                    <TrendingUp className="w-4 h-4" />
                    <span>That's {percentageSaved}% of your AI budget recovered.</span>
                </div>
            </div>
        </div>
    );
}
