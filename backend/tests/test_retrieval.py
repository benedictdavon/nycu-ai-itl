"""Tests for search over confirmed records (app/retrieval/)."""

import sqlite3

from app import db
from app.models import Change, RecordDraft
from app.retrieval import service as retrieval

TRANSFORMATION = RecordDraft(
    procedure="Transformation of strain X with plasmid P",
    based_on='Drive SOP "Transformation v2"',
    contributors=["Alex Chen"],
    changes=[Change(what="Wash volume doubled", reason="cells clumped with the SOP volume")],
)


def _add(conn: sqlite3.Connection, draft: RecordDraft, *, confirm: bool = True) -> int:
    info = db.insert_info(
        conn, kind="upload", contributor=draft.contributors[0], title=draft.procedure, text="x"
    )
    record = db.insert_record(conn, info.id, draft)
    if confirm:
        retrieval.index(conn, db.confirm_record(conn, record.id, draft.contributors[0]))
    return record.id


def test_other_word_form_matches(conn: sqlite3.Connection) -> None:
    record_id = _add(conn, TRANSFORMATION)
    hits = retrieval.search(conn, "How do I transform strain X?")
    assert [hit.record.id for hit in hits] == [record_id]
    assert hits[0].score > 0


def test_changes_and_reasons_are_searchable(conn: sqlite3.Connection) -> None:
    record_id = _add(conn, TRANSFORMATION)
    assert [hit.record.id for hit in retrieval.search(conn, "clumping")] == [record_id]


def test_drafts_are_not_searchable(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION, confirm=False)
    assert retrieval.search(conn, "transformation") == []


def test_best_match_first_and_k(conn: sqlite3.Connection) -> None:
    pcr = _add(conn, RecordDraft(procedure="Colony PCR with primer pair Q", contributors=["Bea"]))
    _add(conn, TRANSFORMATION)
    hits = retrieval.search(conn, "colony PCR primer for strain X", k=1)
    assert [hit.record.id for hit in hits] == [pcr]


def test_k_zero_or_negative_returns_nothing(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION)
    assert retrieval.search(conn, "transformation", k=0) == []
    assert retrieval.search(conn, "transformation", k=-1) == []


def test_index_twice_keeps_one_entry(conn: sqlite3.Connection) -> None:
    record_id = _add(conn, TRANSFORMATION)
    retrieval.index(conn, db.get_record(conn, record_id))  # type: ignore[arg-type]
    assert len(retrieval.search(conn, "transformation")) == 1


def test_query_syntax_and_stopwords_are_safe(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION)
    assert retrieval.search(conn, 'strain "X" AND (NOT*) -- OR NEAR') != []
    assert retrieval.search(conn, "What did they do?") == []
    assert retrieval.search(conn, "?!") == []
