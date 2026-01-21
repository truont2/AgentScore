import { useNavigate } from 'react-router-dom';
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
import type { Workflow } from '@/data/mockData';
import { ChevronRight } from 'lucide-react';

interface WorkflowsTableProps {
  workflows: Workflow[];
}

import { demoLegacy, demoOptimized } from '@/data/mockData';

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

  // Prepend demo workflows
  const displayWorkflows = [demoLegacy, demoOptimized, ...workflows];

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
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayWorkflows.map((workflow) => (
            <TableRow
              key={workflow.id}
              className="cursor-pointer hover:bg-muted/30 border-border transition-colors"
              onClick={() => navigate(`/workflow/${workflow.id}`)}
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
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
