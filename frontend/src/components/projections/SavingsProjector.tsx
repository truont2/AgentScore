import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ProjectionDisplay } from './ProjectionDisplay';
import { DollarSign } from 'lucide-react';

interface SavingsProjectorProps {
    currentCost: number;
    optimizedCost: number;
}

export function SavingsProjector({ currentCost, optimizedCost }: SavingsProjectorProps) {
    const [runsPerDay, setRunsPerDay] = useState(100);

    const savingsPerRun = currentCost - optimizedCost;
    const savingsPercent = currentCost > 0
        ? Math.round((savingsPerRun / currentCost) * 100)
        : 0;

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

            {/* Slider Input */}
            <div className="bg-muted/30 border border-border/50 rounded-lg p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-foreground">
                        Runs per day
                    </label>
                    <span className="text-lg font-bold font-mono text-primary">
                        {runsPerDay}
                    </span>
                </div>
                <Slider
                    value={[runsPerDay]}
                    onValueChange={(vals) => setRunsPerDay(vals[0])}
                    min={1}
                    max={10000}
                    step={1}
                    className="w-full"
                />
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                    <span>1 run/day</span>
                    <span>10k runs/day</span>
                </div>
            </div>

            {/* Projection Display */}
            <ProjectionDisplay
                savingsPerRun={savingsPerRun}
                currentCostPerRun={currentCost}
                dailyRuns={runsPerDay}
            />
        </Card>
    );
}
