import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Call {
    id: string;
    index: number;
    model: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    prompt: string;
    response: string;
}

interface CallCardProps {
    call: Call;
}

function CallCard({ call }: CallCardProps) {
    const [expanded, setExpanded] = useState(false);

    // Helper to format large numbers
    const formatCompact = (num: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    const modelColor = call.model.toLowerCase().includes("gpt-4")
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        : call.model.toLowerCase().includes("gemini")
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
            : "bg-muted text-muted-foreground border-border";

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-200">
            <div className="p-4 grid grid-cols-12 gap-4 items-start">
                {/* Index */}
                <div className="col-span-1 pt-1">
                    <span className="font-bold text-foreground">#{call.index}</span>
                </div>

                {/* Main Content Preview */}
                <div className="col-span-11 lg:col-span-7 space-y-2">
                    <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Prompt</span>
                        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
                            {call.prompt}
                        </p>
                    </div>
                </div>

                {/* Stats & Metadata (Right side on large screens) */}
                <div className="col-span-12 lg:col-span-4 flex flex-wrap items-center justify-end gap-3 mt-2 lg:mt-0">
                    <Badge variant="outline" className={cn("font-medium border", modelColor)}>
                        {call.model.replace('models/', '')}
                    </Badge>

                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                        <span className="text-foreground">${call.cost.toFixed(4)}</span>
                        <span className="w-px h-3 bg-border"></span>
                        <span>{formatCompact(call.inputTokens)} in</span>
                        <span className="w-px h-3 bg-border"></span>
                        <span>{formatCompact(call.outputTokens)} out</span>
                    </div>
                </div>
            </div>

            {/* Response Accordion */}
            <div className="px-4 pb-2">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 focus:outline-none"
                >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded ? "Hide response" : "Show response"}
                </button>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-muted/30 rounded-md p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap border border-border/50">
                        {call.response || "No response data available."}
                    </div>
                </div>
            )}
        </div>
    );
}

interface CallCardListProps {
    calls: Call[];
}

export function CallCardList({ calls }: CallCardListProps) {
    if (calls.length === 0) {
        return <div className="text-center text-muted-foreground py-8">No calls recorded.</div>;
    }

    return (
        <div className="space-y-3">
            {calls.map((call) => (
                <CallCard key={call.id} call={call} />
            ))}
        </div>
    );
}
