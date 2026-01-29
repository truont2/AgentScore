import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Clock,
  GitBranch,
  RefreshCw,
  Sparkles,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import WorkflowGraph from "@/components/WorkflowGraph";
import GraphMetricsBar from "@/components/graph/GraphMetricsBar";

import { type Workflow, type Finding } from '@/data/mockData';

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
  const [rawWorkflowData, setRawWorkflowData] = useState<BackendWorkflowDetail | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisAttempted, setAnalysisAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // 0. Check for Demo IDs
      if (id === 'demo-legacy' || id === 'demo-optimized') {
        const { getWorkflowById } = await import('@/data/mockData');
        const demoWf = getWorkflowById(id);
        if (demoWf) {
          setWorkflow(demoWf);
          if (demoWf.nodes) {
            setGraphData({
              nodes: demoWf.nodes,
              edges: demoWf.edges || [],
              metrics: demoWf.metrics || { dead_branch_cost: 0, critical_path_latency: 0, info_efficiency: 0 },
              calls: demoWf.nodes
            });
          }
          return;
        }
      }

      // 1. Fetch Workflow Basic Info & Graph Data concurrently
      const [wfRes, graphRes, analysisRes] = await Promise.all([
        fetch(`http://localhost:8000/workflows/${id}`),
        fetch(`http://localhost:8000/workflows/${id}/graph`),
        fetch(`http://localhost:8000/workflows/${id}/analysis`)
      ]);

      if (!wfRes.ok) throw new Error('Failed to fetch workflow details');

      const wfData: BackendWorkflowDetail = await wfRes.json();
      setRawWorkflowData(wfData);

      if (graphRes.ok) {
        const gData = await graphRes.json();
        setGraphData({
          ...gData,
          calls: gData.nodes // Map nodes to calls for GeminiAnalysis compatibility
        });
      }

      const analysisList: BackendAnalysis[] = analysisRes.ok ? await analysisRes.json() : [];
      const latestAnalysis = analysisList.length > 0 ? analysisList[0] : null;

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
      setError('Failed to load workflow data.');
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleAnalyze = useCallback(async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      setAnalysisAttempted(true);

      const res = await fetch(`http://localhost:8000/workflows/${id}/analyze`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Analysis failed');
      }

      toast({
        title: "Analysis Complete",
        description: "Gemini has successfully analyzed this workflow.",
      });

      await fetchData();
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [id, fetchData, toast]);

  // Auto-Analyze Effect
  useEffect(() => {
    if (workflow && workflow.status === 'pending' && workflow.callCount > 0 && !analyzing && !analysisAttempted) {
      handleAnalyze();
    }
  }, [workflow, analyzing, analysisAttempted, handleAnalyze]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-6 py-8 space-y-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-64 rounded-xl" />
            <div className="space-y-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-6 py-8 flex items-center justify-center">
          <p className="text-muted-foreground">{error || "Workflow not found"}</p>
        </main>
      </div>
    );
  }

  const isAnalyzed = workflow.status === 'analyzed';
  const optimizedScore = isAnalyzed ? Math.min((workflow.efficiencyScore || 0) + 20, 99) : null;

  const issuesCount = {
    high: (workflow.redundancyFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0) +
      (workflow.modelOverkillFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0),
    medium: (workflow.contextBloatFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0),
    low: (workflow.redundancyFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) <= 0.05).length || 0) +
      (workflow.contextBloatFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) <= 0.05).length || 0)
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-6 py-8 pb-20">
        {/* Back Link */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Workflow Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{workflow.name}</h1>
              <StatusBadge status={analyzing ? 'pending' : (workflow.status as 'pending' | 'analyzed')} />
            </div>
            <p className="text-sm text-muted-foreground">
              {workflow.callCount} AI calls • ${workflow.totalCost < 0.01 && workflow.totalCost > 0 ? workflow.totalCost.toFixed(5) : workflow.totalCost.toFixed(2)} total cost
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAnalyzed && (
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                variant="outline"
                className="gap-2"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    Gemini is analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Re-run Analysis
                  </>
                )}
              </Button>
            )}
            <Button className="bg-emerald-600 hover:bg-emerald-700">Download Report</Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="bg-muted/50 border border-border p-1 mb-8">
            <TabsTrigger value="analysis" className="data-[state=active]:bg-background">Optimization Analysis</TabsTrigger>
            <TabsTrigger value="graph" className="data-[state=active]:bg-background">Execution Trace</TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-background">Event Log</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis">
            {isAnalyzed && workflow.efficiencyScore !== null ? (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Main Content - 3 columns */}
                <div className="xl:col-span-3 space-y-8">
                  {/* Hero Section - Score + Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Score Card - THE HERO */}
                    <Card className="p-8 bg-card border-border flex flex-col items-center justify-center animate-fade-in-up">
                      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-6">
                        Efficiency Score
                      </h2>
                      <ScoreGauge
                        score={workflow.efficiencyScore}
                        optimizedScore={optimizedScore || undefined}
                        showTransformation={true}
                      />
                      {optimizedScore && (
                        <p className="text-sm text-muted-foreground mt-4">
                          Apply recommendations to reach <span className="text-score-good font-semibold">{optimizedScore}</span>
                        </p>
                      )}
                    </Card>

                    {/* Score Breakdown */}
                    <Card className="p-6 bg-card border-border animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                      <ScoreBreakdown
                        redundancyScore={workflow.redundancyScore || 0}
                        modelFitScore={workflow.modelFitScore || 0}
                        contextEfficiencyScore={workflow.contextEfficiencyScore || 0}
                      />
                    </Card>
                  </div>

                  {/* Cost Comparison */}
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <CostComparison
                      currentCost={workflow.totalCost}
                      optimizedCost={workflow.optimizedCost}
                    />
                  </div>

                  {/* Savings Projector */}
                  <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <SavingsProjector
                      currentCost={workflow.totalCost}
                      optimizedCost={workflow.optimizedCost}
                    />
                  </div>

                  {/* Findings Section */}
                  <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                    <h2 className="text-xl font-semibold">The Three Sins</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Issues identified in your workflow that are costing you money
                    </p>
                    <FindingsAccordion
                      redundancyFindings={workflow.redundancyFindings}
                      modelOverkillFindings={workflow.modelOverkillFindings}
                      contextBloatFindings={workflow.contextBloatFindings}
                    />
                  </div>
                </div>

                {/* Sidebar - 1 column */}
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
            ) : (
              /* Pending / Analyzing State */
              <Card className="p-12 bg-card border-border text-center">
                <div className="flex flex-col items-center gap-6">
                  {analyzing ? (
                    <>
                      <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Analyzing Workflow...</h2>
                        <p className="text-muted-foreground max-w-md">
                          Kaizen is analyzing your agent's tokens and costs. This usually takes just a few seconds.
                        </p>
                      </div>
                    </>
                  ) : workflow.callCount === 0 ? (
                    <>
                      <div className="p-4 rounded-full bg-muted">
                        <Clock className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Waiting for Events</h2>
                        <p className="text-muted-foreground max-w-md">
                          No AI events detected yet. Run your agent script to generate data.
                        </p>
                      </div>
                      <Button variant="outline" onClick={fetchData} className="mt-4">
                        Refresh Data
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-full bg-score-warning/10">
                        <AlertTriangle className="w-10 h-10 text-score-warning" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Analysis Required</h2>
                        <p className="text-muted-foreground max-w-md">This workflow is ready for analysis.</p>
                      </div>
                      <Button onClick={handleAnalyze} size="lg" className="mt-2">
                        <Play className="w-4 h-4 mr-2" /> Start Analysis
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="graph">
            <div className="space-y-8">

              {graphData && (
                <div className="animate-fade-in-up">
                  <GraphMetricsBar
                    deadBranchCost={graphData.metrics.dead_branch_cost}
                    criticalPathLatency={graphData.metrics.critical_path_latency}
                    informationEfficiency={graphData.metrics.info_efficiency / 100}
                    parallelizationPotential={0.42} // Simulated metric
                  />
                </div>
              )}

              <div className="animate-fade-in-up">
                <Card className="border-border bg-card overflow-hidden">
                  <CardHeader className="border-b bg-muted/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-emerald-500" />
                      Execution Cost Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {graphData ? (
                      <WorkflowGraph
                        nodes={graphData.nodes}
                        edges={graphData.edges}
                        onNodeClick={(node) => console.log("Clicked node:", node)}
                      />
                    ) : (
                      <div className="h-96 flex items-center justify-center text-muted-foreground italic">
                        No graph data available for this workflow.
                        <Button variant="link" onClick={fetchData}>Retry Loading Graph</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events">
            <Card className="border-border bg-card">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Event Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {rawWorkflowData?.events?.map((e: any, i: number) => (
                    <div key={e.run_id} className="p-6 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono">CALL #{i + 1}</Badge>
                          <span className="text-sm font-medium">{e.model}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prompt</p>
                          <div className="p-3 rounded-lg bg-muted/50 border border-border font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {e.prompt}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Response</p>
                          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 font-mono text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                            {e.response}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-4 text-[10px] text-muted-foreground">
                        <span>Latency: {e.latency_ms}ms</span>
                        <span>Cost: ${e.cost?.toFixed(5)}</span>
                        <span>Tokens: {e.tokens_in} in / {e.tokens_out} out</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
