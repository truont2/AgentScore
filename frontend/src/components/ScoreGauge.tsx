import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface ScoreGaugeProps {
  score: number;
  potentialScore?: number;
}

const getScoreStatus = (score: number): 'good' | 'warning' | 'poor' => {
  if (score >= 80) return 'good';
  if (score >= 50) return 'warning';
  return 'poor';
};



export function ScoreGauge({ score, potentialScore = 100 }: ScoreGaugeProps) {
  const status = getScoreStatus(score);

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
      <div className="text-center mb-6">
        <div className="flex items-end justify-center gap-6">
          {/* Current Score Column */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "text-xs uppercase tracking-widest font-medium mb-1",
              status === 'good' && 'text-score-good',
              status === 'warning' && 'text-score-warning',
              status === 'poor' && 'text-score-poor'
            )}>
              Current
            </div>
            <div className={cn(
              'text-6xl font-semibold font-mono tracking-tighter', // Normalized size
              status === 'good' && 'text-score-good',
              status === 'warning' && 'text-score-warning',
              status === 'poor' && 'text-score-poor score-pulse'
            )}>
              {displayScore}
            </div>
          </div>

          {potentialScore > score && (
            <>
              {/* Arrow centered vertically with the numbers */}
              <ArrowRight className="w-8 h-8 text-muted-foreground/30 mb-4" />

              {/* Potential Score Column */}
              <div className="flex flex-col items-center">
                <div className="text-xs uppercase tracking-widest font-medium text-score-good mb-1">
                  Potential
                </div>
                <div className="text-6xl font-semibold font-mono tracking-tighter text-score-good opacity-90">
                  {potentialScore}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Track Visualization */}
      <div className="relative mt-4">
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
          {/* Ghost Bar (Potential) - Stacked behind the main bar */}
          {potentialScore > score && (
            <div
              className="absolute top-0 left-0 h-full bg-score-good/30 transition-all duration-1000 ease-out rounded-full"
              style={{ width: `${potentialScore}%` }}
            />
          )}

          {/* Main Bar (Current) */}
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-out rounded-full relative z-10',
              status === 'good' && 'bg-score-good',
              status === 'warning' && 'bg-score-warning',
              status === 'poor' && 'bg-score-poor'
            )}
            style={{ width: `${displayScore}%` }}
          />
        </div>

        {/* Position marker (Arrow) */}
        {/* Arrow pointing DOWN at the bar from ABOVE */}
        <div
          className={cn(
            'absolute -top-3 -ml-[6px] w-0 h-0 transition-all duration-1000 z-20',
            // CSS Triangle construction
            'border-l-[6px] border-l-transparent',
            'border-r-[6px] border-r-transparent',
            'border-t-[8px]', // The top border creates the downward pointing triangle
            status === 'good' && 'border-t-score-good',
            status === 'warning' && 'border-t-score-warning',
            status === 'poor' && 'border-t-score-poor'
          )}
          style={{ left: `${displayScore}%` }}
        />

        {/* Scale labels */}
        <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-mono">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>


    </div>
  );
}
