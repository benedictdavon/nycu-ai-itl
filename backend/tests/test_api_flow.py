"""The walking skeleton: paste a record, review and confirm the draft, ask about it.

Fake LLM, stub encoder, real search. All names and records are made up.
"""

from fastapi.testclient import TestClient

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
    # 1. Alex pastes a record; the stub encoder makes a draft straight away.
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
