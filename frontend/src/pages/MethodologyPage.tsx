import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

import { Panel } from "../components/Panel";

export function MethodologyPage({ cutoffHour }: { cutoffHour: number }) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-navy-800 bg-navy-950 px-6 py-6 text-white shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-300">Methodology & controls</p>
        <h2 className="mt-2 text-xl font-semibold">An auditable historical view of wind forecast performance</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">The analytical backend is the single source of truth. The interface renders its selected forecasts, paired observations, metrics, and procurement illustration without recreating the calculations in the browser.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Data sources" subtitle="National Great Britain data published through Elexon Insights.">
          <div className="space-y-4 p-5 text-sm leading-6 text-slate-600">
            <Source name="FUELHH" description="Half-hourly generation outturn by fuel type. The ingestion client filters `fuelType=WIND`, uses `startTime` as target time, and parses `generation` as MW." href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream" />
            <Source name="WINDFOR" description="Wind generation forecast history. The client preserves both `startTime` and `publishTime` and retrieves a publication window beginning in December 2025." href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream" />
          </div>
        </Panel>
        <Panel title="Historical forecast selection" subtitle="Explicitly prevents look-ahead bias.">
          <div className="space-y-4 p-5 text-sm leading-6 text-slate-600">
            <p>For delivery target <strong>t</strong>, this MVP selects the forecast with the latest publication timestamp satisfying <strong>publishTime ≤ cutoff(t)</strong>.</p>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-950"><strong>Configured decision cutoff:</strong> {cutoffHour.toString().padStart(2, "0")}:00 UTC on the calendar day before each delivery day. This is a documented MVP assumption, not an asserted market gate closure.</div>
            <p>All input timestamps are normalized to UTC. Any forecast published after the cutoff is excluded before actuals are joined.</p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Accuracy and missing-data policy" subtitle="Metrics only use valid selected-forecast / actual pairs.">
          <div className="space-y-3 p-5 text-sm leading-6 text-slate-600">
            <Bullet text="Error convention: forecast MW − actual MW. Positive error denotes an overprediction." />
            <Bullet text="MAE is mean absolute error; RMSE is root mean squared error; bias is the mean signed error." />
            <Bullet text="MAPE excludes actual wind at or below 1 MW to avoid division by zero and unstable near-zero ratios." />
            <Bullet text="Malformed, missing, non-finite, and duplicate records are filtered transparently; duplicate actual target periods retain the latest publication." />
            <Bullet text="Coverage reports valid matched pairs against the expected 48 half-hour periods per calendar day." />
          </div>
        </Panel>
        <Panel title="Procurement calculator boundaries" subtitle="A teaching aid, not a trading or dispatch recommendation.">
          <div className="space-y-3 p-5 text-sm leading-6 text-slate-600">
            <Bullet text="Additional-power estimate = max(0, assumed demand MW − selected forecast wind MW)." />
            <Bullet text="Where present, actual wind gives a second scenario under the same simplified assumption." />
            <Bullet text="No electricity demand, price, thermal generation, storage, interconnector, costs, or procurement constraints are included." />
            <Bullet text="The calculator does not estimate actual utility procurement requirements or optimise purchases." />
          </div>
        </Panel>
      </div>

      <section className="flex gap-3 rounded-xl border border-teal-100 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
        <p><strong>Operational note:</strong> raw Elexon responses are cached locally by the ingestion command so dashboard requests do not re-download the complete historical datasets. Cache absence and data retrieval failures are surfaced in the interface rather than replaced with mock data.</p>
      </section>
    </div>
  );
}

function Source({ name, description, href }: { name: string; description: string; href: string }) {
  return <div><a className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900" href={href} target="_blank" rel="noreferrer">{name} endpoint <ExternalLink className="h-3.5 w-3.5" /></a><p className="mt-1">{description}</p></div>;
}

function Bullet({ text }: { text: string }) {
  return <div className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-teal-600" /><p>{text}</p></div>;
}

