import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
  potentialScore?: number;
}

const getScoreStatus = (score: number): 'good' | 'warning' | 'poor' => {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
};

const getLetterGrade = (score: number): string => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

export function ScoreGauge({ score, potentialScore = 100 }: ScoreGaugeProps) {
  const status = getScoreStatus(score);
  const grade = getLetterGrade(score);
  const [displayScore, setDisplayScore] = useState(0);

  // Animated count-up effect
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(score);
        clearInterval(timer);
      } else {
        setDisplayScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="space-y-6">
      {/* Large Score Display */}
      <div className="text-center">
        <div className={cn(
          'text-7xl font-semibold font-mono tracking-tighter',
          status === 'good' && 'text-score-good',
          status === 'warning' && 'text-score-warning',
          status === 'poor' && 'text-score-poor score-pulse'
        )}>
          {displayScore}
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">
          Efficiency Score
        </div>
      </div>

      {/* Track Visualization */}
      <div className="relative">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-out rounded-full',
              status === 'good' && 'bg-score-good',
              status === 'warning' && 'bg-score-warning',
              status === 'poor' && 'bg-score-poor'
            )}
            style={{ width: `${displayScore}%` }}
          />
        </div>
        {/* Position marker */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background transition-all duration-1000',
            status === 'good' && 'bg-score-good',
            status === 'warning' && 'bg-score-warning',
            status === 'poor' && 'bg-score-poor'
          )}
          style={{ left: `calc(${displayScore}% - 6px)` }}
        />
        {/* Scale labels */}
        <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-mono">
          <span>0</span>
          <span>{displayScore}</span>
          <span>100</span>
        </div>
      </div>

      {/* Grade */}
      <div className="text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Grade: </span>
        <span className={cn(
          'text-sm font-semibold',
          status === 'good' && 'text-score-good',
          status === 'warning' && 'text-score-warning',
          status === 'poor' && 'text-score-poor'
        )}>
          {grade}
        </span>
      </div>

      {/* Potential indicator */}
      {potentialScore > score && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Current</span>
          <div className="flex-1 h-px bg-gradient-to-r from-border via-muted-foreground/30 to-score-good/50" />
          <span className="text-xs text-score-good font-medium">{potentialScore} potential</span>
        </div>
      )}
    </div>
  );
}
