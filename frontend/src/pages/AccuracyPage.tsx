import { BadgeInfo, ChartNoAxesCombined, Percent, Scale } from "lucide-react";

import { DailyAccuracyChart, ErrorDistributionChart } from "../components/Charts";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import type { DailyMetrics, MetricsResponse } from "../types/api";
import { formatMw, formatPercent } from "../utils/format";

export function AccuracyPage({ metrics, daily }: { metrics: MetricsResponse; daily: DailyMetrics[] }) {
  const summary = metrics.metrics;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MAE" value={formatMw(summary.mae_mw)} detail="Mean absolute error" icon={<Scale className="h-4 w-4" />} />
        <MetricCard label="RMSE" value={formatMw(summary.rmse_mw)} detail="Root mean squared error" tone="teal" icon={<ChartNoAxesCombined className="h-4 w-4" />} />
        <MetricCard label="MAPE" value={formatPercent(summary.mape_percent)} detail={`${summary.mape_pairs.toLocaleString()} eligible non-near-zero periods`} tone="amber" icon={<Percent className="h-4 w-4" />} />
        <MetricCard label="Bias" value={formatMw(summary.bias_mw)} detail="Positive means overprediction" tone="slate" icon={<BadgeInfo className="h-4 w-4" />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Daily accuracy trend" subtitle="MAE and RMSE calculated by the backend from matched observations.">
          <DailyAccuracyChart daily={daily} />
        </Panel>
        <Panel title="Forecast-error distribution" subtitle="Forecast minus actual generation. Positive values indicate overprediction.">
          <ErrorDistributionChart bins={summary.error_distribution} />
        </Panel>
      </div>

      <Panel title="How to read these metrics" subtitle="All values use MW except MAPE.">
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricDefinition title="MAE" text="Average absolute difference between selected forecast and actual output." />
          <MetricDefinition title="RMSE" text="Error measure that gives relatively greater weight to large misses." />
          <MetricDefinition title="MAPE" text="Average relative error. Actual wind at or below 1 MW is excluded to avoid division by zero and unstable ratios." />
          <MetricDefinition title="Bias" text="Average signed error. Positive values overpredict, negative values underpredict." />
        </div>
      </Panel>
    </div>
  );
}

function MetricDefinition({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
}

