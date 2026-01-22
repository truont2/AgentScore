import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { FrequencyInput, type TimePeriod } from './FrequencyInput';
import { ProjectionDisplay } from './ProjectionDisplay';
import { ContextComparisons } from './ContextComparisons';
import { DollarSign } from 'lucide-react';

interface SavingsProjectorProps {
    currentCost: number;
    optimizedCost: number;
}

export function SavingsProjector({ currentCost, optimizedCost }: SavingsProjectorProps) {
    const [frequency, setFrequency] = useState(100);
    const [period, setPeriod] = useState<TimePeriod>('day');

    const savingsPerRun = currentCost - optimizedCost;
    const savingsPercent = currentCost > 0
        ? Math.round((savingsPerRun / currentCost) * 100)
        : 0;

    // Calculate annual savings for comparisons
    const multipliers: Record<TimePeriod, number> = {
        hour: 24 * 365,
        day: 365,
        week: 52,
        month: 12,
    };
    const annualSavings = savingsPerRun * frequency * multipliers[period];

    return (
        <Card className="p-6 bg-card border-border">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-score-good/10">
                    <DollarSign className="w-5 h-5 text-score-good" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Projected Savings</h2>
            </div>

            {/* Current Cost Summary */}
            <div className="flex items-baseline justify-between mb-6 pb-6 border-b border-border/50">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Current workflow cost</p>
                    <p className="text-2xl font-bold font-mono text-foreground">${currentCost.toFixed(2)}</p>
                </div>
                <div className="text-muted-foreground text-2xl">→</div>
                <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Optimized cost</p>
                    <p className="text-2xl font-bold font-mono text-score-good">${optimizedCost.toFixed(2)}</p>
                </div>
            </div>

            <div className="bg-score-good/5 border border-score-good/20 rounded-lg px-4 py-3 mb-6">
                <p className="text-center">
                    <span className="text-muted-foreground">Savings per run: </span>
                    <span className="font-bold text-score-good font-mono">${savingsPerRun.toFixed(2)}</span>
                    <span className="text-muted-foreground"> ({savingsPercent}%)</span>
                </p>
            </div>

            {/* Frequency Input */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-4 mb-6">
                <FrequencyInput
                    frequency={frequency}
                    period={period}
                    onFrequencyChange={setFrequency}
                    onPeriodChange={setPeriod}
                />
            </div>

            {/* Projection Display */}
            <ProjectionDisplay
                savingsPerRun={savingsPerRun}
                currentCostPerRun={currentCost}
                frequency={frequency}
                period={period}
            />

            {/* Context Comparisons */}
            <div className="mt-6">
                <ContextComparisons annualSavings={annualSavings} />
            </div>
        </Card>
    );
}
