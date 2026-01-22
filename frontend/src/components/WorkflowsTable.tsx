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
import { ChevronRight, Search } from 'lucide-react';
import { Button } from './ui/button';

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
          {workflows.map((workflow) => (
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/workflow/${workflow.id}`); // This now defaults to Graph tab
                    }}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
