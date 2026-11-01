from collections.abc import Iterable
from typing import Any

import numpy as np
import pandas as pd


ZERO_ACTUAL_THRESHOLD_MW = 1.0


def _empty_frame(columns: list[str]) -> pd.DataFrame:
    return pd.DataFrame(columns=columns)


def _timestamps(values: pd.Series) -> pd.Series:
    return pd.to_datetime(values, utc=True, errors="coerce")


def clean_actuals(records: Iterable[dict[str, Any]]) -> pd.DataFrame:
    """Filter FUELHH data to clean national WIND half-hour observations."""
    frame = pd.DataFrame(list(records))
    columns = ["start_time", "actual_mw", "actual_publish_time"]
    required = {"startTime", "generation", "fuelType"}
    if frame.empty or not required.issubset(frame.columns):
        return _empty_frame(columns)

    frame = frame.loc[frame["fuelType"].astype(str).str.upper().eq("WIND")].copy()
    frame["start_time"] = _timestamps(frame["startTime"])
    frame["actual_mw"] = pd.to_numeric(frame["generation"], errors="coerce")
    frame["actual_publish_time"] = _timestamps(
        frame.get("publishTime", pd.Series(pd.NaT, index=frame.index))
    )
    frame = frame.loc[
        frame["start_time"].notna() & np.isfinite(frame["actual_mw"])
    ].copy()
    if frame.empty:
        return _empty_frame(columns)

    frame["_publish_sort"] = frame["actual_publish_time"].fillna(pd.Timestamp.min.tz_localize("UTC"))
    frame = frame.sort_values(["start_time", "_publish_sort"]).drop_duplicates(
        "start_time", keep="last"
    )
    return frame[columns].sort_values("start_time").reset_index(drop=True)


def clean_forecasts(records: Iterable[dict[str, Any]]) -> pd.DataFrame:
    """Clean WINDFOR observations while retaining all historical publications."""
    frame = pd.DataFrame(list(records))
    columns = ["start_time", "forecast_publish_time", "forecast_mw"]
    required = {"startTime", "publishTime", "generation"}
    if frame.empty or not required.issubset(frame.columns):
        return _empty_frame(columns)

    frame["start_time"] = _timestamps(frame["startTime"])
    frame["forecast_publish_time"] = _timestamps(frame["publishTime"])
    frame["forecast_mw"] = pd.to_numeric(frame["generation"], errors="coerce")
    frame = frame.loc[
        frame["start_time"].notna()
        & frame["forecast_publish_time"].notna()
        & np.isfinite(frame["forecast_mw"])
    ].copy()
    if frame.empty:
        return _empty_frame(columns)

    frame = frame.sort_values(["start_time", "forecast_publish_time"]).drop_duplicates(
        ["start_time", "forecast_publish_time"], keep="last"
    )
    return frame[columns].sort_values(["start_time", "forecast_publish_time"]).reset_index(drop=True)


def select_historical_forecasts(
    forecasts: pd.DataFrame, decision_cutoff_hour_utc: int
) -> pd.DataFrame:
    """Select the latest forecast published no later than each target's cutoff."""
    columns = ["start_time", "forecast_publish_time", "forecast_mw", "decision_cutoff_time"]
    if forecasts.empty:
        return _empty_frame(columns)
    if not 0 <= decision_cutoff_hour_utc <= 23:
        raise ValueError("decision_cutoff_hour_utc must be between 0 and 23")

    selected = forecasts.copy()
    selected["decision_cutoff_time"] = (
        selected["start_time"].dt.normalize()
        - pd.Timedelta(days=1)
        + pd.Timedelta(hours=decision_cutoff_hour_utc)
    )
    selected = selected.loc[
        selected["forecast_publish_time"] <= selected["decision_cutoff_time"]
    ].copy()
    selected = selected.sort_values(["start_time", "forecast_publish_time"]).drop_duplicates(
        "start_time", keep="last"
    )
    return selected[columns].sort_values("start_time").reset_index(drop=True)


def select_latest_forecasts(
    forecasts: pd.DataFrame, as_of: pd.Timestamp | None = None
) -> pd.DataFrame:
    """Select the latest publication known by an as-of timestamp for each target."""
    columns = ["start_time", "forecast_publish_time", "forecast_mw", "decision_cutoff_time"]
    if forecasts.empty:
        return _empty_frame(columns)
    timestamp = as_of or pd.Timestamp.now(tz="UTC")
    if timestamp.tzinfo is None:
        timestamp = timestamp.tz_localize("UTC")
    else:
        timestamp = timestamp.tz_convert("UTC")
    selected = forecasts.loc[forecasts["forecast_publish_time"] <= timestamp].copy()
    selected = selected.sort_values(["start_time", "forecast_publish_time"]).drop_duplicates(
        "start_time", keep="last"
    )
    selected["decision_cutoff_time"] = pd.NaT
    return selected[columns].sort_values("start_time").reset_index(drop=True)


