"""Search over confirmed M (D3-1).

Owner: Part A. SQLite FTS5 keyword search with the `porter` tokenizer (architecture.md §4), so
"transform" also matches "transformation". The SQL is in app/db.py.
"""

import re
import sqlite3

from app import db
from app.models import Hit, Record

# Words that say nothing about the lab work. Without this list, a question like "Has anyone
# done this?" would match records through "has", "anyone" or "this".
STOPWORDS = frozenset(
    """
    a about after all also an and any anyone anything are as at be been before but by can could
    did do does doing for from get got had has have how i if in into is it its me my no not of
    on or our should so some someone something than that the their them then there these they
    this those to was we were what when where which who whom why will with would you your
    """.split()
)


def keywords(query: str) -> list[str]:
    """The question's words without stopwords, lower case, in order, without repeats."""
    words = re.findall(r"[^\W_]+", query.lower())
    return list(dict.fromkeys(word for word in words if word not in STOPWORDS))


def _match(words: list[str]) -> str:
    """An FTS5 query matching any of the words. Quoting keeps user text out of FTS5 syntax."""
    return " OR ".join(f'"{word}"' for word in words)


def index(conn: sqlite3.Connection, record: Record) -> None:
    """Make a just-confirmed record searchable."""
    db.index_record(conn, record)


def search(conn: sqlite3.Connection, query: str, k: int = 5) -> list[Hit]:
    """Confirmed records that share a keyword with the query, best first (BM25), at most k."""
    words = keywords(query)
    if not words or k <= 0:  # SQLite reads a negative LIMIT as "no limit"
        return []
    return [
        Hit(record=record, score=score)
        for record, score in db.search_records(conn, _match(words), k)
    ]
