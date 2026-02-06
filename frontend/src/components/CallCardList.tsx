import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, FileJson } from "lucide-react";
import { cn, cleanContent } from "@/lib/utils";

export interface Call {
    id: string;
    index: number;
    model: string;
    cost: number;
    inputTokens: number;
    outputTokens: number;
    prompt: string;
    response: string;
    raw?: any;
    messages?: Array<{ type: string, content: string }>;
}

interface CallCardProps {
    call: Call;
}

function CallCard({ call }: CallCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [showRaw, setShowRaw] = useState(false);

    // Helper to format large numbers
    const formatCompact = (num: number) => {
        return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    const modelColor = call.model.toLowerCase().includes("gpt-4")
        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
        : call.model.toLowerCase().includes("gemini")
            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
            : "bg-muted text-muted-foreground border-border";

    // PARSING LOGIC: ADAPTIVE STRATEGY
    // 1. Try to parse as valid JSON (Rich Chat)
    // 2. Fallback to Raw Text (but clean up Python dumps if possible)
    let parsedMessages: Array<{ type: string, content: string }> | null = null;
    let rawContent: string | null = null;

    try {
        // Attempt JSON Parse
        if (typeof call.prompt === 'string' && (call.prompt.trim().startsWith('[') || call.prompt.trim().startsWith('{'))) {
            const parsed = JSON.parse(call.prompt);
            parsedMessages = Array.isArray(parsed) ? parsed : [parsed];
        } else {
            // It's a plain string (User passed a raw string prompt, or legacy log)
            rawContent = call.prompt;
        }
    } catch (e) {
        // FAST FAIL: If JSON parse errors, treat as Raw Text.
        // We do NOT want brittle regex here that fails on newlines.
        rawContent = call.prompt;
    }

    // Preview Selection
    let previewText = "";
    if (parsedMessages) {
        // Find last human message
        previewText = [...parsedMessages].reverse().find(m => m.type === 'human')?.content || "No user input found";
    } else {
        previewText = rawContent || "";
    }

    // Extract the "Main" prompt (usually the last human message) for preview
    // We already calculated previewText for this purpose

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
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {parsedMessages ? "User Input" : "Prompt Preview"}
                        </span>
                        <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed font-mono text-xs">
                            {previewText}
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
            <div className="px-4 pb-2 flex items-center gap-4">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 focus:outline-none"
                >
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {expanded ? "Hide trace" : "Show trace"}
                </button>

                {call.raw && (
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className={cn(
                            "flex items-center gap-2 text-xs transition-colors py-2 focus:outline-none",
                            showRaw ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <FileJson className="w-3.5 h-3.5" />
                        {showRaw ? "Hide Raw JSON" : "View Raw JSON"}
                    </button>
                )}
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-6">
                        {/* INPUT SECTION */}
                        <div className="space-y-4">
                            {parsedMessages ? (
                                parsedMessages.map((msg, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                {msg.type === 'human' ? 'User Prompt' : msg.type === 'system' ? 'System Instructions' : msg.type}
                                            </span>
                                        </div>
                                        <div className="bg-muted/30 border border-border/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-1.5">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Prompt</span>
                                    <div className="bg-muted/30 border border-border/50 rounded-md p-3 text-xs font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
                                        {rawContent}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* OUTPUT SECTION */}
                        <div className="space-y-1.5">
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/80">Model Response</span>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-md p-3 text-xs text-foreground/90 leading-relaxed prose prose-invert prose-xs max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 [&_p]:m-0 [&_p]:leading-relaxed [&_strong]:text-emerald-300 [&_strong]:font-black">
                                <ReactMarkdown>
                                    {cleanContent(call.response || "No response data available.")}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRaw && call.raw && (
                <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-zinc-950 text-zinc-50 rounded-md p-4 text-[11px] font-mono overflow-auto max-h-[500px] border border-border/50 shadow-inner">
                        <pre>{JSON.stringify(call.raw, null, 2)}</pre>
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
