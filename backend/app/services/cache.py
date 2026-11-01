import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class CacheStore:
    """Small JSON cache for raw Elexon response records."""

    def __init__(self, directory: Path):
        self.directory = directory

    def _path(self, name: str) -> Path:
        return self.directory / f"{name}.json"

    def read(self, name: str) -> dict[str, Any] | None:
        path = self._path(name)
        if not path.exists():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
            return None
        return payload

    def write(self, name: str, records: list[dict[str, Any]], metadata: dict[str, Any]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        payload = {
            "cached_at": datetime.now(UTC).isoformat(),
            "records": records,
            "metadata": metadata,
        }
        path = self._path(name)
        temporary_path = path.with_suffix(".tmp")
        temporary_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        temporary_path.replace(path)

