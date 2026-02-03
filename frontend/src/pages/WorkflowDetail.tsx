import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  GitBranch,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';

import { Header } from '@/components/Header';
import { ScoreGauge } from '@/components/ScoreGauge';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { CostComparison } from '@/components/CostComparison';
import { FindingsAccordion } from '@/components/FindingsAccordion';
import { StatusBadge } from '@/components/StatusBadge';
import { SavingsProjector } from '@/components/projections/SavingsProjector';
import { WorkflowInfoSidebar } from '@/components/WorkflowInfoSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowGraph from "@/components/WorkflowGraph";
import GraphMetricsBar from "@/components/graph/GraphMetricsBar";

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
              reason: rFinding?.reason || oFinding?.reason || bFinding?.reason || sFinding?.reason // Capture the reason!
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

  const attemptRef = useRef(false);
  const [autoAnalysisFailed, setAutoAnalysisFailed] = useState(false);

  // Handle Analysis Trigger
  const handleAnalyze = useCallback(async () => {
    if (!id) return false;

    setAnalyzing(true);
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

  // Auto-Analyze Effect
  useEffect(() => {
    if (
      workflow &&
      workflow.status === 'pending' &&
      workflow.callCount > 0 &&
      !analyzing &&
      !attemptRef.current
    ) {
      attemptRef.current = true;
      setTimeout(async () => {
        const success = await handleAnalyze();
        if (!success) {
          console.error("Auto-analysis failed");
          setAutoAnalysisFailed(true);
        }
      }, 100);
    }
  }, [workflow, analyzing, handleAnalyze]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-6 pt-8 pb-32 max-w-7xl">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflows
        </Link>

        {/* Workflow Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">{workflow.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <span>Document processing pipeline</span>
                <span className="text-border">·</span>
                <span className="font-mono">{workflow.callCount} calls</span>
                <span className="text-border">·</span>
                <span className="font-mono">{new Date(workflow.timestamp).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={workflow.status} />
              {isAnalyzed && (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Re-run Analysis
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* LOADING / AUTO-ANALYZING STATE (Custom Logic) */}
        {!isAnalyzed && (analyzing || (!autoAnalysisFailed && workflow.callCount > 0)) ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center animate-pulse">
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Analyzing Workflow...
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  AgentScore is detecting patterns and calculating savings...
                </p>
              </div>
            </div>
          </div>
        ) : isAnalyzed && workflow.efficiencyScore !== null ? (
          <div className="w-full">
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="bg-muted/50 border border-border p-1 mb-6">
                <TabsTrigger value="analysis" className="data-[state=active]:bg-background">Optimization Analysis</TabsTrigger>
                <TabsTrigger value="trace" className="data-[state=active]:bg-background">Execution Trace</TabsTrigger>
              </TabsList>

              <TabsContent value="analysis" className="space-y-6 focus-visible:outline-none pb-12 overflow-visible">
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
                          score={workflow.efficiencyScore}
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

                  {/* Sidebar - Integrated into Analysis Tab only */}
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
              </TabsContent>

              <TabsContent value="trace" className="space-y-6 focus-visible:outline-none pb-12 overflow-visible">
                {graphData && (
                  <GraphMetricsBar
                    deadBranchCost={graphData.metrics.dead_branch_cost}
                    criticalPathLatency={graphData.metrics.critical_path_latency}
                    informationEfficiency={graphData.metrics.info_efficiency / 100}
                    financialLeak={workflow.totalCost > 0 ? (workflow.totalCost - workflow.optimizedCost) / workflow.totalCost : 0}
                    wastedTokens={workflow.contextEfficiencyScore ? (100 - workflow.contextEfficiencyScore) / 100 : 0}
                  />
                )}
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
          </div>
        ) : (
          /* Analysis Required / Retry State */
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="p-4 rounded-full bg-red-500/10">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Analysis Required
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  {workflow.callCount === 0 ? "No events detected yet. Run your agent to generate data." : "Automatic analysis failed or hasn't run."}
                </p>
              </div>
              {workflow.callCount > 0 && (
                <Button size="sm" className="mt-2" onClick={handleAnalyze}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Analysis
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
