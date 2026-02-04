import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Sparkles,
  Search,
  Loader2,
  GitBranch
} from 'lucide-react';

import { Header } from '@/components/Header';
import { ScoreGauge } from '@/components/ScoreGauge';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { CostComparison } from '@/components/CostComparison';
import { FindingsAccordion } from '@/components/FindingsAccordion';
import { SavingsProjector } from '@/components/projections/SavingsProjector';
import { WorkflowInfoSidebar } from '@/components/WorkflowInfoSidebar';
import { CallCardList, type Call } from '@/components/CallCardList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowGraph from "@/components/WorkflowGraph";

import { type Workflow, type Finding } from '@/types';

// Backend Interfaces
interface BackendWorkflowDetail {
  id: string;
  name?: string;
  status: string;
  total_calls: number;
  total_cost: number;
  created_at: string;
  latency_ms?: number;
  events?: any[];
}

interface BackendAnalysis {
  id: string;
  workflow_id: string;
  original_cost: number;
  optimized_cost: number;
  efficiency_score: number;
  efficiency_grade?: string;
  redundancies?: { items: any[] };
  model_overkill?: { items: any[] };
  prompt_bloat?: { items: any[] };
  security_risks?: { items: any[] };
  created_at: string;
}

interface GraphData {
  nodes: any[];
  calls?: any[];
  edges: any[];
  metrics: {
    dead_branch_cost: number;
    critical_path_latency: number;
    info_efficiency: number;
  };
}

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing analysis...");
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Fetch Workflow Basic Info & Graph Data concurrently
      const [wfRes, graphRes, analysisRes] = await Promise.all([
        fetch(`http://localhost:8000/workflows/${id}`),
        fetch(`http://localhost:8000/workflows/${id}/graph`),
        fetch(`http://localhost:8000/workflows/${id}/analysis`)
      ]);

      if (!wfRes.ok) throw new Error('Failed to fetch workflow details');

      const wfData: BackendWorkflowDetail = await wfRes.json();

      const analysisList: BackendAnalysis[] = analysisRes.ok ? await analysisRes.json() : [];
      const latestAnalysis = analysisList.length > 0 ? analysisList[0] : null;

      if (graphRes.ok) {
        const gData = await graphRes.json();

        let mergedCalls = gData.nodes;

        // Merge Analysis Findings into Graph Nodes
        if (latestAnalysis) {
          const redundancies = latestAnalysis.redundancies?.items || [];
          const overkill = latestAnalysis.model_overkill?.items || [];
          const bloat = latestAnalysis.prompt_bloat?.items || [];
          const security = latestAnalysis.security_risks?.items || [];

          mergedCalls = gData.nodes.map((node: any, idx: number) => {
            // Analysis uses "call_1", "call_2" which corresponds to 1-based index (idx + 1)
            const callId = `call_${idx + 1}`;

            const rFinding = redundancies.find((f: any) => f.call_ids?.includes(callId));
            const oFinding = overkill.find((f: any) => f.call_id === callId);
            const bFinding = bloat.find((f: any) => f.call_id === callId);
            const sFinding = security.find((f: any) => f.call_id === callId);

            return {
              ...node,
              isRedundant: !!rFinding,
              redundantWithId: rFinding ? rFinding.call_ids.find((id: string) => id !== callId) : undefined,
              isOverkill: !!oFinding,
              recommendedModel: oFinding?.recommended_model,
              isBloated: !!bFinding,
              hasSecurityRisk: !!sFinding,
              vulnerabilityType: sFinding?.risk_type,
              reason: rFinding?.reason || oFinding?.reason || bFinding?.reason || sFinding?.reason
            };
          });
        }

        setGraphData({
          ...gData,
          nodes: mergedCalls,
          calls: mergedCalls
        });
      }

      // 3. Map to Frontend Workflow Interface
      const mappedWorkflow: Workflow = {
        id: wfData.id,
        name: wfData.name || 'Untitled Workflow',
        description: (wfData as any).description, // Type assertion as backend interface not yet updated in this file
        timestamp: wfData.created_at,
        callCount: wfData.total_calls,
        totalCost: wfData.total_cost,
        status: (wfData.status === 'completed' || wfData.status === 'analyzed' || latestAnalysis) ? 'analyzed' : 'pending',

        optimizedCost: latestAnalysis?.optimized_cost || wfData.total_cost,
        efficiencyScore: latestAnalysis?.efficiency_score || null,
        redundancyScore: latestAnalysis ? 85 : null,
        modelFitScore: latestAnalysis ? 90 : null,
        contextEfficiencyScore: latestAnalysis ? 75 : null,

        redundancyFindings: (latestAnalysis?.redundancies?.items || []).map((f: any, idx: number) => ({
          ...f,
          id: `r-${idx}`,
          description: "Redundant Call Detected",
          details: f.reason,
          savings: f.savings || '$0.00',
          callIds: f.call_ids,
          fix: f.common_fix ? {
            strategy: 'Optimization',
            explanation: f.common_fix.summary,
            code: f.common_fix.code,
          } : undefined,
        })) as Finding[],
        modelOverkillFindings: (latestAnalysis?.model_overkill?.items || []).map((f: any, idx: number) => ({
          ...f,
          id: `m-${idx}`,
          description: f.task_type ? `Model Overkill: ${f.task_type}` : "Model Overkill Detected",
          details: f.reason,
          savings: f.savings || '$0.00',
          currentModel: f.current_model,
          recommendedModel: f.recommended_model,
          taskType: f.task_type,
          fix: f.common_fix ? {
            strategy: 'Model Swap',
            explanation: f.common_fix.summary,
            code: f.common_fix.code,
          } : undefined,
        })) as Finding[],
        contextBloatFindings: (latestAnalysis?.prompt_bloat?.items || []).map((f: any, idx: number) => ({
          ...f,
          id: `c-${idx}`,
          description: "Context Bloat Detected",
          details: f.reason,
          savings: f.savings || '$0.00',
          currentTokens: f.current_tokens,
          optimizedTokens: f.estimated_necessary_tokens,
          fix: f.common_fix ? {
            strategy: 'Prompt Engineering',
            explanation: f.common_fix.summary,
            code: f.common_fix.code,
          } : undefined,
        })) as Finding[],
        events: wfData.events || [], // Map raw events
      };

      setWorkflow(mappedWorkflow);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Messages cycling effect
  useEffect(() => {
    if (analyzing) {
      const msgs = [
        "Comparing prompts for semantic similarity...",
        "Checking for model overkill...",
        "Analyzing context efficiency...",
        "Calculated potential savings...",
        "Generating optimization patterns..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(msgs[i % msgs.length]);
        i++;
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [analyzing]);

  // Handle Analysis Trigger
  const handleAnalyze = useCallback(async () => {
    if (!id) return false;

    setAnalyzing(true);
    setLoadingMessage("Initializing analysis...");

    try {
      const response = await fetch(`http://localhost:8000/workflows/${id}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed');
      }

      toast({
        title: "Analysis Complete",
        description: "Efficiency report generated successfully.",
      });

      await fetchData();
      return true;
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setAnalyzing(false);
    }
  }, [id, fetchData, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading workflow...</span>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <p className="text-muted-foreground">Workflow not found</p>
        </main>
      </div>
    );
  }

  const isAnalyzed = workflow.status === 'analyzed';
  const optimizedScore = isAnalyzed ? Math.min((workflow.efficiencyScore || 0) + 20, 99) : null;

  // Calculate issue counts based on savings (safely parsing string "$2.50")
  const parseSavings = (s?: string) => s ? parseFloat(s.replace(/[^0-9.]/g, '')) : 0;

  const issuesCount = {
    high: workflow.redundancyFindings.filter(f => parseSavings(f.savings) > 0.05).length +
      workflow.modelOverkillFindings.filter(f => parseSavings(f.savings) > 0.05).length,
    medium: workflow.contextBloatFindings.filter(f => parseSavings(f.savings) > 0.05).length,
    low: workflow.redundancyFindings.filter(f => parseSavings(f.savings) <= 0.05).length +
      workflow.contextBloatFindings.filter(f => parseSavings(f.savings) <= 0.05).length
  };

  // Transform graph data for CallCardList
  const callListItems: Call[] = (workflow?.events || []).map((event: any, idx: number) => ({
    id: event.run_id || event.id || `call-${idx}`,
    index: idx + 1,
    model: event.model || 'Unknown',
    cost: event.cost || 0,
    inputTokens: event.tokens_in || 0,
    outputTokens: event.tokens_out || 0,
    prompt: typeof event.prompt === 'string' ? event.prompt : JSON.stringify(event.prompt, null, 2),
    response: typeof event.response === 'string' ? event.response : JSON.stringify(event.response, null, 2),
    raw: event
  }));

  // Statistics Calculation
  const totalDurationMs = (graphData?.nodes || []).reduce((acc: number, node: any) => acc + (node.latency || 0), 0);
  const formattedDuration = totalDurationMs < 1000 ? `${totalDurationMs}ms` : `${(totalDurationMs / 1000).toFixed(1)}s`;

  const modelCounts = (graphData?.nodes || []).reduce((acc: Record<string, number>, node: any) => {
    const model = node.model || "Unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  const modelDisplay = Object.entries(modelCounts).map(([m, c]) => {
    // Remove 'models/' prefix if present, then format standard names
    const cleanName = m.replace('models/', '');
    const shortName = cleanName.replace('gemini-', 'Gemini ').replace('gpt-', 'GPT-');
    return `${shortName} (${c})`;
  }).join("\n");

  // Render Logic for Analysis Tab State
  const renderAnalysisTabContent = () => {
    if (analyzing) {
      return (
        <div className="bg-card border border-border rounded-lg p-16 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-full border-4 border-muted/30"></div>
              <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              <Search className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
            </div>

            <h2 className="text-xl font-semibold mb-2">Analyzing with Gemini...</h2>

            <p className="text-muted-foreground mb-8 min-h-[1.5em] transition-all duration-300">
              "{loadingMessage}"
            </p>

            <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress-indeterminate"></div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">This typically takes 30-45 seconds</p>
          </div>
        </div>
      );
    }

    if (!isAnalyzed) {
      return (
        <div className="bg-card border border-border rounded-lg p-12 py-20 text-center">
          <div className="flex flex-col items-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Ready to Analyze
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Gemini will scan all {workflow.callCount} calls for efficiency opportunities, detecting redundant calls, model overkill, and context bloat.
            </p>

            <Button size="lg" onClick={handleAnalyze} className="gap-2 px-8 text-base h-12">
              <Play className="w-5 h-5 fill-current" />
              Analyze with Gemini
            </Button>

            <p className="text-xs text-muted-foreground mt-4">Calculates potential savings tailored to your workflow.</p>
          </div>
        </div>
      );
    }

    // Analyzed State (Dashboard)
    return (
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Analysis Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Hero Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Efficiency Score
              </h3>
              <ScoreGauge
                score={workflow.efficiencyScore || 0}
                potentialScore={optimizedScore || undefined}
              />
            </div>
            <CostComparison
              currentCost={workflow.totalCost}
              optimizedCost={workflow.optimizedCost}
              currentCalls={workflow.callCount}
              optimizedCalls={Math.round(workflow.callCount * 0.7)} // Estimate
            />
          </div>

          {/* Waste Detection Cards */}
          <ScoreBreakdown
            redundancyScore={workflow.redundancyScore || 0}
            modelFitScore={workflow.modelFitScore || 0}
            contextEfficiencyScore={workflow.contextEfficiencyScore || 0}
            redundancySavings={workflow.redundancyFindings.reduce((acc, f) => acc + parseSavings(f.savings), 0)}
            modelShapeSavings={workflow.modelOverkillFindings.reduce((acc, f) => acc + parseSavings(f.savings), 0)}
            contextSavings={workflow.contextBloatFindings.reduce((acc, f) => acc + parseSavings(f.savings), 0)}
            issueCounts={{
              redundancy: workflow.redundancyFindings.length,
              model: workflow.modelOverkillFindings.length,
              context: workflow.contextBloatFindings.length
            }}
            onViewDetails={(section) => {
              const element = document.getElementById(section);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const trigger = element.querySelector('button');
                if (trigger && trigger.getAttribute('data-state') === 'closed') {
                  (trigger as HTMLElement).click();
                }
              }
            }}
          />

          {/* Savings Projector */}
          <SavingsProjector
            currentCost={workflow.totalCost}
            optimizedCost={workflow.optimizedCost}
          />

          {/* Findings Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Issues Detected
            </h2>
            <FindingsAccordion
              redundancyFindings={workflow.redundancyFindings}
              modelOverkillFindings={workflow.modelOverkillFindings}
              contextBloatFindings={workflow.contextBloatFindings}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-1">
          <div className="sticky top-8">
            <WorkflowInfoSidebar
              name={workflow.name}
              callCount={workflow.callCount}
              totalCost={workflow.totalCost}
              timestamp={workflow.timestamp}
              issuesCount={issuesCount}
              potentialScore={optimizedScore || 100}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-6 pt-8 pb-32 max-w-7xl">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflows
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{workflow.name}</h1>
          <p className="text-muted-foreground text-lg max-w-3xl">
            {workflow.description || "AI workflow pipeline for document processing and analysis"}
          </p>
        </div>

        {/* Tabs System */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 mb-8 rounded-none h-auto">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-base font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-base font-medium"
            >
              Analysis
            </TabsTrigger>
            {isAnalyzed && (
              <TabsTrigger
                value="trace"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-base font-medium"
              >
                Call Trace
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
            {/* Summary Stats Row for Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center h-40">
                <div className="text-4xl font-bold tracking-tight mb-1">{workflow.callCount}</div>
                <div className="text-sm text-muted-foreground">calls</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center h-40">
                <div className="text-4xl font-bold tracking-tight mb-1">${workflow.totalCost.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">total cost</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center h-40">
                <div className="text-4xl font-bold tracking-tight mb-1">{formattedDuration}</div>
                <div className="text-sm text-muted-foreground">duration</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center h-40">
                <div className="text-sm font-medium whitespace-pre-line">{modelDisplay || "N/A"}</div>
                <div className="text-sm text-muted-foreground mt-1">models</div>
              </div>
            </div>

            {/* Calls List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Calls
                </h3>
                <span className="text-sm text-muted-foreground">{workflow.callCount} total</span>
              </div>
              <CallCardList calls={callListItems} />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="focus-visible:outline-none">
            {renderAnalysisTabContent()}
          </TabsContent>

          <TabsContent value="trace" className="focus-visible:outline-none">
            <Card className="border-border bg-card">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-emerald-500" />
                  Execution Cost Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {graphData ? (
                  <div className="w-full">
                    <WorkflowGraph
                      nodes={graphData.nodes}
                      edges={graphData.edges}
                      onNodeClick={(node) => console.log("Clicked node:", node)}
                    />
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-muted-foreground italic text-sm">
                    No graph data available.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
