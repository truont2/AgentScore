
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card } from '@/components/ui/card';

interface CostComparisonProps {
  currentCost: number;
  optimizedCost: number;
}

export function CostComparison({ currentCost, optimizedCost }: CostComparisonProps) {
  const savings = currentCost - optimizedCost;
  const savingsPercent = Math.round((savings / currentCost) * 100);

  const data = [
    {
      name: 'Current',
      cost: currentCost,
      fill: '#ef4444', // destructive/red
    },
    {
      name: 'Optimized',
      cost: optimizedCost,
      fill: '#22c55e', // score-good/green
    },
  ];

  return (
    <Card className="p-6 border-border/50">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Cost Projection</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold text-foreground">
            ${optimizedCost.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground line-through">
            ${currentCost.toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-score-good font-medium mt-1">
          Save {savingsPercent}% (${savings.toFixed(2)}) per run
        </p>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={70}
              tick={{ fontSize: 12, fill: '#71717a' }} // text-muted-foreground
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-popover border border-border rounded-lg p-2 shadow-md text-sm">
                      <p className="font-medium text-popover-foreground">
                        ${Number(payload[0].value).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="cost"
              radius={[0, 4, 4, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
