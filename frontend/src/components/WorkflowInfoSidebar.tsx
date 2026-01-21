import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, DollarSign, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowInfoSidebarProps {
    name: string;
    callCount: number;
    totalCost: number;
    timestamp: string;
    issuesCount: {
        high: number;
        medium: number;
        low: number;
    };
    potentialScore?: number;
}

export function WorkflowInfoSidebar({
    name,
    callCount,
    totalCost,
    timestamp,
    issuesCount,
    potentialScore = 100
}: WorkflowInfoSidebarProps) {
    const totalIssues = issuesCount.high + issuesCount.medium + issuesCount.low;
    const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Card className="p-5 bg-card border-border">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Workflow Info
            </h3>

            <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium text-foreground truncate" title={name}>
                        {name}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm font-mono text-foreground">45.2s</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Total Calls</p>
                            <p className="text-sm font-mono text-foreground">{callCount}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="text-sm font-mono text-foreground">${totalCost.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="text-sm text-foreground">{formattedDate}</p>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Issues Found */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Issues Found</p>
                        <Badge
                            variant="secondary"
                            className={cn(
                                totalIssues > 0
                                    ? 'bg-score-warning/10 text-score-warning'
                                    : 'bg-score-good/10 text-score-good'
                            )}
                        >
                            {totalIssues}
                        </Badge>
                    </div>

                    {totalIssues > 0 ? (
                        <div className="space-y-2">
                            {issuesCount.high > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-score-poor" />
                                        <span className="text-muted-foreground">High Priority</span>
                                    </div>
                                    <span className="font-mono text-score-poor">{issuesCount.high}</span>
                                </div>
                            )}
                            {issuesCount.medium > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-score-warning" />
                                        <span className="text-muted-foreground">Medium</span>
                                    </div>
                                    <span className="font-mono text-score-warning">{issuesCount.medium}</span>
                                </div>
                            )}
                            {issuesCount.low > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-muted-foreground">Low</span>
                                    </div>
                                    <span className="font-mono text-muted-foreground">{issuesCount.low}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-score-good">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>No issues detected</span>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Potential Score */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Potential Score</p>
                    <span className="text-lg font-bold text-score-good">{potentialScore}</span>
                </div>
            </div>
        </Card>
    );
}
