from datetime import date, datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.routes import _validate_dates, health, procurement
from app.main import app
from app.services.cache import CacheStore
from app.services.repository import DataUnavailableError, DatasetRepository


def _configure_repository(tmp_path, with_data: bool) -> None:
    cache = CacheStore(tmp_path)
    if with_data:
        cache.write(
            "fuelhh",
            [
                {
                    "fuelType": "WIND",
                    "startTime": "2026-01-02T00:00:00Z",
                    "generation": 1000,
                }
            ],
            {"dataset": "FUELHH"},
        )
        cache.write(
            "windfor",
            [
                {
                    "startTime": "2026-01-02T00:00:00Z",
                    "publishTime": "2026-01-01T12:00:00Z",
                    "generation": 900,
                }
            ],
            {"dataset": "WINDFOR"},
        )
    app.state.repository = DatasetRepository(cache, decision_cutoff_hour_utc=13)


def _request() -> SimpleNamespace:
    return SimpleNamespace(app=app)


def test_api_rejects_invalid_date_range(tmp_path) -> None:
    _configure_repository(tmp_path, with_data=True)

    with pytest.raises(HTTPException) as error:
        _validate_dates(date(2026, 1, 3), date(2026, 1, 2))

    assert error.value.status_code == 422
    assert error.value.detail == "end must be on or after start"


def test_api_returns_explicit_error_when_cache_is_missing(tmp_path) -> None:
    _configure_repository(tmp_path, with_data=False)

    with pytest.raises(DataUnavailableError, match="No cached Elexon dataset"):
        app.state.repository.forecasts(date(2026, 1, 1), date(2026, 1, 31))


def test_procurement_calculation_is_illustrative_and_non_negative(tmp_path) -> None:
    _configure_repository(tmp_path, with_data=True)
    response = procurement(_request(), datetime.fromisoformat("2026-01-02T00:00:00+00:00"), 850)

    assert response.estimated_additional_power_mw == 0
    assert response.actual_implied_additional_power_mw == 0
    assert "Illustrative only" in response.assumption


def test_health_reports_cache_status(tmp_path) -> None:
    _configure_repository(tmp_path, with_data=False)
    response = health(_request())

    assert response.status == "ok"
    assert response.data.cache_available is False
