from datetime import date, datetime
from typing import Literal

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas.models import (
    DailyMetricsResponse,
    ForecastPoint,
    ForecastResponse,
    HealthResponse,
    MetricsResponse,
    ProcurementResponse,
)
from app.services.repository import DatasetRepository


router = APIRouter(prefix="/api")
DEFAULT_START = date(2026, 1, 1)
DEFAULT_END = date(2026, 1, 31)
MAX_RANGE_DAYS = 62


def _repository(request: Request) -> DatasetRepository:
    return request.app.state.repository


def _validate_dates(start: date, end: date) -> None:
    if end < start:
        raise HTTPException(status_code=422, detail="end must be on or after start")
    if (end - start).days + 1 > MAX_RANGE_DAYS:
        raise HTTPException(status_code=422, detail=f"Date range cannot exceed {MAX_RANGE_DAYS} days")


def _point_from_row(row: pd.Series) -> ForecastPoint:
    def value(name: str) -> float | None:
        raw = row[name]
        return float(raw) if pd.notna(raw) else None

    def timestamp(name: str) -> datetime | None:
        raw = row[name]
        return raw.to_pydatetime() if pd.notna(raw) else None

    return ForecastPoint(
        start_time=timestamp("start_time"),
        forecast_publish_time=timestamp("forecast_publish_time"),
        decision_cutoff_time=timestamp("decision_cutoff_time"),
        forecast_mw=value("forecast_mw"),
        actual_mw=value("actual_mw"),
        forecast_error_mw=value("forecast_error_mw"),
        absolute_error_mw=value("absolute_error_mw"),
        absolute_percentage_error=value("absolute_percentage_error"),
    )


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health(request: Request) -> HealthResponse:
    repository = _repository(request)
    return HealthResponse(
        status="ok",
        data=repository.data_status(),
        decision_cutoff_hour_utc=repository.decision_cutoff_hour_utc,
    )


@router.get("/forecasts", response_model=ForecastResponse, tags=["analytics"])
def forecasts(
    request: Request,
    start: date = Query(DEFAULT_START),
    end: date = Query(DEFAULT_END),
    selection: Literal["historical", "latest"] = Query("historical"),
) -> ForecastResponse:
    _validate_dates(start, end)
    repository = _repository(request)
    data = repository.forecasts(start, end, selection)
    return ForecastResponse(
        start=start,
        end=end,
        selection_mode=selection,
        points=[_point_from_row(row) for _, row in data.iterrows()],
        data_status=repository.data_status(),
    )


@router.get("/metrics", response_model=MetricsResponse, tags=["analytics"])
def metrics(
    request: Request,
    start: date = Query(DEFAULT_START),
    end: date = Query(DEFAULT_END),
) -> MetricsResponse:
    _validate_dates(start, end)
    repository = _repository(request)
    return MetricsResponse(
        start=start,
        end=end,
        metrics=repository.metrics(start, end),
        methodology=(
            "Latest WINDFOR publication at or before 13:00 UTC on the day before each target "
            "period; forecast error is forecast minus actual."
        ),
        data_status=repository.data_status(),
    )


@router.get("/metrics/daily", response_model=DailyMetricsResponse, tags=["analytics"])
def daily_metrics(
    request: Request,
    start: date = Query(DEFAULT_START),
    end: date = Query(DEFAULT_END),
) -> DailyMetricsResponse:
    _validate_dates(start, end)
    repository = _repository(request)
    return DailyMetricsResponse(
        start=start,
        end=end,
        daily=repository.daily_metrics(start, end),
        data_status=repository.data_status(),
    )


@router.get("/procurement", response_model=ProcurementResponse, tags=["procurement"])
def procurement(
    request: Request,
    target_time: datetime,
    demand_mw: float = Query(..., ge=0, le=100000),
) -> ProcurementResponse:
    repository = _repository(request)
    try:
        return ProcurementResponse(**repository.procurement(target_time, demand_mw))
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

