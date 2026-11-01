import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: "blue" | "teal" | "amber" | "slate";
  icon?: ReactNode;
}

const tones = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function MetricCard({ label, value, detail, tone = "blue", icon }: MetricCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</p>
        {icon && <span className={`rounded-lg p-2 ring-1 ${tones[tone]}`}>{icon}</span>}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </section>
  );
}

