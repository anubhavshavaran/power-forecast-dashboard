from datetime import date

import pytest

from app.services.elexon import ElexonClient, ElexonClientError


class FakeResponse:
    status_code = 200
    headers: dict[str, str] = {}

    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self):
        return self.payload


class FakeAsyncClient:
    calls: list[tuple[str, object]] = []

    def __init__(self, **_kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, url, params=None, headers=None):
        self.calls.append((url, params))
        return FakeResponse([{"dataset": "FUELHH"}])


@pytest.mark.asyncio
async def test_actual_client_uses_documented_settlement_and_fuel_filters(monkeypatch) -> None:
    monkeypatch.setattr("app.services.elexon.httpx.AsyncClient", FakeAsyncClient)
    client = ElexonClient("https://example.test")

    records = await client.get_actual_wind(date(2026, 1, 1), date(2026, 1, 31))

    assert records == [{"dataset": "FUELHH"}]
    _, params = FakeAsyncClient.calls[-1]
    assert ("settlementDateFrom", "2026-01-01") in params
    assert ("settlementDateTo", "2026-01-31") in params
    assert ("fuelType", "WIND") in params


def test_client_rejects_malformed_payload() -> None:
    with pytest.raises(ElexonClientError, match="array or object"):
        ElexonClient._extract_page("unexpected")
