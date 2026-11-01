import math

import pandas as pd
import pytest

from app.services.processing import (
    build_evaluation_dataset,
    calculate_metrics,
    clean_actuals,
    clean_forecasts,
    select_historical_forecasts,
    select_latest_forecasts,
)


def test_clean_actuals_filters_malformed_non_wind_and_duplicate_records() -> None:
    cleaned = clean_actuals(
        [
            {
                "fuelType": "WIND",
                "startTime": "2026-01-01T00:00:00Z",
                "publishTime": "2026-01-01T00:31:00Z",
                "generation": "1000",
            },
            {
                "fuelType": "WIND",
                "startTime": "2026-01-01T00:00:00Z",
                "publishTime": "2026-01-01T00:35:00Z",
                "generation": "1010",
            },
            {"fuelType": "CCGT", "startTime": "2026-01-01T00:30:00Z", "generation": 99},
            {"fuelType": "WIND", "startTime": "not-a-time", "generation": 99},
            {"fuelType": "WIND", "startTime": "2026-01-01T01:00:00Z", "generation": "bad"},
        ]
    )

    assert len(cleaned) == 1
    assert cleaned.iloc[0]["actual_mw"] == 1010


def test_clean_forecasts_normalises_timezones_and_removes_exact_duplicates() -> None:
    cleaned = clean_forecasts(
        [
            {
                "startTime": "2026-01-01T00:00:00+01:00",
                "publishTime": "2025-12-30T13:00:00Z",
                "generation": 900,
            },
            {
                "startTime": "2025-12-31T23:00:00Z",
                "publishTime": "2025-12-30T13:00:00Z",
                "generation": 901,
            },
        ]
    )

    assert len(cleaned) == 1
    assert cleaned.iloc[0]["start_time"] == pd.Timestamp("2025-12-31T23:00:00Z")
    assert cleaned.iloc[0]["forecast_mw"] == 901


def test_historical_selection_excludes_future_information() -> None:
    forecasts = clean_forecasts(
        [
            {
                "startTime": "2026-01-02T10:00:00Z",
                "publishTime": "2026-01-01T11:00:00Z",
                "generation": 1000,
            },
            {
                "startTime": "2026-01-02T10:00:00Z",
                "publishTime": "2026-01-01T13:00:00Z",
                "generation": 1100,
            },
            {
                "startTime": "2026-01-02T10:00:00Z",
                "publishTime": "2026-01-01T13:01:00Z",
                "generation": 1200,
            },
        ]
    )

    selected = select_historical_forecasts(forecasts, decision_cutoff_hour_utc=13)

    assert len(selected) == 1
    assert selected.iloc[0]["forecast_mw"] == 1100
    assert selected.iloc[0]["forecast_publish_time"] == pd.Timestamp("2026-01-01T13:00:00Z")


def test_latest_selection_uses_only_publications_known_as_of_now() -> None:
    forecasts = clean_forecasts(
        [
            {
                "startTime": "2026-01-02T10:00:00Z",
                "publishTime": "2026-01-01T13:00:00Z",
                "generation": 1100,
            },
            {
                "startTime": "2026-01-02T10:00:00Z",
                "publishTime": "2026-01-03T13:00:00Z",
                "generation": 1200,
            },
        ]
    )

    selected = select_latest_forecasts(forecasts, pd.Timestamp("2026-01-02T00:00:00Z"))

    assert len(selected) == 1
    assert selected.iloc[0]["forecast_mw"] == 1100


def test_join_only_matches_selected_forecast_to_actual() -> None:
    actuals = clean_actuals(
        [
            {
                "fuelType": "WIND",
                "startTime": "2026-01-02T00:00:00Z",
                "generation": 900,
            }
        ]
    )
    forecasts = clean_forecasts(
        [
            {
                "startTime": "2026-01-02T00:00:00Z",
                "publishTime": "2026-01-01T12:00:00Z",
                "generation": 950,
            },
            {
                "startTime": "2026-01-02T00:00:00Z",
                "publishTime": "2026-01-01T14:00:00Z",
                "generation": 1200,
            },
        ]
    )

    evaluation = build_evaluation_dataset(
        actuals, select_historical_forecasts(forecasts, decision_cutoff_hour_utc=13)
    )

    assert len(evaluation) == 1
    assert evaluation.iloc[0]["forecast_mw"] == 950
    assert evaluation.iloc[0]["forecast_error_mw"] == 50


def test_metric_calculations_use_only_valid_pairs() -> None:
    evaluation = pd.DataFrame(
        {
            "forecast_mw": [120.0, 150.0, None],
            "actual_mw": [100.0, 200.0, 10.0],
            "forecast_error_mw": [20.0, -50.0, None],
            "absolute_percentage_error": [20.0, 25.0, None],
        }
    )

    metrics = calculate_metrics(evaluation, expected_periods=4)

    assert metrics["mae_mw"] == 35.0
    assert metrics["rmse_mw"] == pytest.approx(math.sqrt(1450))
    assert metrics["mape_percent"] == 22.5
    assert metrics["bias_mw"] == -15.0
    assert metrics["valid_pairs"] == 2
    assert metrics["coverage_percent"] == 50.0


def test_mape_excludes_zero_and_near_zero_actuals() -> None:
    evaluation = pd.DataFrame(
        {
            "forecast_mw": [10.0, 10.0, 110.0],
            "actual_mw": [0.0, 0.5, 100.0],
            "forecast_error_mw": [10.0, 9.5, 10.0],
            "absolute_percentage_error": [float("nan"), float("nan"), 10.0],
        }
    )

    metrics = calculate_metrics(evaluation, expected_periods=3)

    assert metrics["valid_pairs"] == 3
    assert metrics["mape_pairs"] == 1
    assert metrics["mape_percent"] == 10.0


def test_empty_dataset_has_safe_metrics() -> None:
    metrics = calculate_metrics(pd.DataFrame(), expected_periods=48)

    assert metrics["mae_mw"] is None
    assert metrics["rmse_mw"] is None
    assert metrics["mape_percent"] is None
    assert metrics["valid_pairs"] == 0
