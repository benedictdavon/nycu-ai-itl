"""The walking skeleton: paste a record, review and confirm the draft, ask about it.

Fake LLM, real search. All names and records are made up.
"""

from fastapi.testclient import TestClient

from app import llm
from app.encoder.service import MAX_TEXT_CHARS, ModelReply
from app.models import RecordDraft

ALEX = "Alex Chen"
BEA = "Bea Lin"
TITLE = "Transformation of strain X with plasmid P"
TEXT = "First try: few colonies, cells clumped. Second try: doubled the wash volume."


def _paste(client: TestClient) -> dict:
    response = client.post("/api/infos", data={"contributor": ALEX, "title": TITLE, "text": TEXT})
    assert response.status_code == 200
    return response.json()


def test_paste_review_confirm_ask(client: TestClient) -> None:
    # 1. Alex pastes a record; with nothing queued, the fake LLM drafts straight away.
    state = _paste(client)
    assert state["result"]["kind"] == "draft"
    record_id = state["record_id"]

    # 2. The draft is in Alex's inbox. He edits it and confirms it.
    inbox = client.get("/api/records", params={"status": "draft", "contributor": ALEX}).json()
    assert [record["id"] for record in inbox] == [record_id]
    edited = {key: inbox[0][key] for key in RecordDraft.model_fields}
    edited["troubleshooting"] = "Doubled the wash volume because the cells clumped."
    assert client.put(f"/api/records/{record_id}", json=edited).status_code == 200
    confirm = client.post(f"/api/records/{record_id}/confirm", json={"confirmed_by": ALEX})
    assert confirm.json()["status"] == "confirmed"

    view = client.get(f"/api/records/{record_id}").json()
    assert view["info"]["text"] == TEXT
    assert view["record"]["troubleshooting"] == edited["troubleshooting"]

    # 3. Bea asks; the fake LLM cites the top hit, Alex's record.
    asked = client.post("/api/ask", json={"question": "strain X transformation", "requester": BEA})
    assert asked.json()["answer"]["kind"] == "answered"
    assert [source["id"] for source in asked.json()["sources"]] == [record_id]

    # 4. Something no record covers is "insufficient".
    unknown = client.post("/api/ask", json={"question": "zebrafish injection", "requester": BEA})
    assert unknown.json()["answer"]["kind"] == "insufficient"
    assert unknown.json()["sources"] == []

    # 5. Bea asks for someone to help (D3-3): Alex for strain X, nobody for zebrafish.
    suggest = client.get("/api/suggest-contributor", params={"q": "Why did strain X clump?"})
    assert suggest.json() == {"contributor": ALEX}
    params = {"q": "Why did strain X clump?", "exclude": ALEX}
    assert client.get("/api/suggest-contributor", params=params).json() == {"contributor": None}
    params = {"q": "Why did strain X clump?", "exclude": [BEA, " "]}  # repeated; blank ignored
    assert client.get("/api/suggest-contributor", params=params).json() == {"contributor": ALEX}
    nobody = client.get("/api/suggest-contributor", params={"q": "zebrafish injection"})
    assert nobody.json() == {"contributor": None}
    assert client.get("/api/suggest-contributor", params={"q": " "}).status_code == 422


def test_drafts_are_not_searchable(client: TestClient) -> None:
    _paste(client)
    asked = client.post("/api/ask", json={"question": "strain X transformation", "requester": BEA})
    assert asked.json()["answer"]["kind"] == "insufficient"


def test_blank_text_is_422(client: TestClient) -> None:
    response = client.post("/api/infos", data={"contributor": ALEX, "title": TITLE, "text": " "})
    assert response.status_code == 422


