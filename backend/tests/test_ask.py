"""POST /api/ask logs every question and its answer in `asks` (04 §3)."""

import json

from fastapi.testclient import TestClient

from app import db
from app.models import Answer

ALEX = "Alex Chen"
BEA = "Bea Lin"


def _asks(client: TestClient) -> list:
    conn = db.connect(client.app.state.settings.db_path)
    try:
        return conn.execute("SELECT * FROM asks ORDER BY id").fetchall()
    finally:
        conn.close()


def test_every_ask_is_logged(client: TestClient) -> None:
    data = {"contributor": ALEX, "title": "Transformation of strain X", "text": "Doubled the wash."}
    record_id = client.post("/api/infos", data=data).json()["record_id"]
    client.post(f"/api/records/{record_id}/confirm", json={"confirmed_by": ALEX})

    found = {"question": "strain X transformation", "requester": BEA, "hint_mode": True}
    answered = client.post("/api/ask", json=found).json()["answer"]
    client.post("/api/ask", json={"question": "zebrafish injection", "requester": BEA})

    first, second = _asks(client)
    assert (first["requester"], first["question"], first["hint_mode"]) == (
        BEA,
        "strain X transformation",
        1,
    )
    assert json.loads(first["hit_ids"]) == [record_id]
    assert Answer.model_validate_json(first["answer"]) == Answer.model_validate(answered)
    assert json.loads(second["hit_ids"]) == []
    assert Answer.model_validate_json(second["answer"]).kind == "insufficient"
