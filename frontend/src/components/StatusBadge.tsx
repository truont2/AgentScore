import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'analyzed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="bg-score-warning/10 text-score-warning border-score-warning/30">
        <Clock className="w-3 h-3 mr-1" />
        Pending Analysis
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-score-good/10 text-score-good border-score-good/30">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Analyzed
    </Badge>
  );
}
