"""SQLite tables and queries (standard-library `sqlite3`, no ORM).

Owner: Part A. Spec: D1-2 (one Info, one M), D2-3a (draft -> confirmed), D3-1 (search).
Every write commits. Functions never close the connection.
"""

import json
import sqlite3
from pathlib import Path

from app.models import Answer, Info, Record, RecordDraft

SCHEMA = """
CREATE TABLE IF NOT EXISTS infos (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('upload','discussion')),
  contributor TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  link TEXT,
  project_tags TEXT NOT NULL DEFAULT '[]',          -- JSON array
  file_path TEXT,                                   -- original file, if one was uploaded
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS records (
  id INTEGER PRIMARY KEY,
  info_id INTEGER NOT NULL UNIQUE REFERENCES infos(id) ON DELETE CASCADE,  -- D1-2
  status TEXT NOT NULL CHECK (status IN ('draft','confirmed')),
  data TEXT NOT NULL,                               -- RecordDraft JSON
  first_draft TEXT NOT NULL,                        -- the encoder's draft, never edited (04 §3)
  confirmed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- Full-text index over confirmed M only (architecture.md §4). rowid = records.id.
-- Filled by index_record() when a record is confirmed; drafts are never in it.
CREATE VIRTUAL TABLE IF NOT EXISTS records_fts USING fts5(
  procedure, based_on, changes, troubleshooting, project_tags, contributors,
  tokenize = 'porter unicode61'
);
-- Every question and its answer, as evidence for the evaluation (04 §3).
CREATE TABLE IF NOT EXISTS asks (
  id INTEGER PRIMARY KEY,
  requester TEXT NOT NULL,
  question TEXT NOT NULL,
  hint_mode INTEGER NOT NULL,
  hit_ids TEXT NOT NULL,                            -- JSON: record ids search returned, best first
  answer TEXT NOT NULL,                             -- Answer JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(db_path: Path) -> sqlite3.Connection:
    """Open the database. `Path(":memory:")` gives an in-memory one for tests."""
    in_memory = str(db_path) == ":memory:"
    if not in_memory:
        db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create the tables if they do not exist (idempotent)."""
    conn.executescript(SCHEMA)


def _info_from_row(row: sqlite3.Row) -> Info:
    return Info(
        id=row["id"],
        kind=row["kind"],
        contributor=row["contributor"],
        title=row["title"],
        text=row["text"],
        link=row["link"],
        project_tags=json.loads(row["project_tags"]),
        has_file=row["file_path"] is not None,
    )


def _record_from_row(row: sqlite3.Row) -> Record:
    data = json.loads(row["data"])
    data.update(
        id=row["id"], info_id=row["info_id"], status=row["status"], confirmed_by=row["confirmed_by"]
    )
    return Record.model_validate(data)


def insert_info(
    conn: sqlite3.Connection,
    *,
    kind: str,
    contributor: str,
    title: str,
    text: str,
    link: str | None = None,
    project_tags: list[str] | None = None,
) -> Info:
    """Store a raw record (D1-1)."""
    cursor = conn.execute(
        "INSERT INTO infos (kind, contributor, title, text, link, project_tags)"
        " VALUES (?, ?, ?, ?, ?, ?)",
        (kind, contributor, title, text, link, json.dumps(project_tags or [])),
    )
    conn.commit()
    return _require(get_info(conn, cursor.lastrowid or 0))


def get_info(conn: sqlite3.Connection, info_id: int) -> Info | None:
    row = conn.execute("SELECT * FROM infos WHERE id = ?", (info_id,)).fetchone()
    return None if row is None else _info_from_row(row)


def insert_record(conn: sqlite3.Connection, info_id: int, draft: RecordDraft) -> Record:
    """Store a draft M, and keep a copy as its first draft.

    A second record for the same info raises sqlite3.IntegrityError.
    """
    data = draft.model_dump_json()
    cursor = conn.execute(
        "INSERT INTO records (info_id, status, data, first_draft) VALUES (?, 'draft', ?, ?)",
        (info_id, data, data),
    )
    conn.commit()
    return _require(get_record(conn, cursor.lastrowid or 0))


def get_record(conn: sqlite3.Connection, record_id: int) -> Record | None:
    row = conn.execute("SELECT * FROM records WHERE id = ?", (record_id,)).fetchone()
    return None if row is None else _record_from_row(row)


def get_first_draft(conn: sqlite3.Connection, record_id: int) -> RecordDraft | None:
    """The encoder's draft as it was before any edit on review."""
    row = conn.execute("SELECT first_draft FROM records WHERE id = ?", (record_id,)).fetchone()
    return None if row is None else RecordDraft.model_validate_json(row["first_draft"])


