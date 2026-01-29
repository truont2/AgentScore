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
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                How often does this workflow run?
            </p>

            <div className="flex items-center gap-3">
                <Input
                    type="number"
                    value={frequency}
                    onChange={(e) => onFrequencyChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28 bg-background border-border text-foreground font-mono text-lg"
                    min={1}
                />
                <span className="text-muted-foreground">runs per</span>
                <Select value={period} onValueChange={(v) => onPeriodChange(v as TimePeriod)}>
                    <SelectTrigger className="w-28 bg-background border-border">
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

            <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                    <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onFrequencyChange(preset.frequency);
                            onPeriodChange(preset.period);
                        }}
                        className={
                            frequency === preset.frequency && period === preset.period
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:text-foreground'
                        }
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>
        </div>
    );
}
