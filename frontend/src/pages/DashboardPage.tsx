import { Activity, Gauge, Radar, TrendingUp } from "lucide-react";

import { ForecastChart } from "../components/Charts";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import type { DailyMetrics, ForecastPoint, MetricsResponse } from "../types/api";
import { formatMw, formatPercent, formatTimestamp } from "../utils/format";

interface DashboardPageProps {
  points: ForecastPoint[];
  metrics: MetricsResponse;
  daily: DailyMetrics[];
}

export function DashboardPage({ points, metrics, daily }: DashboardPageProps) {
  const latest = [...points].reverse().find((point) => point.forecast_mw !== null);
  const summary = metrics.metrics;

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-blue-700">Decision intelligence</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">January 2026 wind forecast evaluation</h2>
          <p className="mt-1 text-sm text-slate-600">Historical selection is enforced by the backend before each forecast is matched to actual generation.</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-right">
          <p className="text-xs font-medium text-slate-500">Latest target in view</p>
          <p className="mt-1 text-sm font-semibold text-ink">{formatTimestamp(latest?.start_time ?? null)}</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Mean absolute error" value={formatMw(summary.mae_mw)} detail="Average absolute forecast deviation" tone="blue" icon={<Activity className="h-4 w-4" />} />
        <MetricCard label="RMSE" value={formatMw(summary.rmse_mw)} detail="Larger errors receive more weight" tone="teal" icon={<Gauge className="h-4 w-4" />} />
        <MetricCard label="Forecast bias" value={formatMw(summary.bias_mw)} detail="Positive = overprediction" tone="amber" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Data coverage" value={formatPercent(summary.coverage_percent)} detail={`${summary.valid_pairs.toLocaleString()} valid pairs of ${summary.expected_periods.toLocaleString()}`} tone="slate" icon={<Radar className="h-4 w-4" />} />
      </div>

      <Panel title="Selected forecast versus actual generation" subtitle="MW by half-hour target period. Forecasts published after the configured decision cutoff are excluded.">
        <ForecastChart points={points} />
      </Panel>

      <Panel title="Recent daily accuracy" subtitle="Daily average absolute error and valid matched forecast-actual pairs.">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Delivery day</th>
                <th className="px-5 py-3 font-semibold">MAE</th>
                <th className="px-5 py-3 font-semibold">Bias</th>
                <th className="px-5 py-3 font-semibold">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {daily.slice(-7).reverse().map((row) => (
                <tr key={row.date}>
                  <td className="px-5 py-3 font-medium text-ink">{row.date}</td>
                  <td className="px-5 py-3">{formatMw(row.mae_mw)}</td>
                  <td className="px-5 py-3">{formatMw(row.bias_mw)}</td>
                  <td className="px-5 py-3">{formatPercent(row.coverage_percent)}</td>
                </tr>
              ))}
              {daily.length === 0 && (
                <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={4}>No matched daily data is available for this range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

