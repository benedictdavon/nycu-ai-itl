"""GET /api/suggest-contributor: the contributor with the most relevant records (D3-3)."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import ConnDep
from app.models import SuggestResponse
from app.retrieval import service as retrieval

router = APIRouter()


@router.get("/suggest-contributor", response_model=SuggestResponse)
def suggest_contributor(
    conn: ConnDep,
    q: Annotated[str, Query()],
    exclude: Annotated[str | None, Query()] = None,
) -> SuggestResponse:
    """`exclude` is the requester's name, so they are never suggested to themselves."""
    if not q.strip():
        raise HTTPException(status_code=422, detail="q is required.")
    name = retrieval.suggest_contributor(conn, q, exclude=(exclude or "").strip() or None)
    return SuggestResponse(contributor=name)
