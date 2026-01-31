
import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { WorkflowsTable } from '@/components/WorkflowsTable';
import { workflows as mockWorkflows, type Workflow } from '@/data/mockData';
import { Layers, TrendingUp, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Backend workflow interface 
interface BackendWorkflow {
  id: string;
  name?: string;
  status: string;
  total_calls: number;
  total_cost: number;
  created_at: string;
  efficiency_score?: number;
}

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const response = await fetch('http://localhost:8000/workflows');
        if (!response.ok) throw new Error('Failed to fetch');

        const data: BackendWorkflow[] = await response.json();

        if (data && data.length > 0) {
          setIsConnected(true);
          const mappedWorkflows: Workflow[] = data.map(bw => ({
            id: bw.id,
            name: bw.name || 'Untitled Workflow',
            timestamp: bw.created_at,
            callCount: bw.total_calls || 0,
            totalCost: bw.total_cost || 0,
            optimizedCost: 0, // Placeholder
            efficiencyScore: bw.efficiency_score || null,
            redundancyScore: null,
            modelFitScore: null,
            contextEfficiencyScore: null,
            status: bw.status === 'analyzed' ? 'analyzed' : 'pending',
            redundancyFindings: [],
            modelOverkillFindings: [],
            contextBloatFindings: []
          }));

          setWorkflows(mappedWorkflows);
        } else {
          // Connected but no data
          setIsConnected(true);
        }
      } catch (error) {
        console.warn('Backend connection failed, using mock data:', error);
        setIsConnected(false);
        setWorkflows(mockWorkflows);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkflows();
  }, []);

  // Compute stats based on the currently displayed workflows (real or mock)
  const currentStats = (() => {
    const analyzedWorkflows = workflows.filter((w) => w.status === 'analyzed');
    const totalWorkflows = workflows.length;
    const averageScore = analyzedWorkflows.length > 0
      ? Math.round(analyzedWorkflows.reduce((sum, w) => sum + (w.efficiencyScore || 0), 0) / analyzedWorkflows.length)
      : 0;
    const totalSavings = analyzedWorkflows.reduce((sum, w) => sum + (w.totalCost - w.optimizedCost), 0);

    return {
      totalWorkflows,
      averageScore,
      totalSavings: totalSavings < 0.01 && totalSavings > 0 ? totalSavings.toFixed(5) : totalSavings.toFixed(2),
    };
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Monitor and optimize your AI agent workflows
            </p>
          </div>
          {isConnected && (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500 bg-emerald-500/10">
              Live Connected
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Workflows"
            value={currentStats.totalWorkflows}
            icon={<Layers className="w-5 h-5" />}
          />
          <StatCard
            title="Average Score"
            value={currentStats.averageScore}
            subtitle="/100"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={currentStats.averageScore >= 70 ? 'up' : currentStats.averageScore >= 40 ? 'neutral' : 'down'}
          />
          <StatCard
            title="Total Savings Identified"
            value={`$${currentStats.totalSavings}`}
            subtitle="per run"
            icon={<DollarSign className="w-5 h-5" />}
            trend="up"
          />
        </div>

        {/* Workflows Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Workflows</h2>
          <WorkflowsTable workflows={workflows} />
        </div>
      </main>
    </div>
  );
}