def build_evaluation_dataset(
    actuals: pd.DataFrame, selected_forecasts: pd.DataFrame
) -> pd.DataFrame:
    columns = [
        "start_time",
        "forecast_publish_time",
        "decision_cutoff_time",
        "forecast_mw",
        "actual_mw",
        "forecast_error_mw",
        "absolute_error_mw",
        "absolute_percentage_error",
    ]
    evaluation = selected_forecasts.merge(actuals, on="start_time", how="outer")
    if evaluation.empty:
        return _empty_frame(columns)
    evaluation["forecast_error_mw"] = evaluation["forecast_mw"] - evaluation["actual_mw"]
    evaluation["absolute_error_mw"] = evaluation["forecast_error_mw"].abs()
    denominator = evaluation["actual_mw"].abs()
    evaluation["absolute_percentage_error"] = np.where(
        denominator > ZERO_ACTUAL_THRESHOLD_MW,
        (evaluation["absolute_error_mw"] / denominator) * 100,
        np.nan,
    )
    return evaluation[columns].sort_values("start_time").reset_index(drop=True)


def _valid_pairs(evaluation: pd.DataFrame) -> pd.DataFrame:
    if evaluation.empty:
        return evaluation.copy()
    pairs = evaluation.dropna(subset=["forecast_mw", "actual_mw", "forecast_error_mw"]).copy()
    return pairs.loc[
        np.isfinite(pairs["forecast_mw"])
        & np.isfinite(pairs["actual_mw"])
        & np.isfinite(pairs["forecast_error_mw"])
    ].copy()


def error_distribution(evaluation: pd.DataFrame) -> list[dict[str, int | str]]:
    pairs = _valid_pairs(evaluation)
    if pairs.empty:
        return []
    errors = pairs["forecast_error_mw"].to_numpy(dtype=float)
    lower, upper = float(errors.min()), float(errors.max())
    if np.isclose(lower, upper):
        return [{"label": f"{lower:,.0f} MW", "count": int(errors.size)}]
    edges = np.linspace(lower, upper, num=min(9, max(3, int(np.sqrt(errors.size)) + 1)))
    counts, edges = np.histogram(errors, bins=edges)
    bins: list[dict[str, int | str]] = []
    for index, count in enumerate(counts):
        left, right = edges[index], edges[index + 1]
        closing = "]" if index == len(counts) - 1 else ")"
        bins.append({"label": f"[{left:,.0f}, {right:,.0f}{closing}", "count": int(count)})
    return bins


def calculate_metrics(evaluation: pd.DataFrame, expected_periods: int) -> dict[str, Any]:
    pairs = _valid_pairs(evaluation)
    coverage = (len(pairs) / expected_periods * 100) if expected_periods else None
    if pairs.empty:
        return {
            "mae_mw": None,
            "rmse_mw": None,
            "mape_percent": None,
            "bias_mw": None,
            "valid_pairs": 0,
            "mape_pairs": 0,
            "expected_periods": expected_periods,
            "coverage_percent": coverage,
            "error_distribution": [],
        }

    errors = pairs["forecast_error_mw"].to_numpy(dtype=float)
    mape_values = pairs.loc[
        pairs["actual_mw"].abs() > ZERO_ACTUAL_THRESHOLD_MW, "absolute_percentage_error"
    ].dropna()
    return {
        "mae_mw": float(np.mean(np.abs(errors))),
        "rmse_mw": float(np.sqrt(np.mean(np.square(errors)))),
        "mape_percent": float(mape_values.mean()) if not mape_values.empty else None,
        "bias_mw": float(np.mean(errors)),
        "valid_pairs": int(len(pairs)),
        "mape_pairs": int(len(mape_values)),
        "expected_periods": expected_periods,
        "coverage_percent": float(coverage) if coverage is not None else None,
        "error_distribution": error_distribution(evaluation),
    }


def calculate_daily_metrics(evaluation: pd.DataFrame) -> list[dict[str, Any]]:
    if evaluation.empty:
        return []
    working = evaluation.copy()
    working["date"] = working["start_time"].dt.date
    daily: list[dict[str, Any]] = []
    for value, day in working.groupby("date", sort=True):
        metrics = calculate_metrics(day, expected_periods=48)
        daily.append(
            {
                "date": value,
                "mae_mw": metrics["mae_mw"],
                "rmse_mw": metrics["rmse_mw"],
                "bias_mw": metrics["bias_mw"],
                "valid_pairs": metrics["valid_pairs"],
                "expected_periods": 48,
                "coverage_percent": metrics["coverage_percent"],
            }
        )
    return daily