def update_record_draft(conn: sqlite3.Connection, record_id: int, draft: RecordDraft) -> Record:
    """Replace a draft's fields. Raises ValueError if it is missing or already confirmed."""
    cursor = conn.execute(
        "UPDATE records SET data = ?, updated_at = datetime('now')"
        " WHERE id = ? AND status = 'draft'",
        (draft.model_dump_json(), record_id),
    )
    conn.commit()
    if cursor.rowcount == 0:
        raise ValueError(f"record {record_id} is not an editable draft")
    return _require(get_record(conn, record_id))


def confirm_record(conn: sqlite3.Connection, record_id: int, confirmed_by: str) -> Record:
    """Mark a draft confirmed (D2-3a). Raises ValueError if it is missing or already confirmed."""
    cursor = conn.execute(
        "UPDATE records SET status = 'confirmed', confirmed_by = ?, updated_at = datetime('now')"
        " WHERE id = ? AND status = 'draft'",
        (confirmed_by, record_id),
    )
    conn.commit()
    if cursor.rowcount == 0:
        raise ValueError(f"record {record_id} is not a draft")
    return _require(get_record(conn, record_id))


def list_records(
    conn: sqlite3.Connection, *, status: str | None = None, contributor: str | None = None
) -> list[Record]:
    """Records, newest first, optionally filtered by status and contributor."""
    sql = "SELECT * FROM records"
    params: list[str] = []
    if status is not None:
        sql += " WHERE status = ?"
        params.append(status)
    records = [_record_from_row(row) for row in conn.execute(sql + " ORDER BY id DESC", params)]
    if contributor is not None:
        records = [record for record in records if contributor in record.contributors]
    return records


def index_record(conn: sqlite3.Connection, record: Record) -> None:
    """Put a confirmed record into the full-text index, replacing any earlier entry."""
    changes = " ".join(f"{c.what}. {c.reason or ''}" for c in record.changes)
    conn.execute("DELETE FROM records_fts WHERE rowid = ?", (record.id,))
    conn.execute(
        "INSERT INTO records_fts (rowid, procedure, based_on, changes, troubleshooting,"
        " project_tags, contributors) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            record.id,
            record.procedure,
            record.based_on or "",
            changes,
            record.troubleshooting or "",
            " ".join(record.project_tags),
            " ".join(record.contributors),
        ),
    )
    conn.commit()


def search_records(conn: sqlite3.Connection, match: str, k: int) -> list[tuple[Record, float]]:
    """Confirmed records matching an FTS5 query, best first, with their BM25 score.

    FTS5's bm25() is lower for better matches; the score returned is its negation, so higher
    is better.
    """
    rows = conn.execute(
        "SELECT r.*, bm25(records_fts) AS rank FROM records_fts"
        " JOIN records r ON r.id = records_fts.rowid"
        " WHERE records_fts MATCH ? AND r.status = 'confirmed'"
        " ORDER BY rank LIMIT ?",
        (match, k),
    )
    return [(_record_from_row(row), -row["rank"]) for row in rows]


def matching_record_ids(conn: sqlite3.Connection, match: str) -> set[int]:
    """Ids of every confirmed record matching an FTS5 query."""
    rows = conn.execute(
        "SELECT r.id FROM records_fts JOIN records r ON r.id = records_fts.rowid"
        " WHERE records_fts MATCH ? AND r.status = 'confirmed'",
        (match,),
    )
    return {row["id"] for row in rows}


def insert_ask(
    conn: sqlite3.Connection,
    *,
    requester: str,
    question: str,
    hint_mode: bool,
    hit_ids: list[int],
    answer: Answer,
) -> int:
    """Log one question and its answer (04 §3). Returns the log entry's id."""
    cursor = conn.execute(
        "INSERT INTO asks (requester, question, hint_mode, hit_ids, answer) VALUES (?, ?, ?, ?, ?)",
        (requester, question, int(hint_mode), json.dumps(hit_ids), answer.model_dump_json()),
    )
    conn.commit()
    return cursor.lastrowid or 0


def find_info(conn: sqlite3.Connection, contributor: str, title: str) -> Info | None:
    """The first Info with this contributor and title, if any (used by the sample seeder)."""
    row = conn.execute(
        "SELECT * FROM infos WHERE contributor = ? AND title = ? ORDER BY id LIMIT 1",
        (contributor, title),
    ).fetchone()
    return None if row is None else _info_from_row(row)


def _require[T](value: T | None) -> T:
    if value is None:
        raise RuntimeError("a row written a moment ago is missing")
    return value
