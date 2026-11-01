import asyncio
from datetime import UTC, date, datetime

from app.core.config import get_settings
from app.services.cache import CacheStore
from app.services.elexon import ElexonClient


EVALUATION_START = date(2026, 1, 1)
EVALUATION_END = date(2026, 1, 31)
FORECAST_HISTORY_START = datetime(2025, 12, 25, tzinfo=UTC)
FORECAST_HISTORY_END = datetime(2026, 2, 1, tzinfo=UTC)


async def ingest() -> None:
    settings = get_settings()
    client = ElexonClient(settings.elexon_api_base_url, settings.elexon_timeout_seconds)
    actuals, forecasts = await asyncio.gather(
        client.get_actual_wind(EVALUATION_START, EVALUATION_END),
        client.get_wind_forecasts(FORECAST_HISTORY_START, FORECAST_HISTORY_END),
    )
    cache = CacheStore(settings.cache_dir)
    cache.write(
        "fuelhh",
        actuals,
        {
            "dataset": "FUELHH",
            "settlement_date_from": EVALUATION_START.isoformat(),
            "settlement_date_to": EVALUATION_END.isoformat(),
            "fuel_type": "WIND",
        },
    )
    cache.write(
        "windfor",
        forecasts,
        {
            "dataset": "WINDFOR",
            "publish_datetime_from": FORECAST_HISTORY_START.isoformat(),
            "publish_datetime_to": FORECAST_HISTORY_END.isoformat(),
        },
    )
    print(f"Cached {len(actuals)} FUELHH and {len(forecasts)} WINDFOR records in {settings.cache_dir}")


if __name__ == "__main__":
    asyncio.run(ingest())
