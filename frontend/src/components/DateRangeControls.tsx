import { CalendarDays } from "lucide-react";

interface DateRangeControlsProps {
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export function DateRangeControls({ start, end, onStartChange, onEndChange }: DateRangeControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <CalendarDays className="h-4 w-4 text-slate-500" />
      <label className="sr-only" htmlFor="range-start">Evaluation start date</label>
      <input
        id="range-start"
        type="date"
        value={start}
        onChange={(event) => onStartChange(event.target.value)}
        className="bg-transparent text-xs font-medium text-slate-700 outline-none"
      />
      <span className="text-slate-300">—</span>
      <label className="sr-only" htmlFor="range-end">Evaluation end date</label>
      <input
        id="range-end"
        type="date"
        value={end}
        onChange={(event) => onEndChange(event.target.value)}
        className="bg-transparent text-xs font-medium text-slate-700 outline-none"
      />
    </div>
  );
}

