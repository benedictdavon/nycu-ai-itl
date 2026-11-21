"""GET /api/members: the lab members to pick from (no login in CP2). Owner: Part D."""

import json

from fastapi import APIRouter

from app.config import REPO_ROOT

router = APIRouter()


@router.get("/members", response_model=list[str])
def list_members() -> list[str]:
    path = REPO_ROOT / "samples" / "members.json"
    with path.open(encoding="utf-8") as handle:
        members: list[str] = json.load(handle)
    return members
