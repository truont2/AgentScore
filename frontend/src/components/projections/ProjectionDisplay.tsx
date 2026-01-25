import { useMemo } from 'react';
// import { TimePeriod } from './FrequencyInput'; // This import is no longer needed

interface ProjectionDisplayProps {
    savingsPerRun: number;
    currentCostPerRun: number;
    dailyRuns: number;
}

export function ProjectionDisplay({
    savingsPerRun,
    currentCostPerRun,
    dailyRuns,
}: ProjectionDisplayProps) {
    const projections = useMemo(() => {
        const annualRuns = dailyRuns * 365;

        return {
            daily: savingsPerRun * dailyRuns,
            weekly: savingsPerRun * dailyRuns * 7,
            monthly: savingsPerRun * dailyRuns * 30,
            yearly: savingsPerRun * annualRuns,
            currentAnnual: currentCostPerRun * annualRuns,
            optimizedAnnual: (currentCostPerRun - savingsPerRun) * annualRuns,
        };
    }, [savingsPerRun, currentCostPerRun, dailyRuns]);

    const percentageSaved = currentCostPerRun > 0
        ? Math.round((savingsPerRun / currentCostPerRun) * 100)
        : 0;

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value.toFixed(0)}`;
    };

    return (
        <div className="space-y-4">
            {/* Hero Number */}
            <div className="text-center py-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                    Annual Savings
                </p>
                <p className="text-4xl font-semibold font-mono text-score-good">
                    {formatCurrency(projections.yearly)}
                </p>
            </div>

            {/* Breakdown Row */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: 'Daily', value: projections.daily },
                    { label: 'Weekly', value: projections.weekly },
                    { label: 'Monthly', value: projections.monthly },
                    { label: 'Yearly', value: projections.yearly },
                ].map(({ label, value }) => (
                    <div
                        key={label}
                        className="bg-secondary rounded p-2 text-center"
                    >
                        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                        <p className="text-sm font-semibold font-mono text-foreground">
                            {formatCurrency(value)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Annual Spend Comparison */}
            <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Current annual spend</span>
                    <span className="font-mono text-foreground">{formatCurrency(projections.currentAnnual)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Optimized annual spend</span>
                    <span className="font-mono text-score-good">{formatCurrency(projections.optimizedAnnual)}</span>
                </div>
                <p className="text-sm text-score-good pt-1">
                    {percentageSaved}% of AI budget recovered
                </p>
            </div>
        </div>
    );
}
