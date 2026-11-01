import { Clock3, Database } from "lucide-react";

import { ForecastChart } from "../components/Charts";
import { Panel } from "../components/Panel";
import type { ForecastPoint } from "../types/api";
import { formatMw, formatPercent, formatTimestamp } from "../utils/format";

export function ForecastAnalysisPage({ points }: { points: ForecastPoint[] }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <Clock3 className="h-5 w-5 text-blue-600" />
          <h2 className="mt-3 text-sm font-semibold text-ink">Two timestamps, two meanings</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Target time is the half-hour delivery period. Publication time records when Elexon made the forecast available; only publications at or before the cutoff can be selected.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <Database className="h-5 w-5 text-teal-600" />
          <h2 className="mt-3 text-sm font-semibold text-ink">Paired observations only</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Forecast errors are shown where valid actuals exist. Missing values remain visible as missing and are never converted to zero.</p>
        </div>
      </section>

      <Panel title="Generation time series" subtitle="Selected historical forecast and FUELHH national WIND actual generation in MW.">
        <ForecastChart points={points} />
      </Panel>

      <Panel title="Forecast matching detail" subtitle="Rows are ordered by target period. Positive error means the forecast overestimated wind generation.">
        <div className="max-h-[560px] overflow-auto">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Target time (UTC)</th>
                <th className="px-4 py-3 font-semibold">Selected publication (UTC)</th>
                <th className="px-4 py-3 text-right font-semibold">Forecast</th>
                <th className="px-4 py-3 text-right font-semibold">Actual</th>
                <th className="px-4 py-3 text-right font-semibold">Error</th>
                <th className="px-4 py-3 text-right font-semibold">Abs. % error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {points.map((point) => (
                <tr key={point.start_time} className="hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{formatTimestamp(point.start_time)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatTimestamp(point.forecast_publish_time)}</td>
                  <td className="px-4 py-3 text-right">{formatMw(point.forecast_mw)}</td>
                  <td className="px-4 py-3 text-right">{formatMw(point.actual_mw)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${point.forecast_error_mw !== null && point.forecast_error_mw > 0 ? "text-amber-700" : "text-teal-700"}`}>{formatMw(point.forecast_error_mw)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(point.absolute_percentage_error)}</td>
                </tr>
              ))}
              {points.length === 0 && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={6}>No periods are available for this date range.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

