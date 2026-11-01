from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any

import pandas as pd

from app.services.cache import CacheStore
from app.services.processing import (
    build_evaluation_dataset,
    calculate_daily_metrics,
    calculate_metrics,
    clean_actuals,
    clean_forecasts,
    select_historical_forecasts,
    select_latest_forecasts,
)


class DataUnavailableError(RuntimeError):
    pass


@dataclass
class EvaluationContext:
    evaluation: pd.DataFrame
    cached_at: datetime


class DatasetRepository:
    def __init__(self, cache_store: CacheStore, decision_cutoff_hour_utc: int):
        self.cache_store = cache_store
        self.decision_cutoff_hour_utc = decision_cutoff_hour_utc

    def data_status(self) -> dict[str, Any]:
        actuals = self.cache_store.read("fuelhh")
        forecasts = self.cache_store.read("windfor")
        if actuals is None or forecasts is None:
            return {
                "source": "Elexon cache",
                "cached_at": None,
                "cache_available": False,
                "message": "No local Elexon cache. Run the ingestion command before using analytics.",
            }
        cached_at = max(
            self._parse_cached_at(actuals.get("cached_at")),
            self._parse_cached_at(forecasts.get("cached_at")),
        )
        return {
            "source": "Elexon FUELHH and WINDFOR cached responses",
            "cached_at": cached_at,
            "cache_available": True,
            "message": None,
        }

    def get_context(self, selection_mode: str = "historical") -> EvaluationContext:
        actuals = self.cache_store.read("fuelhh")
        forecasts = self.cache_store.read("windfor")
        if actuals is None or forecasts is None:
            raise DataUnavailableError(
                "No cached Elexon dataset is available. Run `python -m app.ingest` from backend."
            )
        cleaned_actuals = clean_actuals(actuals["records"])
        cleaned_forecasts = clean_forecasts(forecasts["records"])
        if selection_mode == "historical":
            selected = select_historical_forecasts(
                cleaned_forecasts, self.decision_cutoff_hour_utc
            )
        elif selection_mode == "latest":
            selected = select_latest_forecasts(cleaned_forecasts)
        else:
            raise ValueError("selection_mode must be historical or latest")
        evaluation = build_evaluation_dataset(cleaned_actuals, selected)
        cached_at = max(
            self._parse_cached_at(actuals.get("cached_at")),
            self._parse_cached_at(forecasts.get("cached_at")),
        )
        return EvaluationContext(evaluation=evaluation, cached_at=cached_at)

    @staticmethod
    def _parse_cached_at(value: object) -> datetime:
        if isinstance(value, str):
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.astimezone(UTC)
        return datetime.min.replace(tzinfo=UTC)

    @staticmethod
    def filter_range(evaluation: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
        if evaluation.empty:
            return evaluation
        return evaluation.loc[
            (evaluation["start_time"].dt.date >= start)
            & (evaluation["start_time"].dt.date <= end)
        ].copy()

    @staticmethod
    def expected_periods(start: date, end: date) -> int:
        return ((end - start).days + 1) * 48

    def metrics(self, start: date, end: date) -> dict[str, Any]:
        context = self.get_context()
        evaluation = self.filter_range(context.evaluation, start, end)
        return calculate_metrics(evaluation, self.expected_periods(start, end))

    def daily_metrics(self, start: date, end: date) -> list[dict[str, Any]]:
        context = self.get_context()
        evaluation = self.filter_range(context.evaluation, start, end)
        return calculate_daily_metrics(evaluation)

    def forecasts(self, start: date, end: date, selection_mode: str = "historical") -> pd.DataFrame:
        context = self.get_context(selection_mode)
        return self.filter_range(context.evaluation, start, end)

    def procurement(self, target_time: datetime, demand_mw: float) -> dict[str, Any]:
        context = self.get_context()
        target = pd.Timestamp(target_time)
        if target.tzinfo is None:
            target = target.tz_localize("UTC")
        else:
            target = target.tz_convert("UTC")
        rows = context.evaluation.loc[context.evaluation["start_time"].eq(target)]
        if rows.empty or pd.isna(rows.iloc[0]["forecast_mw"]):
            raise KeyError("No selected historical forecast is available for this target period")
        row = rows.iloc[0]
        forecast_mw = float(row["forecast_mw"])
        actual_mw = float(row["actual_mw"]) if pd.notna(row["actual_mw"]) else None
        estimated = max(0.0, demand_mw - forecast_mw)
        actual_implied = max(0.0, demand_mw - actual_mw) if actual_mw is not None else None
        return {
            "start_time": target.to_pydatetime(),
            "forecast_publish_time": row["forecast_publish_time"],
            "demand_mw": demand_mw,
            "forecast_wind_mw": forecast_mw,
            "actual_wind_mw": actual_mw,
            "estimated_additional_power_mw": estimated,
            "actual_implied_additional_power_mw": actual_implied,
            "difference_mw": (actual_implied - estimated) if actual_implied is not None else None,
            "assumption": (
                "Illustrative only: assumes wind is the only supply offset against the entered demand; "
                "it is not a procurement optimisation or electricity purchase requirement."
            ),
        }