def test_confirm_rules(client: TestClient) -> None:
    record_id = _paste(client)["record_id"]
    assert client.post("/api/records/999/confirm", json={"confirmed_by": ALEX}).status_code == 404
    not_listed = client.post(f"/api/records/{record_id}/confirm", json={"confirmed_by": BEA})
    assert not_listed.status_code == 403

    client.post(f"/api/records/{record_id}/confirm", json={"confirmed_by": ALEX})
    again = client.post(f"/api/records/{record_id}/confirm", json={"confirmed_by": ALEX})
    assert again.status_code == 409
    edit = client.put(f"/api/records/{record_id}", json={"procedure": "x", "contributors": [ALEX]})
    assert edit.status_code == 409


# ---- Part B: follow-up questions (D2-3b) ----


def _queue(*questions: str | None) -> None:
    """Queue one model reply per question; None means the model drafts."""
    fake = llm.get_llm()
    assert isinstance(fake, llm.FakeClient)
    draft = RecordDraft(procedure=TITLE, contributors=[ALEX])
    fake.queue(*(ModelReply(question=q, draft=draft).model_dump_json() for q in questions))


def test_follow_up_questions_then_draft(client: TestClient) -> None:
    # 1. The encoder asks Alex a question first.
    _queue("Did you change the recovery step?", "How much plasmid?", "Which strain batch?")
    state = _paste(client)
    info_id = state["info"]["id"]
    assert state["result"] == {
        "kind": "question",
        "question": "Did you change the recovery step?",
        "draft": None,
    }
    assert state["follow_ups"] == [
        {"question": "Did you change the recovery step?", "answer": None}
    ]
    assert state["record_id"] is None
    assert client.get(f"/api/infos/{info_id}").json() == state  # a page reload

    # 2. He answers; it asks a second question.
    answer = {"answer": "No, same as the SOP."}
    state = client.post(f"/api/infos/{info_id}/follow-ups", json=answer).json()
    assert state["result"]["question"] == "How much plasmid?"
    assert [f["answer"] for f in state["follow_ups"]] == ["No, same as the SOP.", None]

    # 3. After two answers, a third question becomes a gap in the draft.
    state = client.post(f"/api/infos/{info_id}/follow-ups", json={"answer": "50 ng."}).json()
    assert state["result"]["kind"] == "draft"
    assert state["result"]["draft"]["gaps"] == ["Which strain batch?"]
    assert len(state["follow_ups"]) == 2
    assert client.get(f"/api/infos/{info_id}").json() == state

    # 4. The draft is in Alex's inbox, and no question is open any more.
    inbox = client.get("/api/records", params={"status": "draft", "contributor": ALEX}).json()
    assert [record["id"] for record in inbox] == [state["record_id"]]
    again = client.post(f"/api/infos/{info_id}/follow-ups", json={"answer": "x"})
    assert again.status_code == 409


def test_model_failure_keeps_the_question_open(client: TestClient) -> None:
    _queue("Did you change the recovery step?")
    info_id = _paste(client)["info"]["id"]
    fake = llm.get_llm()
    assert isinstance(fake, llm.FakeClient)
    fake.queue("not json")
    failed = client.post(f"/api/infos/{info_id}/follow-ups", json={"answer": "No."})
    assert failed.status_code == 503
    assert client.get(f"/api/infos/{info_id}").json()["result"]["kind"] == "question"

    retried = client.post(f"/api/infos/{info_id}/follow-ups", json={"answer": "No."})
    assert retried.json()["result"]["kind"] == "draft"  # nothing queued: the fake drafts


def test_follow_up_errors(client: TestClient) -> None:
    assert client.get("/api/infos/999").status_code == 404
    assert client.post("/api/infos/999/follow-ups", json={"answer": "x"}).status_code == 404
    _queue("Did you change the recovery step?")
    info_id = _paste(client)["info"]["id"]
    blank = client.post(f"/api/infos/{info_id}/follow-ups", json={"answer": " "})
    assert blank.status_code == 422


def test_too_long_text_is_413(client: TestClient) -> None:
    text = "x" * (MAX_TEXT_CHARS + 1)
    response = client.post("/api/infos", data={"contributor": ALEX, "title": TITLE, "text": text})
    assert response.status_code == 413
    assert client.get("/api/records").json() == []
