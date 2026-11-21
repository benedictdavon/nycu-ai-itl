"""Load samples/records/ as confirmed, searchable records, for development and demos.

Run from backend/:  uv run python -m app.retrieval.seed
Each NN-slug.json gives the Info fields and the expected M; NN-slug.txt is the Info text.
The record is confirmed by its uploader. A sample already in the database (same contributor
and title) is skipped, so running it twice is safe.
"""

import json
import sqlite3
from pathlib import Path

from app import db
from app.config import REPO_ROOT, get_settings
from app.models import RecordDraft
from app.retrieval import service as retrieval

SAMPLES = REPO_ROOT / "samples" / "records"


def seed(conn: sqlite3.Connection, samples: Path = SAMPLES) -> int:
    """Load every sample not yet in the database. Returns how many were added."""
    added = 0
    for key_path in sorted(samples.glob("*.json")):
        key = json.loads(key_path.read_text(encoding="utf-8"))
        info_fields = key["info"]
        if db.find_info(conn, info_fields["contributor"], info_fields["title"]):
            continue
        info = db.insert_info(
            conn,
            kind=info_fields["kind"],
            contributor=info_fields["contributor"],
            title=info_fields["title"],
            text=key_path.with_suffix(".txt").read_text(encoding="utf-8").strip(),
            link=info_fields.get("link"),
            project_tags=info_fields.get("project_tags", []),
        )
        record = db.insert_record(conn, info.id, RecordDraft.model_validate(key["record"]))
        retrieval.index(conn, db.confirm_record(conn, record.id, info.contributor))
        added += 1
    return added


def main() -> None:
    settings = get_settings()
    conn = db.connect(settings.db_path)
    try:
        db.init_db(conn)
        print(f"Added {seed(conn)} sample records to {settings.db_path}.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
