import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Calculator,
  ChevronRight,
  CloudCog,
  LayoutDashboard,
  Menu,
  Wind,
  X,
} from "lucide-react";

import { DataState } from "./components/DataState";
import { DateRangeControls } from "./components/DateRangeControls";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { AccuracyPage } from "./pages/AccuracyPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForecastAnalysisPage } from "./pages/ForecastAnalysisPage";
import { MethodologyPage } from "./pages/MethodologyPage";
import { ProcurementPage } from "./pages/ProcurementPage";

type Page = "dashboard" | "forecasts" | "accuracy" | "procurement" | "methodology";

const navigation: Array<{ id: Page; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "forecasts", label: "Forecast analysis", icon: Wind },
  { id: "accuracy", label: "Accuracy analysis", icon: BarChart3 },
  { id: "procurement", label: "Procurement calculator", icon: Calculator },
  { id: "methodology", label: "Methodology", icon: BookOpen },
];

const titles: Record<Page, { eyebrow: string; title: string; description: string }> = {
  dashboard: { eyebrow: "Operations dashboard", title: "Wind forecast intelligence", description: "Evaluate day-ahead wind forecasts against GB actual generation." },
  forecasts: { eyebrow: "Analysis workspace", title: "Forecast performance", description: "Inspect selected historical publications and their target periods." },
  accuracy: { eyebrow: "Analysis workspace", title: "Accuracy diagnostics", description: "Quantify error, coverage, and directional bias from matched observations." },
  procurement: { eyebrow: "Decision support", title: "Procurement illustration", description: "Explore an assumed-demand shortfall against selected wind generation." },
  methodology: { eyebrow: "Governance", title: "Methodology & limitations", description: "Sources, selection rules, and analytical boundaries." },
};

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [start, setStart] = useState("2026-01-01");
  const [end, setEnd] = useState("2026-01-31");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const analytics = useAnalyticsData(start, end);
  const title = titles[page];

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setMobileNavOpen(false);
  }

  function renderPage() {
    if (page === "methodology") return <MethodologyPage cutoffHour={analytics.health?.decision_cutoff_hour_utc ?? 13} />;
    if (!analytics.forecasts || !analytics.metrics || !analytics.daily) return null;
    if (page === "dashboard") return <DashboardPage points={analytics.forecasts.points} metrics={analytics.metrics} daily={analytics.daily.daily} />;
    if (page === "forecasts") return <ForecastAnalysisPage points={analytics.forecasts.points} />;
    if (page === "accuracy") return <AccuracyPage metrics={analytics.metrics} daily={analytics.daily.daily} />;
    return <ProcurementPage points={analytics.forecasts.points} />;
  }

  return (
    <div className="min-h-screen bg-mist text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-950 px-4 py-5 text-slate-300 lg:flex">
        <Brand />
        <nav className="mt-10 space-y-1" aria-label="Primary navigation">
          {navigation.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} />)}
        </nav>
        <div className="mt-auto rounded-xl border border-slate-700/70 bg-navy-900 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-300"><CloudCog className="h-4 w-4" /> Elexon cache-backed</div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Analytics remain explicit when historical source data has not been loaded.</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-mist/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setMobileNavOpen((open) => !open)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden" aria-label="Toggle navigation">
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><span>UK portfolio</span><ChevronRight className="h-3.5 w-3.5" /><span className="font-medium text-slate-700">January 2026 historical view</span></div>
            <DateRangeControls start={start} end={end} onStartChange={setStart} onEndChange={setEnd} />
          </div>
          {mobileNavOpen && <nav className="mt-3 grid gap-1 border-t border-slate-200 pt-3 lg:hidden" aria-label="Mobile primary navigation">{navigation.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} mobile />)}</nav>}
        </header>

        <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
          <section className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{title.eyebrow}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{title.description}</p>
            </div>
            {analytics.metrics && page !== "methodology" && <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><p className="text-xs text-slate-500">Evaluation coverage</p><p className="mt-1 text-sm font-semibold text-ink">{analytics.metrics.metrics.valid_pairs.toLocaleString()} valid pairs</p></div>}
          </section>
          {page === "methodology" ? renderPage() : <DataState loading={analytics.loading} error={analytics.error} onRetry={analytics.retry}>{renderPage()}</DataState>}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return <div className="flex items-center gap-3 px-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400 text-navy-950"><Wind className="h-5 w-5" /></div><div><p className="text-sm font-semibold tracking-tight text-white">Northstar Wind</p><p className="text-[11px] text-slate-400">Forecast intelligence</p></div></div>;
}

function NavButton({ item, active, onClick, mobile = false }: { item: { id: Page; label: string; icon: typeof LayoutDashboard }; active: boolean; onClick: () => void; mobile?: boolean }) {
  const Icon = item.icon;
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-blue-500/15 font-semibold text-white" : mobile ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon className={`h-4 w-4 ${active ? "text-teal-300" : ""}`} />{item.label}</button>;
}

