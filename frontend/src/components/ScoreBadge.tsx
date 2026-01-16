import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ScoreBadgeProps {
  score: number | null;
  size?: 'sm' | 'md';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
        —
      </Badge>
    );
  }

  const getStyles = () => {
    if (score >= 71) {
      return 'bg-score-good/15 text-score-good border-score-good/30 hover:bg-score-good/20';
    }
    if (score >= 41) {
      return 'bg-score-warning/15 text-score-warning border-score-warning/30 hover:bg-score-warning/20';
    }
    return 'bg-score-poor/15 text-score-poor border-score-poor/30 hover:bg-score-poor/20';
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-semibold',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        getStyles()
      )}
    >
      {score}
    </Badge>
  );
}
