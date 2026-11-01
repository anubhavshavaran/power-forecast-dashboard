export interface DataStatus {
  source: string;
  cached_at: string | null;
  cache_available: boolean;
  message: string | null;
}

export interface HealthResponse {
  status: string;
  data: DataStatus;
  decision_cutoff_hour_utc: number;
}

export interface ForecastPoint {
  start_time: string;
  forecast_publish_time: string | null;
  decision_cutoff_time: string | null;
  forecast_mw: number | null;
  actual_mw: number | null;
  forecast_error_mw: number | null;
  absolute_error_mw: number | null;
  absolute_percentage_error: number | null;
}

export interface ForecastResponse {
  start: string;
  end: string;
  points: ForecastPoint[];
  data_status: DataStatus;
}

export interface ErrorDistributionBin {
  label: string;
  count: number;
}

export interface AccuracyMetrics {
  mae_mw: number | null;
  rmse_mw: number | null;
  mape_percent: number | null;
  bias_mw: number | null;
  valid_pairs: number;
  mape_pairs: number;
  expected_periods: number;
  coverage_percent: number | null;
  error_distribution: ErrorDistributionBin[];
}

export interface MetricsResponse {
  start: string;
  end: string;
  metrics: AccuracyMetrics;
  methodology: string;
  data_status: DataStatus;
}

export interface DailyMetrics {
  date: string;
  mae_mw: number | null;
  rmse_mw: number | null;
  bias_mw: number | null;
  valid_pairs: number;
  expected_periods: number;
  coverage_percent: number | null;
}

export interface DailyMetricsResponse {
  start: string;
  end: string;
  daily: DailyMetrics[];
  data_status: DataStatus;
}

export interface ProcurementResponse {
  start_time: string;
  forecast_publish_time: string | null;
  demand_mw: number;
  forecast_wind_mw: number;
  actual_wind_mw: number | null;
  estimated_additional_power_mw: number;
  actual_implied_additional_power_mw: number | null;
  difference_mw: number | null;
  assumption: string;
}

