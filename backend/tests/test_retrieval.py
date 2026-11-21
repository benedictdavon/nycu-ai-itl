"""Tests for search, the contributor suggestion and the sample seeder (app/retrieval/)."""

import sqlite3

from app import db
from app.models import Change, RecordDraft
from app.retrieval import service as retrieval
from app.retrieval.seed import seed

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


def test_suggest_contributor(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION)
    _add(conn, RecordDraft(procedure="Colony PCR with primer pair Q", contributors=["Bea Lin"]))
    assert retrieval.suggest_contributor(conn, "Why did the cells clump?") == "Alex Chen"
    assert retrieval.suggest_contributor(conn, "colony PCR bands") == "Bea Lin"


def test_suggest_contributor_none_when_not_relevant_enough(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION)
    assert retrieval.suggest_contributor(conn, "zebrafish injection") is None
    # One keyword of two is not more than half.
    assert retrieval.suggest_contributor(conn, "zebrafish transformation") is None
    assert retrieval.suggest_contributor(conn, "Who can help?") is None


def test_suggest_contributor_excludes_the_requester(conn: sqlite3.Connection) -> None:
    _add(conn, TRANSFORMATION)
    question = "strain X transformation"
    assert retrieval.suggest_contributor(conn, question, exclude="Alex Chen") is None
    _add(conn, RecordDraft(procedure="Colony PCR on strain X transformants", contributors=["Bea"]))
    assert retrieval.suggest_contributor(conn, question, exclude="Alex Chen") == "Bea"
    assert retrieval.suggest_contributor(conn, question, exclude="Bea") == "Alex Chen"
    # Several names: the requester and someone already asked (D3-5).
    assert retrieval.suggest_contributor(conn, question, exclude=["Alex Chen"]) == "Bea"
    assert retrieval.suggest_contributor(conn, question, exclude=["Alex Chen", "Bea"]) is None


def test_seed_loads_samples_once(conn: sqlite3.Connection) -> None:
    assert seed(conn) == 6
    assert seed(conn) == 0
    assert len(db.list_records(conn, status="confirmed")) == 6
    hits = retrieval.search(conn, "Western blot transfer of a large protein")
    assert hits[0].record.contributors == ["Dana Huang"]
    assert retrieval.suggest_contributor(conn, "miniprep low yield") == "Chris Wu"
