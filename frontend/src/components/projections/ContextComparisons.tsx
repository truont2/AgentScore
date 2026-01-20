import { useState, useEffect } from 'react';
import { Briefcase, Coffee, Laptop, Building2, Rocket } from 'lucide-react';

interface ContextComparisonsProps {
    annualSavings: number;
}

interface ComparisonItem {
    icon: React.ElementType;
    calculate: (savings: number) => string;
    label: (value: string) => string;
}

const comparisons: ComparisonItem[] = [
    {
        icon: Briefcase,
        calculate: (savings: number) => (savings / 75000).toFixed(1),
        label: (value: string) => `${value} junior developer salaries`,
    },
    {
        icon: Coffee,
        calculate: (savings: number) => Math.round(savings / 3).toLocaleString(),
        label: (value: string) => `${value} cups of coffee`,
    },
    {
        icon: Laptop,
        calculate: (savings: number) => Math.round(savings / 1299).toLocaleString(),
        label: (value: string) => `${value} MacBook Airs`,
    },
    {
        icon: Building2,
        calculate: (savings: number) => (savings / 12000).toFixed(1),
        label: (value: string) => `${value} months of SF office rent`,
    },
    {
        icon: Rocket,
        calculate: (savings: number) => Math.round(savings / 100).toLocaleString(),
        label: (value: string) => `${value} months of GPT-4 hobby tier`,
    },
];

export function ContextComparisons({ annualSavings }: ContextComparisonsProps) {
    const [activeComparisons, setActiveComparisons] = useState<typeof comparisons>([]);

    useEffect(() => {
        // Pick 3 random comparisons for variety
        const shuffled = [...comparisons].sort(() => 0.5 - Math.random());
        setActiveComparisons(shuffled.slice(0, 3));
    }, []);

    if (annualSavings < 100) return null;

    return (
        <div className="bg-muted/20 border border-border/50 rounded-lg p-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
                That's equivalent to
            </p>
            <div className="space-y-2">
                {activeComparisons.map((comparison, index) => {
                    const Icon = comparison.icon;
                    const value = comparison.calculate(annualSavings);
                    return (
                        <div key={index} className="flex items-center gap-3 text-sm">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-foreground">{comparison.label(value)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
