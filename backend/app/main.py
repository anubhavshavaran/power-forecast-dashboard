import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.services.cache import CacheStore
from app.services.repository import DataUnavailableError, DatasetRepository


settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="UK Wind Forecasting API",
    version="1.0.0",
    description="Historical Elexon wind forecast evaluation and illustrative procurement analysis.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.state.repository = DatasetRepository(
    CacheStore(settings.cache_dir), settings.decision_cutoff_hour_utc
)


@app.exception_handler(DataUnavailableError)
async def data_unavailable_handler(_: Request, error: DataUnavailableError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(error)})


@app.exception_handler(ValueError)
async def validation_error_handler(_: Request, error: ValueError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(error)})


app.include_router(router)
