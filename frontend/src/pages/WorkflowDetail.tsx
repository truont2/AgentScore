import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import WorkflowGraph from "@/components/WorkflowGraph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, DollarSign, Activity, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GraphData {
    nodes: any[];
    edges: any[];
    metrics: {
        dead_branch_cost: number;
        critical_path_latency: number;
        info_efficiency: number;
    };
}

export default function WorkflowDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workflow, setWorkflow] = useState<any>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [wfRes, graphRes] = await Promise.all([
                    fetch(`http://127.0.0.1:8000/workflows/${id}`),
                    fetch(`http://127.0.0.1:8000/workflows/${id}/graph`)
                ]);

                if (wfRes.ok) setWorkflow(await wfRes.json());
                if (graphRes.ok) setGraphData(await graphRes.json());
            } catch (err) {
                console.error("Failed to fetch workflow details:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading workflow details...</div>;
    if (!workflow) return <div className="p-8 text-center text-red-500">Workflow not found.</div>;

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-6 py-8">
                {/* Breadcrumbs / Back */}
                <Button
                    variant="ghost"
                    className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/dashboard')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-foreground">{workflow.name || 'Untitled Workflow'}</h1>
                            <Badge variant="outline" className="h-6">{workflow.status}</Badge>
                        </div>
                        <p className="text-muted-foreground font-mono text-sm">{id}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline">Download Report</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">Re-run Analysis</Button>
                    </div>
                </div>

                {/* Graph Metrics (Static Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Total Cost"
                        value={`$${workflow.total_cost?.toFixed(4) || '0.00'}`}
                        icon={<DollarSign className="w-4 h-4" />}
                    />
                    <StatCard
                        title="Critical Path"
                        value={`${graphData?.metrics.critical_path_latency || workflow.latency_ms || 0}ms`}
                        icon={<Clock className="w-4 h-4" />}
                    />
                    <StatCard
                        title="Dead Branch Waste"
                        value={`$${graphData?.metrics.dead_branch_cost.toFixed(4) || '0.00'}`}
                        icon={<Activity className="w-4 h-4 text-rose-500" />}
                    />
                    <StatCard
                        title="Info Efficiency"
                        value={`${graphData?.metrics.info_efficiency.toFixed(1) || 0}%`}
                        icon={<Info className="w-4 h-4 text-indigo-500" />}
                    />
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="graph" className="w-full">
                    <TabsList className="bg-muted/50 border border-border p-1">
                        <TabsTrigger value="graph" className="data-[state=active]:bg-background">Execution Graph</TabsTrigger>
                        <TabsTrigger value="events" className="data-[state=active]:bg-background">Raw Events</TabsTrigger>
                    </TabsList>

                    <TabsContent value="graph" className="mt-6">
                        <Card className="border-border bg-card overflow-hidden">
                            <CardHeader className="border-b bg-muted/30">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-500" />
                                    Dependency Graph
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
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="events" className="mt-6">
                        <Card className="border-border bg-card">
                            <CardHeader className="border-b">
                                <CardTitle className="text-lg">Event Log</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border">
                                    {workflow.events?.map((e: any, i: number) => (
                                        <div key={e.run_id} className="p-4 hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-xs font-bold text-emerald-600">CALL #{i + 1}</span>
                                                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Prompt</p>
                                                    <div className="p-2 rounded bg-muted font-mono text-xs max-h-24 overflow-y-auto whitespace-pre-wrap">
                                                        {e.prompt}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Response</p>
                                                    <div className="p-2 rounded bg-emerald-500/5 font-mono text-xs max-h-24 overflow-y-auto whitespace-pre-wrap">
                                                        {e.response}
                                                    </div>
                                                </div>
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
