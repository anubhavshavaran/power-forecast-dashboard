import { useCallback, useEffect, useState } from "react";

import { api } from "../services/api";
import type { DailyMetricsResponse, ForecastResponse, HealthResponse, MetricsResponse } from "../types/api";

interface AnalyticsState {
  forecasts: ForecastResponse | null;
  metrics: MetricsResponse | null;
  daily: DailyMetricsResponse | null;
  health: HealthResponse | null;
  loading: boolean;
  error: string | null;
}

export function useAnalyticsData(start: string, end: string): AnalyticsState & { retry: () => void } {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<AnalyticsState>({
    forecasts: null,
    metrics: null,
    daily: null,
    health: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    Promise.all([api.forecasts(start, end), api.metrics(start, end), api.dailyMetrics(start, end), api.health()])
      .then(([forecasts, metrics, daily, health]) => {
        if (current) {
          setState({ forecasts, metrics, daily, health, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (current) {
          setState({
            forecasts: null,
            metrics: null,
            daily: null,
            health: null,
            loading: false,
            error: error instanceof Error ? error.message : "Unable to load analytical data.",
          });
        }
      });
    return () => {
      current = false;
    };
  }, [start, end, retryKey]);

  const retry = useCallback(() => setRetryKey((key) => key + 1), []);
  return { ...state, retry };
}

