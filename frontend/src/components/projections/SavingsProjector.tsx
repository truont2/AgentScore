import { useState } from 'react';
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

    // Calculation Helper
    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
        return `$${value.toFixed(0)}`;
    };

    const monthlySavings = savingsPerRun * dailyRuns * 30;
    const yearlySavings = savingsPerRun * dailyRuns * 365;

    return (
        <div className="bg-card border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/10 rounded-xl p-6 relative overflow-hidden transition-all hover:border-emerald-500/40 hover:shadow-emerald-500/20 group/container">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

            <div className="space-y-6 relative">
                {/* Header & Controls Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Projected Savings</h2>
                            <p className="text-xs text-muted-foreground">Estimated impact of optimizations</p>
                        </div>
                    </div>

                    <FrequencyInput
                        frequency={frequency}
                        period={period}
                        onFrequencyChange={setFrequency}
                        onPeriodChange={setPeriod}
                    />
                </div>

                {/* The Green Box (Hero) */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden group transition-all hover:border-emerald-500/50">
                    <div className="bg-emerald-500/20 p-2.5 rounded-full shrink-0 hidden sm:block">
                        <span className="text-xl">💰</span>
                    </div>

                    <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-emerald-50 text-base sm:text-lg font-medium">
                            <span>
                                Save <span className="font-bold text-emerald-400">${savingsPerRun.toFixed(2)}/run</span>
                            </span>
                            <span className="text-emerald-500/50 hidden sm:inline">·</span>
                            <span>
                                <span className="font-bold text-emerald-400">{formatCurrency(monthlySavings)}/month</span>
                            </span>
                            <span className="text-emerald-500/70 text-sm font-normal ml-auto sm:ml-2">
                                at {frequency.toLocaleString()} runs/{period}
                            </span>
                        </div>
                    </div>

                    {/* Subtle Background Glow */}
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Detailed Breakdown (Optional / Secondary) */}
                {savingsPerRun > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Daily</span>
                            <span className="font-mono text-sm font-medium">{formatCurrency(savingsPerRun * dailyRuns)}</span>
                        </div>
                        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Weekly</span>
                            <span className="font-mono text-sm font-medium">{formatCurrency(savingsPerRun * dailyRuns * 7)}</span>
                        </div>
                        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 text-center">
                            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Monthly</span>
                            <span className="font-mono text-sm font-medium">{formatCurrency(monthlySavings)}</span>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-center">
                            <span className="text-[10px] uppercase text-emerald-500 block mb-1">Yearly</span>
                            <span className="font-mono text-sm font-medium text-emerald-400">{formatCurrency(yearlySavings)}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
