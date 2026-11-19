"""Phase 0 smoke test: the app starts and reports its LLM settings."""

from fastapi.testclient import TestClient

from app.config import REPO_ROOT, Settings
from app.main import create_app


def test_health_reports_settings() -> None:
    client = TestClient(create_app(Settings(llm_backend="fake", llm_model="")))
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "llm_backend": "fake", "llm_model": ""}


def test_relative_paths_resolve_against_repo_root() -> None:
    settings = Settings(db_path="data/test.sqlite3")
    assert settings.db_path == REPO_ROOT / "data" / "test.sqlite3"
