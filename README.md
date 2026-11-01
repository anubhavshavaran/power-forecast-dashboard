# UK Wind Forecasting & Day-Ahead Procurement Portal

A cache-backed, full-stack MVP for evaluating Great Britain national wind generation forecasts against actual wind output. It supports an electricity procurement team by making historical forecast quality, direction of error, and a deliberately simplified power-gap calculation visible in one operational dashboard.

> Deployment URL: not deployed. Configure the frontend and backend using the instructions below before publishing.

## What it does

- Retrieves national half-hourly `WIND` actual generation from Elexon `FUELHH` and historical wind forecast publications from `WINDFOR`.
- Preserves forecast target and publication timestamps, then selects one historical forecast per target with no look-ahead bias.
- Calculates MAE, RMSE, MAPE, signed bias, data coverage, daily summaries, and an error distribution in the Python backend.
- Provides a React dashboard with forecast, accuracy, procurement, and methodology views.
- Caches raw Elexon responses locally; browser requests never re-download the complete source datasets.
- Makes missing cache or source failures visible rather than showing fabricated data or metrics.

## Architecture

```text
React / Vite dashboard ──► FastAPI REST API ──► cached raw Elexon records
                                  │
                                  ├── cleaning & timestamp normalization
                                  ├── historical forecast selection
                                  ├── actual / forecast matching
                                  └── accuracy & procurement calculations

Elexon Insights API ──► `python -m app.ingest` ──► `data/cache/*.json`
```

The frontend only displays API results. Forecast selection, matching, metrics, coverage, and the procurement calculation have one source of truth: the FastAPI backend.

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide.
- **Backend:** Python, FastAPI, Pandas, NumPy, HTTPX, Pydantic, Pytest.
- **Infrastructure:** Docker and Docker Compose, nginx for the built frontend.

## Repository layout

```text
backend/
  app/api/          FastAPI routes
  app/services/     Elexon client, cache, processing, repository
  app/ingest.py     Explicit cache population command
  tests/            Deterministic unit and API tests
frontend/src/
  components/       Shared dashboard UI
  pages/            Product views
  services/         Typed backend client
data/cache/         Ignored local Elexon cache
```

## Elexon data sources

- [`FUELHH`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream): half-hourly generation by fuel type. The client sends `settlementDateFrom`, `settlementDateTo`, and `fuelType=WIND`; `startTime` is the delivery target and `generation` is parsed as MW.
- [`WINDFOR`](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream): wind generation forecast history. The client uses `publishDateTimeFrom` and `publishDateTimeTo`, retaining `startTime`, `publishTime`, and `generation`.

The Elexon Insights API base URL is `https://data.elexon.co.uk/bmrs/api/v1`. Its public API requires no key. The ingestion window requests actuals for 1–31 January 2026 and forecasts published from 25 December 2025 through 1 February 2026, so forecasts available before the January target dates are retained.

## Historical forecast selection

For target delivery period `t`, the service selects the forecast with the greatest `publishTime` satisfying:

```text
publishTime <= cutoff(t)
```

This MVP uses a configurable decision cutoff of **13:00 UTC on the preceding calendar day**. It is an explicit assumption because the assignment does not establish the utility’s actual procurement decision time or a market gate closure. Set `DECISION_CUTOFF_HOUR_UTC` (0–23) to change it.

All timestamps are normalized to UTC. Publications after the cutoff are excluded before any actual-versus-forecast join. The test suite includes a regression test proving this exclusion.

`GET /api/forecasts` defaults to `selection=historical` for evaluation. Its separate `selection=latest` mode selects the newest publication available as of the request time for each target, so a latest-view workflow is never confused with historical decision-time evaluation.

## Metrics and missing data

The error convention is `forecast_mw - actual_mw`: positive values mean wind was overpredicted.

- **MAE:** `mean(abs(forecast - actual))`, MW.
- **RMSE:** `sqrt(mean((forecast - actual)^2))`, MW.
- **MAPE:** `mean(abs(forecast - actual) / actual) × 100`, percent.
- **Bias:** `mean(forecast - actual)`, MW.

Only finite matched pairs are used. Missing or malformed values are dropped rather than replaced with zero. Duplicate FUELHH target periods retain the record with the latest available publication timestamp; exact forecast `(startTime, publishTime)` duplicates retain the last record. MAPE excludes actual generation with absolute value at or below 1 MW, preventing division by zero and unstable near-zero percentages. Coverage is valid matched pairs divided by the expected 48 half-hour periods per calendar day.

## Procurement illustration

For a user-entered assumed demand and selected target period, the backend calculates:

```text
estimated_additional_power_mw = max(0, demand_mw - forecast_wind_mw)
```

When an actual is available, it also shows the analogous actual-generation scenario. It is **not** an actual procurement requirement, dispatch recommendation, or purchase-cost optimisation: these data do not include demand, prices, thermal plant, storage, interconnectors, or other generation.

## Local setup

Prerequisites: Python 3.12+ and Node.js 20+.

```bash
cp .env.example .env
python -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements-dev.txt
cd backend && python -m app.ingest && uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend OpenAPI interface is available at `http://localhost:8000/docs`.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `ELEXON_API_BASE_URL` | `https://data.elexon.co.uk/bmrs/api/v1` | Public Elexon API base URL |
| `ELEXON_TIMEOUT_SECONDS` | `30` | HTTP request timeout |
| `DECISION_CUTOFF_HOUR_UTC` | `13` | Prior-day historical decision cutoff hour |
| `CORS_ALLOWED_ORIGINS` | local Vite/Docker origins | Comma-separated browser origins allowed by FastAPI |
| `DATA_DIR` | `../data` from `backend/` | Cache directory root |
| `VITE_API_BASE_URL` | `/api` | Build-time frontend API base URL |

No credentials are required or stored. Do not commit `.env` or generated cache files.

## Docker

After creating `.env`, build and run both services:

```bash
docker compose up --build
```

The dashboard is served on `http://localhost:8080`, and FastAPI on `http://localhost:8000`. The backend starts even when no cache exists, but analytical endpoints return a clear `503` until the cache has been populated. To ingest into the shared Docker volume:

```bash
docker compose run --rm backend python -m app.ingest
```

Then refresh the dashboard. Docker nginx proxies `/api` to the `backend` service; it does not rely on container `localhost`.

## Tests and validation

Run backend tests without live Elexon access:

```bash
cd backend
pytest
```

Run the frontend production build:

```bash
cd frontend
npm run build
```

Tests cover cleaning, duplicate resolution, timezone normalization, no-look-ahead selection, joining, MAE/RMSE/MAPE/bias, zero/near-zero MAPE, empty inputs, client request construction, invalid ranges, cache errors, health, and the procurement calculation. HTTP is mocked in the Elexon-client unit test.

## Deployment

### Frontend: Vercel

1. Import this repository into Vercel.
2. Set the root directory to `frontend`.
3. Use build command `npm run build` and output directory `dist`.
4. Set `VITE_API_BASE_URL` to `https://<your-backend-domain>/api`.
5. Deploy.

### Backend: Render, Heroku, or another ASGI host

1. Deploy with root directory `backend` using `pip install -r requirements.txt`.
2. Start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Set `DATA_DIR` to persistent storage and load it using `python -m app.ingest` as an operational or scheduled task.
4. Set `CORS_ALLOWED_ORIGINS` to the Vercel deployment URL.
5. Use `/api/health` as the health-check endpoint.

The local JSON cache is intentionally lightweight for this MVP. A durable object store, database, or scheduled ingestion worker should replace it for production operations.

## Known limitations

- The configurable cutoff is an MVP assumption, not a confirmed utility decision time.
- The cache must be loaded explicitly; the dashboard deliberately does not fetch multi-week raw history on every request.
- Elexon API availability, revisions, and any partial retrieval are external-data risks and should be monitored in a production ingestion job.
- This uses national wind aggregates and does not model location, curtailment, demand, prices, balancing actions, or portfolio constraints.
- No deployment has been performed or verified by this repository.

## AI usage disclosure

OpenAI Codex was used to assist with implementation, testing, documentation, and code review. Analytical assumptions, data-source constraints, and final deployment remain the responsibility of the project owner.
