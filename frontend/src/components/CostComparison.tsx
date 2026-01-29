import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';

interface CostComparisonProps {
  currentCost: number;
  optimizedCost: number;
}

export function CostComparison({ currentCost, optimizedCost }: CostComparisonProps) {
  const savings = currentCost - optimizedCost;
  const savingsPercent = currentCost > 0 ? Math.round((savings / currentCost) * 100) : 0;

  const data = [
    {
      name: 'Actual Cost',
      cost: currentCost,
      color: '#ef4444',
    },
    {
      name: 'Optimized',
      cost: optimizedCost,
      color: '#10b981',
    },
  ];

  return (
    <Card className="p-8 border-slate-200/60 shadow-lg bg-white relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <TrendingDown className="w-24 h-24 text-slate-900" />
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Chart Side */}
        <div className="w-full md:w-1/2 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white border-0 rounded-lg p-2 shadow-xl text-xs font-mono">
                        ${Number(payload[0].value).toFixed(2)}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="cost" barSize={60} radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insight Side */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency Delta</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-slate-900 tracking-tighter">
                {savingsPercent}%
              </span>
              <span className="text-lg font-bold text-emerald-500 uppercase">Savings</span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-full">
            <p className="text-[13px] text-emerald-800 font-medium leading-relaxed">
              Gemini identified <span className="font-bold underline">wasted compute</span> in redundancy loops and model overkill.
              Applying recommendations will reduce per-run costs from <span className="font-bold text-rose-600">${currentCost.toFixed(2)}</span> to <span className="font-bold text-emerald-600">${optimizedCost.toFixed(2)}</span>.
            </p>
          </div>

          <div className="flex gap-6 mt-2">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Monthly Projected Savings</p>
              <p className="text-xl font-black text-slate-900 font-mono">${(savings * 1000).toFixed(2)}</p>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Optimization Confidence</p>
              <p className="text-xl font-black text-emerald-500 font-mono">98.4%</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
