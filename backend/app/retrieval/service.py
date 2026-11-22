"""Search over confirmed M (D3-1), and the most relevant contributor (D3-3).

Owner: Part A. SQLite FTS5 keyword search with the `porter` tokenizer (architecture.md §4), so
"transform" also matches "transformation". The SQL is in app/db.py.
"""

import re
import sqlite3
from collections import defaultdict
from collections.abc import Collection

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

# How many of the best hits suggest_contributor() looks at.
SUGGEST_POOL = 20


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


def suggest_contributor(
    conn: sqlite3.Connection, query: str, exclude: str | Collection[str] = ()
) -> str | None:
    """The contributor with the most relevant confirmed records (D3-3).

    "Relevant enough" (the D3-3 threshold): a record counts only if it contains more than half
    of the query's keywords (stopwords removed, words stemmed), so 1 of 1, 2 of 2, 2 of 3, 3 of
    4 or 5. Each counted record adds its search score to each of its contributors, and the
    highest total wins. None if no record counts.

    Names in `exclude` are never suggested: the requester, so nobody is pointed to themselves,
    and anyone already asked about this question (D3-5). One name may be passed as a string.
    """
    words = keywords(query)
    if not words:
        return None
    skip = {exclude} if isinstance(exclude, str) else set(exclude)
    needed = len(words) // 2 + 1
    matched: dict[int, int] = defaultdict(int)
    for word in words:
        for record_id in db.matching_record_ids(conn, _match([word])):
            matched[record_id] += 1

    totals: dict[str, float] = defaultdict(float)
    for hit in search(conn, query, k=SUGGEST_POOL):
        if matched[hit.record.id] >= needed:
            for name in hit.record.contributors:
                if name not in skip:
                    totals[name] += hit.score
    return max(totals, key=lambda name: totals[name]) if totals else None
