import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Clock, GitBranch, RefreshCw, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

import { Header } from '@/components/Header';
import { ScoreGauge } from '@/components/ScoreGauge';
import { ScoreBreakdown } from '@/components/ScoreBreakdown';
import { CostComparison } from '@/components/CostComparison';
import { FindingsAccordion } from '@/components/FindingsAccordion';
import { StatusBadge } from '@/components/StatusBadge';
import { SavingsProjector } from '@/components/projections/SavingsProjector';
import { WorkflowInfoSidebar } from '@/components/WorkflowInfoSidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { type Workflow, type Finding } from '@/data/mockData';

// Backend Interfaces
interface BackendWorkflowDetail {
  id: string;
  name?: string;
  status: string;
  total_calls: number;
  total_cost: number;
  created_at: string;
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

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisAttempted, setAnalysisAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      // 1. Fetch Workflow Basic Info
      const wfRes = await fetch(`http://127.0.0.1:8000/workflows/${id}`);
      if (!wfRes.ok) throw new Error('Failed to fetch workflow details');
      const wfData: BackendWorkflowDetail = await wfRes.json();

      // 2. Fetch Latest Analysis
      const analysisRes = await fetch(`http://127.0.0.1:8000/workflows/${id}/analysis`);
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

      const res = await fetch(`http://127.0.0.1:8000/workflows/${id}/analyze`, {
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
  // Calculate a projected score if we don't have one, or use a placeholder target
  const optimizedScore = isAnalyzed ? Math.min((workflow.efficiencyScore || 0) + 20, 99) : null;

  // Calculate issue counts
  const issuesCount = {
    high: (workflow.redundancyFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0) +
      (workflow.modelOverkillFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0),
    medium: (workflow.contextBloatFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) > 0.05).length || 0),
    low: (workflow.redundancyFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) <= 0.05).length || 0) +
      (workflow.contextBloatFindings?.filter(f => f.savings && parseFloat(f.savings.replace('$', '')) <= 0.05).length || 0)
  };

  return (
    <div className="min-h-screen bg-background">
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
              <h1 className="text-2xl font-bold text-foreground">{workflow.name}</h1>
              <StatusBadge status={analyzing ? 'pending' : (workflow.status as 'pending' | 'analyzed')} />
            </div>
            <p className="text-sm text-muted-foreground">
              {workflow.callCount} AI calls • ${workflow.totalCost < 0.01 && workflow.totalCost > 0 ? workflow.totalCost.toFixed(5) : workflow.totalCost.toFixed(2)} total cost
            </p>
          </div>

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
        </div>

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
                  currentCalls={workflow.callCount}
                  optimizedCalls={42} // This should be calculated from backend data if available, or estimated
                />
              </div>

              {/* Savings Projector */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <SavingsProjector
                  currentCost={workflow.totalCost}
                  optimizedCost={workflow.optimizedCost}
                />
              </div>

              {/* Actions */}
              <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <Button variant="outline" className="gap-2" disabled>
                  <GitBranch className="w-4 h-4" />
                  View Dependency Graph
                </Button>
              </div>

              {/* Findings Section */}
              <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <h2 className="text-xl font-semibold text-foreground">The Three Sins</h2>
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
                // LOADING STATE
                <>
                  <div className="p-4 rounded-full bg-primary/10 animate-pulse">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Analyzing Workflow...
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      Kaizen is analyzing your agent's tokens and costs. This usually takes just a few seconds.
                    </p>
                  </div>
                </>
              ) : workflow.callCount === 0 ? (
                // EMPTY STATE (No events yet)
                <>
                  <div className="p-4 rounded-full bg-muted">
                    <Clock className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Waiting for Events
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      No AI events detected yet. Run your agent script to generate data.
                    </p>
                  </div>
                  {/* Optional Refresh Button */}
                  <Button variant="outline" onClick={fetchData} className="mt-4">
                    Refresh Data
                  </Button>
                </>
              ) : (
                // MANUAL RETRY (Analyzed failed or pending call)
                <>
                  <div className="p-4 rounded-full bg-score-warning/10">
                    <AlertTriangle className="w-10 h-10 text-score-warning" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      Analysis Required
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      This workflow is ready for analysis.
                    </p>
                  </div>
                  <Button onClick={handleAnalyze} size="lg" className="mt-2">
                    <Play className="w-4 h-4 mr-2" /> Start Analysis
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
