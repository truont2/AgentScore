import { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Fix } from '@/data/mockData';

interface FixSuggestionProps {
    fix: Fix;
    defaultOpen?: boolean;
}

export function FixSuggestion({ fix, defaultOpen = true }: FixSuggestionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="mt-3 border border-border/30 rounded-md overflow-hidden bg-muted/20">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
            >
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <Lightbulb className="w-4 h-4 text-score-warning shrink-0" />
                <span className="text-sm font-medium text-foreground">Suggested Fix</span>
                {fix.strategy && (
                    <Badge variant="outline" className="ml-auto text-xs bg-primary/10 text-primary border-primary/30">
                        {fix.strategy}
                    </Badge>
                )}
            </button>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                )}
            >
                <div className="px-3 pb-3 space-y-3">
                    <p className="text-sm text-muted-foreground">{fix.explanation}</p>

                    {fix.code && (
                        <CodeBlock code={fix.code} />
                    )}

                    {fix.taskComplexity && (
                        <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Task complexity:</span>
                                <Badge variant="secondary" className="bg-score-good/10 text-score-good">
                                    {fix.taskComplexity.level}
                                </Badge>
                            </div>
                            <ul className="space-y-1 text-muted-foreground">
                                {fix.taskComplexity.reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span className="text-score-good">✓</span>
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {fix.costComparison && (
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono bg-background/50 rounded-md p-2 border border-border/30">
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Current:</span>
                                <span className="text-score-poor">{fix.costComparison.current}</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Switch:</span>
                                <span className="text-score-good">{fix.costComparison.recommended}</span>
                            </div>
                            <Badge className="bg-score-good/20 text-score-good border-0 ml-auto">
                                {fix.costComparison.savingsPercent}% savings
                            </Badge>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
