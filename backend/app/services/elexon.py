import asyncio
from collections.abc import Mapping, Sequence
from datetime import date, datetime
from typing import Any

import httpx


class ElexonClientError(RuntimeError):
    """Raised when a public Elexon response cannot be used safely."""


class ElexonClient:
    def __init__(self, base_url: str, timeout_seconds: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_seconds)

    async def get_actual_wind(self, start: date, end: date) -> list[dict[str, Any]]:
        return await self._get_records(
            "/datasets/FUELHH/stream",
            [
                ("settlementDateFrom", start.isoformat()),
                ("settlementDateTo", end.isoformat()),
                ("fuelType", "WIND"),
            ],
        )

    async def get_wind_forecasts(
        self, publish_start: datetime, publish_end: datetime
    ) -> list[dict[str, Any]]:
        return await self._get_records(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": publish_start.isoformat().replace("+00:00", "Z"),
                "publishDateTimeTo": publish_end.isoformat().replace("+00:00", "Z"),
            },
        )

    async def _get_records(
        self, path: str, params: Mapping[str, str] | Sequence[tuple[str, str]]
    ) -> list[dict[str, Any]]:
        url = f"{self.base_url}{path}"
        records: list[dict[str, Any]] = []
        next_url: str | None = url
        next_params: Mapping[str, str] | Sequence[tuple[str, str]] | None = params

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while next_url:
                payload = await self._request_json(client, next_url, next_params)
                page_records, next_url = self._extract_page(payload)
                records.extend(page_records)
                next_params = None
        return records

    async def _request_json(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Mapping[str, str] | Sequence[tuple[str, str]] | None,
    ) -> Any:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.get(url, params=params, headers={"Accept": "application/json"})
                if response.status_code == 429 or response.status_code >= 500:
                    retry_after = response.headers.get("Retry-After")
                    delay = min(float(retry_after), 5.0) if retry_after else float(attempt + 1)
                    await asyncio.sleep(delay)
                    last_error = ElexonClientError(f"Elexon returned HTTP {response.status_code}")
                    continue
                response.raise_for_status()
                try:
                    return response.json()
                except ValueError as error:
                    raise ElexonClientError("Elexon returned invalid JSON") from error
            except (httpx.HTTPError, ElexonClientError) as error:
                last_error = error
                if attempt < 2:
                    await asyncio.sleep(float(attempt + 1))
        raise ElexonClientError(f"Elexon request failed for {url}: {last_error}")

    @staticmethod
    def _extract_page(payload: Any) -> tuple[list[dict[str, Any]], str | None]:
        if isinstance(payload, list):
            rows = payload
            next_url = None
        elif isinstance(payload, dict):
            rows = payload.get("data", payload.get("records", []))
            links = payload.get("links") or {}
            next_url = links.get("next") or payload.get("next")
        else:
            raise ElexonClientError("Elexon response JSON must be an array or object")
        if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
            raise ElexonClientError("Elexon response does not contain record objects")
        if next_url is not None and not isinstance(next_url, str):
            raise ElexonClientError("Elexon response has an invalid pagination link")
        return rows, next_url
