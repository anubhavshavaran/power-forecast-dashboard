from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"), env_file_encoding="utf-8", extra="ignore"
    )

    elexon_api_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    elexon_timeout_seconds: float = 30.0
    decision_cutoff_hour_utc: int = 13
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:8080"
    data_dir: Path = Path("../data")

    @property
    def cache_dir(self) -> Path:
        return self.data_dir / "cache"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not 0 <= settings.decision_cutoff_hour_utc <= 23:
        raise ValueError("DECISION_CUTOFF_HOUR_UTC must be between 0 and 23")
    return settings

