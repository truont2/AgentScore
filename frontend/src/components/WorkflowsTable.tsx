import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScoreBadge } from './ScoreBadge';
import { StatusBadge } from './StatusBadge';
import type { Workflow } from '@/types';
import { Button } from '@/components/ui/button';

interface WorkflowsTableProps {
  workflows: Workflow[];
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkflowsTable({ workflows }: WorkflowsTableProps) {
  const navigate = useNavigate();

  // Display workflows directly
  const displayWorkflows = workflows;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="text-muted-foreground">Workflow</TableHead>
            <TableHead className="text-muted-foreground">Timestamp</TableHead>
            <TableHead className="text-muted-foreground text-center">AI Calls</TableHead>
            <TableHead className="text-muted-foreground text-right">Cost</TableHead>
            <TableHead className="text-muted-foreground text-center">Score</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-right sr-only">Actions</TableHead>

          </TableRow>
        </TableHeader>
        <TableBody>
          {displayWorkflows.map((workflow) => (
            <TableRow
              key={workflow.id}
              className="border-border"
            >
              <TableCell className="font-medium text-foreground">
                {workflow.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatTimestamp(workflow.timestamp)}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {workflow.callCount}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground">
                ${workflow.totalCost.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={workflow.efficiencyScore} />
              </TableCell>
              <TableCell>
                <StatusBadge status={workflow.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant={workflow.status === 'analyzed' ? "secondary" : "default"}
                    size="sm"
                    className="h-8 text-xs font-medium transition-all shadow-sm hover:shadow hover:scale-[1.02] hover:bg-primary/90 data-[variant=secondary]:hover:bg-secondary/80"
                    onClick={() => navigate(`/workflow/${workflow.id}`)}
                  >
                    See Details
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
