"""Search over confirmed M (D3-1).

Stub until Part A: a record matches when its procedure shares a word with the question.
Part A replaces it with SQLite FTS5 (architecture.md §4).
"""

import sqlite3

from app.db import list_records
from app.models import Hit, Record


def index(conn: sqlite3.Connection, record: Record) -> None:
    """Make a just-confirmed record searchable. [Stub -> Part A]"""
    # Nothing to do: search() reads the confirmed records straight from the table.


def search(conn: sqlite3.Connection, query: str, k: int = 5) -> list[Hit]:
    """Confirmed records only, best first, at most k. [Stub -> Part A]"""
    words = set(query.lower().split())
    hits = []
    for record in list_records(conn, status="confirmed"):
        score = len(words & set(record.procedure.lower().split()))
        if score > 0:
            hits.append(Hit(record=record, score=float(score)))
    hits.sort(key=lambda hit: -hit.score)
    return hits[:k]
