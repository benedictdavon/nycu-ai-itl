"""POST /api/discussions: a resolved discussion becomes a draft in the contributor's inbox."""

import pytest
from fastapi.testclient import TestClient

from app.encoder import service as encoder
from app.models import EncoderResult

CHRIS = "Chris Wu"
ALEX = "Alex Chen"
BODY = {
    "requester": CHRIS,
    "contributor": ALEX,
    "question": "Why did strain X clump after washing?",
    "text": "Chris Wu: Why did the cells clump?\n\nAlex Chen: Double the wash volume.",
    "link": "https://example.org/chat/1",
}


def test_saved_as_a_draft_for_the_contributor(client: TestClient) -> None:
    response = client.post("/api/discussions", json=BODY)
    assert response.status_code == 200
    state = response.json()
    assert state["result"]["kind"] == "draft"
    assert state["follow_ups"] == []
    info = state["info"]
    assert (info["kind"], info["contributor"]) == ("discussion", ALEX)
    assert (info["title"], info["text"], info["link"]) == (
        BODY["question"],
        BODY["text"],
        BODY["link"],
    )

    inbox = client.get("/api/records", params={"status": "draft", "contributor": ALEX}).json()
    assert [record["id"] for record in inbox] == [state["record_id"]]
    assert ALEX in inbox[0]["contributors"]


def test_blank_fields_are_422_per_field(client: TestClient) -> None:
    response = client.post("/api/discussions", json=BODY | {"contributor": " ", "text": "\n"})
    assert response.status_code == 422
    assert [item["loc"] for item in response.json()["detail"]] == [
        ["body", "contributor"],
        ["body", "text"],
    ]
    assert client.get("/api/records").json() == []


def test_a_question_from_the_encoder_is_refused(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    question = EncoderResult(kind="question", question="Which plasmid?")
    monkeypatch.setattr(encoder, "encode", lambda info, follow_ups: question)
    response = client.post("/api/discussions", json=BODY)
    assert response.status_code == 500
    assert client.get("/api/records").json() == []
