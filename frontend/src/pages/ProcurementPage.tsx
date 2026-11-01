import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Calculator, CircleAlert, LoaderCircle } from "lucide-react";

import { Panel } from "../components/Panel";
import { api } from "../services/api";
import type { ForecastPoint, ProcurementResponse } from "../types/api";
import { formatMw, formatTimestamp } from "../utils/format";

export function ProcurementPage({ points }: { points: ForecastPoint[] }) {
  const selectablePoints = points.filter((point) => point.forecast_mw !== null);
  const [targetTime, setTargetTime] = useState("");
  const [demand, setDemand] = useState("30000");
  const [result, setResult] = useState<ProcurementResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetTime && selectablePoints[0]) {
      setTargetTime(selectablePoints[0].start_time);
    }
  }, [selectablePoints, targetTime]);

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const demandMw = Number(demand);
    if (!targetTime || !Number.isFinite(demandMw) || demandMw < 0) {
      setError("Choose a target period and enter a non-negative demand in MW.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setResult(await api.procurement(targetTime, demandMw));
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : "Calculation could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
      <Panel title="Illustrative additional-power calculator" subtitle="A simple MW shortfall calculation; it is not procurement optimisation.">
        <form className="space-y-5 p-5" onSubmit={calculate}>
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="target-time">Delivery period</label>
            <select id="target-time" value={targetTime} onChange={(event) => setTargetTime(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-blue-500 focus:ring-2" disabled={selectablePoints.length === 0}>
              {selectablePoints.map((point) => <option key={point.start_time} value={point.start_time}>{formatTimestamp(point.start_time)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink" htmlFor="demand-mw">Assumed electricity demand (MW)</label>
            <input id="demand-mw" type="number" min="0" step="1" value={demand} onChange={(event) => setDemand(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none ring-blue-500 focus:ring-2" />
          </div>
          <button type="submit" disabled={loading || selectablePoints.length === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Calculate indicative requirement
          </button>
          <p className="text-xs leading-5 text-slate-500">Formula: max(0, assumed demand − selected forecast wind generation). The datasets do not supply demand, prices, other generation, or unit costs.</p>
        </form>
      </Panel>

      <section className="rounded-xl border border-slate-200 bg-white shadow-panel">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Calculation output</h2>
          <p className="mt-1 text-xs text-slate-500">Compare the selected forecast scenario with actual wind generation when available.</p>
        </div>
        <div className="p-5">
          {error && <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div>}
          {!result && !error && <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">Choose a half-hour target and demand assumption to calculate an illustrative additional-power estimate.</div>}
          {result && <Result result={result} />}
        </div>
      </section>
    </div>
  );
}

function Result({ result }: { result: ProcurementResponse }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Selected target period</p>
        <p className="mt-1 text-sm font-semibold text-ink">{formatTimestamp(result.start_time)}</p>
        <p className="mt-1 text-xs text-slate-500">Forecast published {formatTimestamp(result.forecast_publish_time)}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ResultValue label="Assumed demand" value={formatMw(result.demand_mw)} />
        <ResultValue label="Selected forecast wind" value={formatMw(result.forecast_wind_mw)} />
        <ResultValue label="Forecast-based additional power" value={formatMw(result.estimated_additional_power_mw)} emphasis />
        <ResultValue label="Actual wind generation" value={formatMw(result.actual_wind_mw)} />
        <ResultValue label="Actual-implied additional power" value={formatMw(result.actual_implied_additional_power_mw)} emphasis />
        <ResultValue label="Scenario difference" value={formatMw(result.difference_mw)} />
      </div>
      <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">{result.assumption}</p>
    </div>
  );
}

function ResultValue({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-lg border p-4 ${emphasis ? "border-blue-100 bg-blue-50" : "border-slate-100 bg-white"}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-ink">{value}</p></div>;
}

