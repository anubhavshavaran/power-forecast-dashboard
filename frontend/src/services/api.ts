import type {
  DailyMetricsResponse,
  ForecastResponse,
  HealthResponse,
  MetricsResponse,
  ProcurementResponse,
} from "../types/api";

const baseUrl = import.meta.env.BASE_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`${baseUrl}${path}${query ? `?${query}` : ""}`);
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail = typeof payload === "object" && payload !== null && "detail" in payload
      ? String(payload.detail)
      : `Request failed with HTTP ${response.status}`;
    throw new ApiError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

function dates(start: string, end: string): URLSearchParams {
  return new URLSearchParams({ start, end });
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  forecasts: (start: string, end: string) => request<ForecastResponse>("/forecasts", dates(start, end)),
  metrics: (start: string, end: string) => request<MetricsResponse>("/metrics", dates(start, end)),
  dailyMetrics: (start: string, end: string) =>
    request<DailyMetricsResponse>("/metrics/daily", dates(start, end)),
  procurement: (targetTime: string, demandMw: number) =>
    request<ProcurementResponse>(
      "/procurement",
      new URLSearchParams({ target_time: targetTime, demand_mw: String(demandMw) }),
    ),
};

