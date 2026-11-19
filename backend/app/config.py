"""Settings from environment variables and the repo-root `.env` file. Owner: scaffold."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    llm_backend: Literal["fake", "llama_server"] = "fake"
    llm_base_url: str = "http://localhost:8080/v1"  # the OpenAI-compatible root
    llm_api_key: str = ""  # sent as a Bearer token when set; never commit it
    llm_model: str = ""  # optional: llama-server serves one model and ignores it
    llm_timeout_s: float = 120
    db_path: Path = REPO_ROOT / "data" / "app.sqlite3"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @field_validator("db_path")
    @classmethod
    def _resolve_against_repo_root(cls, value: Path) -> Path:
        """Relative paths (for example from `.env`) are relative to the repo root."""
        if str(value) == ":memory:" or value.is_absolute():
            return value
        return REPO_ROOT / value


@lru_cache
def get_settings() -> Settings:
    """The process-wide settings. Tests call `get_settings.cache_clear()` after changing env."""
    return Settings()
