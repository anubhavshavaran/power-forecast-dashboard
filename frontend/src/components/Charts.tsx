import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyMetrics, ErrorDistributionBin, ForecastPoint } from "../types/api";
import { formatChartTime, formatCompactMw, formatDay } from "../utils/format";

const tooltipStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  fontSize: "12px",
};

export function ForecastChart({ points }: { points: ForecastPoint[] }) {
  return (
    <div className="h-80 px-2 pb-4 pt-4 sm:px-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="start_time"
            tickFormatter={(value: string) => formatChartTime(value)}
            minTickGap={44}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCompactMw}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip labelFormatter={(value) => formatChartTime(String(value), true)} contentStyle={tooltipStyle} />
          <Legend />
          <Line type="monotone" dataKey="actual_mw" name="Actual generation" stroke="#0f766e" strokeWidth={2.2} dot={false} connectNulls />
          <Line type="monotone" dataKey="forecast_mw" name="Selected forecast" stroke="#2563eb" strokeWidth={2.2} dot={false} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyAccuracyChart({ daily }: { daily: DailyMetrics[] }) {
  return (
    <div className="h-72 px-2 pb-4 pt-4 sm:px-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis tickFormatter={formatCompactMw} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip labelFormatter={(value) => formatDay(String(value))} contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="mae_mw" name="Daily MAE" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
          <Bar dataKey="rmse_mw" name="Daily RMSE" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ErrorDistributionChart({ bins }: { bins: ErrorDistributionBin[] }) {
  return (
    <div className="h-72 px-2 pb-4 pt-4 sm:px-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 8, right: 12, bottom: 20, left: 4 }}>
          <CartesianGrid stroke="#e8edf3" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            angle={-28}
            textAnchor="end"
            interval={0}
            tick={{ fill: "#64748b", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Periods" fill="#14b8a6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

