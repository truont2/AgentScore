import { cn } from '@/lib/utils';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  optimizedScore?: number;
}

const getScoreColor = (score: number): string => {
  if (score >= 71) return 'text-score-good';
  if (score >= 41) return 'text-score-warning';
  return 'text-score-poor';
};

const getScoreStrokeColor = (score: number): string => {
  if (score >= 71) return 'stroke-score-good';
  if (score >= 41) return 'stroke-score-warning';
  return 'stroke-score-poor';
};

export function ScoreGauge({ score, size = 'lg', showLabel = true, optimizedScore }: ScoreGaugeProps) {
  const sizes = {
    sm: { width: 80, strokeWidth: 6, fontSize: 'text-xl', labelSize: 'text-xs' },
    md: { width: 120, strokeWidth: 8, fontSize: 'text-3xl', labelSize: 'text-sm' },
    lg: { width: 200, strokeWidth: 12, fontSize: 'text-5xl', labelSize: 'text-base' },
  };

  const { width, strokeWidth, fontSize, labelSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width, height: width }}>
        <svg
          width={width}
          height={width}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            className={cn('transition-all duration-1000 ease-out', getScoreStrokeColor(score))}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold', fontSize, getScoreColor(score))}>
            {score}
          </span>
          {showLabel && (
            <span className={cn('text-muted-foreground', labelSize)}>
              / 100
            </span>
          )}
        </div>
      </div>

      {optimizedScore && optimizedScore !== score && (
        <div className="flex items-center gap-2 text-sm">
          <span className={cn('font-semibold', getScoreColor(score))}>{score}</span>
          <span className="text-muted-foreground">→</span>
          <span className={cn('font-semibold', getScoreColor(optimizedScore))}>{optimizedScore}</span>
        </div>
      )}
    </div>
  );
}
