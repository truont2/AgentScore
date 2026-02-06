import { type GraphCall } from '@/types';
import { Card } from '@/components/ui/card';
import { ShieldAlert, Zap, Clock, DollarSign, Database, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GraphDetailsPanelProps {
  selectedCall: GraphCall | null;
}

// Helper to handle mixed content types (arrays, objects) and strip indentation that breaks markdown
// e.g. converting 4-space indented text (which render as code blocks) back to normal text
const cleanContent = (content: any): string => {
  if (!content) return '';

  let text = '';

  // Handle array of prompts (common in LangChain/Agent data)
  if (Array.isArray(content)) {
    text = content.map(c => {
      if (typeof c === 'string') return c;
      if (typeof c === 'object' && c.content) return c.content; // OpenAI/LangChain message format
      return JSON.stringify(c);
    }).join('\n\n---\n\n');
  }
  else if (typeof content === 'object') {
    text = JSON.stringify(content, null, 2);
  } else {
    text = String(content);
  }

  // Strip leading indentation to prevent unintended code blocks
  // 1. Split into lines
  const lines = text.split('\n');
  // 2. Find minimum indentation (ignoring empty lines)
  const minIndent = lines
    .filter(l => l.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      return Math.min(min, indent);
    }, Infinity);

  // 3. Remove that indentation if it exists and is > 0
  if (minIndent > 0 && minIndent !== Infinity) {
    text = lines.map(l => l.slice(minIndent)).join('\n');
  }

  return text.trim();
};

const GraphDetailsPanel = ({ selectedCall }: GraphDetailsPanelProps) => {
  if (!selectedCall) {
    return (
      <Card className="p-8 bg-slate-900/50 border-dashed border-2 border-slate-800 shadow-none h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-slate-700 border-dashed rounded-full" />
        </div>
        <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-2">No Trace Step Selected</h4>
        <p className="text-[12px] text-slate-500 max-w-[180px] leading-relaxed font-medium">
          Select any execution step in the audit trace to inspect its
          <span className="text-slate-300 font-black italic"> security & financial footprint</span>.
        </p>
      </Card>
    );
  }

  const hasIssues = selectedCall.isRedundant || selectedCall.isOverkill || selectedCall.isBloated || selectedCall.hasSecurityRisk;

  return (
    <Card className="p-6 bg-slate-950 border-slate-800 shadow-lg flex flex-col h-full max-h-[800px]">
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide pr-2">
        <div>
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 border-b border-slate-800 pb-2">Trace Step Details</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {selectedCall.hasSecurityRisk && (
              <div className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-black uppercase rounded animate-pulse">Security Alert</div>
            )}
            {selectedCall.isRedundant && (
              <div className="px-2 py-0.5 bg-rose-500 text-white text-[9px] font-black uppercase rounded">Redundant</div>
            )}
            {selectedCall.isOverkill && (
              <div className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded">Overkill</div>
            )}
            {selectedCall.isBloated && (
              <div className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase rounded">Bloated</div>
            )}
          </div>

          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Step {(selectedCall.index || 0) + 1}</p>
          <p className="text-xl font-black text-slate-100 leading-tight break-words">{selectedCall.agent || 'Agent'}</p>
        </div>

        {/* Security Alert Section */}
        {selectedCall.hasSecurityRisk && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex gap-3 items-start animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-black text-red-400 uppercase leading-none mb-1">{selectedCall.vulnerabilityType || 'Vulnerability Detected'}</p>
              <p className="text-[11px] text-red-300/80 leading-relaxed font-semibold italic">
                {selectedCall.reason ? `"${selectedCall.reason}"` : "This call may have leaked sensitive strings or failed PII scrubbing protocols."}
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Spend</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">${(selectedCall.cost || 0).toFixed(4)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Latency</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">{selectedCall.latency}ms</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Database className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Tokens</span>
            </div>
            <p className="text-sm font-black text-slate-200 font-mono">{selectedCall.tokens.toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Zap className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider">Model</span>
            </div>
            <p className="text-[11px] font-black text-slate-200 truncate uppercase">{selectedCall.model.split('-').pop()}</p>
          </div>
        </div>

        {/* Audit Findings */}
        {hasIssues && (
          <div className="space-y-4 pt-2">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Optimization Path</h4>

            {selectedCall.isRedundant && (
              <div className="flex gap-3 items-start p-3 bg-rose-950/20 rounded-xl border border-rose-900/30">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Duplicate of <span className="font-bold text-rose-400">
                    {selectedCall.redundantWithIndex ? `Step #${selectedCall.redundantWithIndex}` : `Call #${(selectedCall.redundantWithId || '').slice(0, 8)}...`}
                  </span>. Recommend caching or sharing state.
                </p>
              </div>
            )}

            {selectedCall.isOverkill && (
              <div className="flex gap-3 items-start p-3 bg-amber-950/20 rounded-xl border border-amber-900/30">
                <Zap className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Right-size to <span className="font-bold text-amber-500">{selectedCall.recommendedModel}</span> for 85% cost recovery.
                  </p>
                </div>
              </div>
            )}

            {/* General Reason Display (Covers Bloat, Redundancy details, Overkill reasoning) */}
            {selectedCall.reason && (
              <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Analysis Logic</span>
                <p className="text-[11px] text-slate-300 leading-relaxed italic border-l-2 border-slate-600 pl-2">
                  "{selectedCall.reason}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payload / Context Data */}
        {(selectedCall.input || selectedCall.prompt || selectedCall.output || selectedCall.response) && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Payload Data</h4>

            {/* Input/Prompt */}
            {(selectedCall.input || selectedCall.prompt) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Input / Prompt</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedCall.input || selectedCall.prompt || '')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                <div className="bg-slate-950 rounded-lg border border-slate-800 relative group">
                  <div className="absolute top-2 right-2 text-[9px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    MARKDOWN
                  </div>
                  <div className="p-3 text-[10px] text-slate-400 leading-relaxed max-h-48 overflow-y-auto scrollbar-hide prose prose-invert prose-xs max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 [&_p]:m-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_strong]:font-black [&_strong]:text-slate-200">
                    <ReactMarkdown>
                      {cleanContent(selectedCall.input || selectedCall.prompt)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Output/Response */}
            {(selectedCall.output || selectedCall.response) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Output / Response</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedCall.output || selectedCall.response || '')}
                    className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                <div className="bg-slate-900/50 rounded-lg border border-slate-800/80 relative group">
                  <div className="absolute top-2 right-2 text-[9px] text-slate-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    MARKDOWN
                  </div>
                  <div className="p-3 text-[10px] text-emerald-400/80 leading-relaxed max-h-[300px] overflow-y-auto scrollbar-hide prose prose-invert prose-xs max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 [&_p]:m-0 [&_p]:leading-relaxed [&_strong]:text-emerald-300 [&_strong]:font-black">
                    <ReactMarkdown>
                      {cleanContent(selectedCall.output || selectedCall.response)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default GraphDetailsPanel;
