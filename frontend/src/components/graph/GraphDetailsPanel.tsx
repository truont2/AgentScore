import { type GraphCall } from '@/data/dependencyGraphData';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MousePointer2, AlertTriangle, Zap, Clock, Coins, Hash, Cpu } from 'lucide-react';
// import { cn } from '@/lib/utils';

interface GraphDetailsPanelProps {
  selectedCall: GraphCall | null;
}

const GraphDetailsPanel = ({ selectedCall }: GraphDetailsPanelProps) => {
  if (!selectedCall) {
    return (
      <Card className="p-6 bg-card border-border/50 h-full flex flex-col items-center justify-center text-center">
        <MousePointer2 className="w-10 h-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground font-medium">Click a node to see details</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          View model, cost, latency, and more
        </p>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (selectedCall.isDeadBranch) {
      return (
        <Badge variant="destructive" className="text-xs">
          DEAD BRANCH
        </Badge>
      );
    }
    if (selectedCall.isCriticalPath) {
      return (
        <Badge className="bg-score-warning/20 text-score-warning border-score-warning/30 text-xs">
          CRITICAL PATH
        </Badge>
      );
    }
    return (
      <Badge className="bg-score-good/20 text-score-good border-score-good/30 text-xs">
        NORMAL
      </Badge>
    );
  };

  const stats = [
    { icon: Cpu, label: 'Model', value: selectedCall.model },
    { icon: Coins, label: 'Cost', value: `$${selectedCall.cost.toFixed(2)}` },
    { icon: Clock, label: 'Latency', value: `${selectedCall.latency.toFixed(1)}s` },
    { icon: Hash, label: 'Tokens', value: selectedCall.tokens.toLocaleString() },
  ];

  return (
    <Card className="p-4 bg-card border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Call Details</h3>
        {getStatusBadge()}
      </div>

      <div className="mb-4">
        <p className="text-lg font-semibold text-foreground">{selectedCall.agent}</p>
        <p className="text-sm text-muted-foreground mt-1">{selectedCall.task}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-3 rounded-lg bg-secondary/50 border border-border/30"
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-sm font-mono font-medium text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {selectedCall.isDeadBranch && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Output Never Used</p>
              <p className="text-xs text-muted-foreground mt-1">
                This call's output was never consumed by any downstream call. Consider removing it or connecting its output to other agents.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedCall.isCriticalPath && !selectedCall.isDeadBranch && (
        <div className="p-3 rounded-lg bg-score-warning/10 border border-score-warning/30">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-score-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-score-warning">On Critical Path</p>
              <p className="text-xs text-muted-foreground mt-1">
                This call is on the slowest path through the workflow. Optimizing it will directly reduce total latency.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default GraphDetailsPanel;
