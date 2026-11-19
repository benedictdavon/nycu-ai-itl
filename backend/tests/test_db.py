"""Tests for the SQLite layer (app/db.py) on an in-memory database."""

import sqlite3

import pytest

from app import db
from app.models import RecordDraft

DRAFT = RecordDraft(procedure="Made-up procedure", contributors=["Alex Chen"])


def _info_id(conn: sqlite3.Connection) -> int:
    info = db.insert_info(
        conn, kind="upload", contributor="Alex Chen", title="T", text="Made-up text."
    )
    return info.id


def test_one_record_per_info(conn: sqlite3.Connection) -> None:
    info_id = _info_id(conn)
    db.insert_record(conn, info_id, DRAFT)
    with pytest.raises(sqlite3.IntegrityError):
        db.insert_record(conn, info_id, DRAFT)


def test_confirmed_record_cannot_change(conn: sqlite3.Connection) -> None:
    record = db.insert_record(conn, _info_id(conn), DRAFT)
    confirmed = db.confirm_record(conn, record.id, "Alex Chen")
    assert (confirmed.status, confirmed.confirmed_by) == ("confirmed", "Alex Chen")
    with pytest.raises(ValueError):
        db.update_record_draft(conn, record.id, DRAFT)
    with pytest.raises(ValueError):
        db.confirm_record(conn, record.id, "Alex Chen")


def test_list_records_filters(conn: sqlite3.Connection) -> None:
    first = db.insert_record(conn, _info_id(conn), DRAFT)
    second = db.insert_record(
        conn, _info_id(conn), RecordDraft(procedure="Other", contributors=["Bea Lin"])
    )
    db.confirm_record(conn, first.id, "Alex Chen")
    assert [r.id for r in db.list_records(conn)] == [second.id, first.id]
    assert [r.id for r in db.list_records(conn, status="draft")] == [second.id]
    assert [r.id for r in db.list_records(conn, contributor="Alex Chen")] == [first.id]
