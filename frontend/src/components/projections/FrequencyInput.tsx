import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export type TimePeriod = 'hour' | 'day' | 'week' | 'month' | 'year';

interface FrequencyInputProps {
    frequency: number;
    period: TimePeriod;
    onFrequencyChange: (value: number) => void;
    onPeriodChange: (value: TimePeriod) => void;
}

const presets = [
    { label: '10/day', frequency: 10, period: 'day' as TimePeriod },
    { label: '100/day', frequency: 100, period: 'day' as TimePeriod },
    { label: '1K/day', frequency: 1000, period: 'day' as TimePeriod },
    { label: '10K/day', frequency: 10000, period: 'day' as TimePeriod },
];

export function FrequencyInput({
    frequency,
    period,
    onFrequencyChange,
    onPeriodChange,
}: FrequencyInputProps) {
    return (
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-md shadow-sm">
                <Input
                    type="number"
                    value={frequency}
                    onChange={(e) => onFrequencyChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 border-0 focus-visible:ring-0 bg-transparent text-right font-mono text-base h-8 px-2"
                    min={1}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium px-1">runs /</span>
                <Select value={period} onValueChange={(v) => onPeriodChange(v as TimePeriod)}>
                    <SelectTrigger className="w-24 border-0 focus:ring-0 bg-transparent h-8 text-sm px-2 shadow-none">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-2">
                {presets.map((preset) => (
                    <Button
                        key={preset.label}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            onFrequencyChange(preset.frequency);
                            onPeriodChange(preset.period);
                        }}
                        className={
                            frequency === preset.frequency && period === preset.period
                                ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary font-medium h-8 text-xs'
                                : 'text-muted-foreground hover:text-foreground h-8 text-xs'
                        }
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
        </div>

    );
}
