import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProjectionDisplay } from './ProjectionDisplay';
import { DollarSign } from 'lucide-react';
import { FrequencyInput } from './FrequencyInput';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year';
// Re-export or redefine if needed, but for now just use the imported one or define it here
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

    // Normalizing to daily runs for the projection display
    const getMultiplier = (p: TimePeriod) => {
        switch (p) {
            case 'hour': return 24;
            case 'day': return 1;
            case 'week': return 1 / 7;
            case 'month': return 1 / 30;
            case 'year': return 1 / 365;
            default: return 1;
        }
    };

    const dailyRuns = frequency * getMultiplier(period);

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

            {/* Reverted to Frequency Input (Dropdowns) */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-5 mb-6">
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
                dailyRuns={dailyRuns}
            />
        </Card>
    );
}
