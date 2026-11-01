from datetime import date, datetime

from pydantic import BaseModel, Field


class DataStatus(BaseModel):
    source: str
    cached_at: datetime | None = None
    cache_available: bool
    message: str | None = None


class HealthResponse(BaseModel):
    status: str
    data: DataStatus
    decision_cutoff_hour_utc: int


class ForecastPoint(BaseModel):
    start_time: datetime
    forecast_publish_time: datetime | None = None
    decision_cutoff_time: datetime | None = None
    forecast_mw: float | None = None
    actual_mw: float | None = None
    forecast_error_mw: float | None = None
    absolute_error_mw: float | None = None
    absolute_percentage_error: float | None = None


class ForecastResponse(BaseModel):
    start: date
    end: date
    selection_mode: str
    points: list[ForecastPoint]
    data_status: DataStatus


class ErrorDistributionBin(BaseModel):
    label: str
    count: int


class AccuracyMetrics(BaseModel):
    mae_mw: float | None
    rmse_mw: float | None
    mape_percent: float | None
    bias_mw: float | None
    valid_pairs: int
    mape_pairs: int
    expected_periods: int
    coverage_percent: float | None
    error_distribution: list[ErrorDistributionBin] = Field(default_factory=list)


class MetricsResponse(BaseModel):
    start: date
    end: date
    metrics: AccuracyMetrics
    methodology: str
    data_status: DataStatus


class DailyMetrics(BaseModel):
    date: date
    mae_mw: float | None
    rmse_mw: float | None
    bias_mw: float | None
    valid_pairs: int
    expected_periods: int
    coverage_percent: float | None


class DailyMetricsResponse(BaseModel):
    start: date
    end: date
    daily: list[DailyMetrics]
    data_status: DataStatus


class ProcurementResponse(BaseModel):
    start_time: datetime
    forecast_publish_time: datetime | None = None
    demand_mw: float
    forecast_wind_mw: float
    actual_wind_mw: float | None = None
    estimated_additional_power_mw: float
    actual_implied_additional_power_mw: float | None = None
    difference_mw: float | None = None
    assumption: str

