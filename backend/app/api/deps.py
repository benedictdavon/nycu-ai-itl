"""Shared FastAPI dependencies: the settings and one SQLite connection per request (C6)."""

import sqlite3
from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends, Request

from app import db
from app.config import Settings


def get_app_settings(request: Request) -> Settings:
    """The settings this app was created with (set by create_app, never get_settings)."""
    settings: Settings = request.app.state.settings
    return settings


def get_conn(request: Request) -> Iterator[sqlite3.Connection]:
    """One connection per request. init_db is idempotent and guards a fresh database file."""
    settings = get_app_settings(request)
    conn = db.connect(settings.db_path)
    try:
        db.init_db(conn)
        yield conn
    finally:
        conn.close()


SettingsDep = Annotated[Settings, Depends(get_app_settings)]
ConnDep = Annotated[sqlite3.Connection, Depends(get_conn)]
