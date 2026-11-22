"""GET /api/members lists the members from samples/members.json."""

import json

from fastapi.testclient import TestClient

from app.config import REPO_ROOT


def test_members_match_the_sample_file(client: TestClient) -> None:
    response = client.get("/api/members")
    assert response.status_code == 200
    expected = json.loads((REPO_ROOT / "samples" / "members.json").read_text(encoding="utf-8"))
    assert response.json() == expected
