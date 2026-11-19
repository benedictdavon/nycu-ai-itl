"""Shared fixtures: an in-memory database, and the API with the fake LLM."""

import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import db
from app.config import Settings
from app.main import create_app


@pytest.fixture
def conn() -> Iterator[sqlite3.Connection]:
    """An empty in-memory database with the schema."""
    connection = db.connect(Path(":memory:"))
    db.init_db(connection)
    yield connection
    connection.close()


@pytest.fixture
def client(tmp_path: Path) -> Iterator[TestClient]:
    """The API with the fake LLM and a temporary database, lifespan running."""
    settings = Settings(llm_backend="fake", db_path=tmp_path / "app.sqlite3")
    with TestClient(create_app(settings)) as test_client:
        yield test_client
