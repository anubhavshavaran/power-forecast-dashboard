export function formatMw(value: number | null, fractionDigits = 0): string {
  return value === null ? "—" : `${value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits })} MW`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value)).replace(",", " ·") + " UTC";
}

export function formatChartTime(value: string, detailed = false): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: detailed ? "2-digit" : undefined,
    month: detailed ? "short" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatCompactMw(value: number): string {
  return `${Math.round(value / 1000)}k`;
}

