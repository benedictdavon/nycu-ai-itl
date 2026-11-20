"""Tests for the SQLite layer (app/db.py) on an in-memory database."""

import json
import sqlite3
from pathlib import Path

import pytest

from app import db
from app.models import Answer, RecordDraft

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


def test_first_draft_is_kept_after_edits(conn: sqlite3.Connection) -> None:
    record = db.insert_record(conn, _info_id(conn), DRAFT)
    edited = DRAFT.model_copy(update={"troubleshooting": "Added on review."})
    db.update_record_draft(conn, record.id, edited)
    assert db.get_record(conn, record.id).troubleshooting == "Added on review."  # type: ignore[union-attr]
    assert db.get_first_draft(conn, record.id) == DRAFT


def test_insert_ask_logs_question_and_answer(conn: sqlite3.Connection) -> None:
    answer = Answer(kind="insufficient", text="No record covers this.")
    ask_id = db.insert_ask(
        conn, requester="Bea Lin", question="Why?", hint_mode=True, hit_ids=[3, 1], answer=answer
    )
    row = conn.execute("SELECT * FROM asks WHERE id = ?", (ask_id,)).fetchone()
    assert (row["requester"], row["question"], row["hint_mode"]) == ("Bea Lin", "Why?", 1)
    assert json.loads(row["hit_ids"]) == [3, 1]
    assert Answer.model_validate_json(row["answer"]) == answer


def test_old_database_is_refused() -> None:
    old = db.connect(Path(":memory:"))
    old.execute(
        "CREATE TABLE records (id INTEGER PRIMARY KEY, info_id INTEGER, status TEXT, data TEXT,"
        " confirmed_by TEXT)"
    )
    with pytest.raises(db.OutdatedDatabaseError, match="Delete it"):
        db.init_db(old)
    old.close()
