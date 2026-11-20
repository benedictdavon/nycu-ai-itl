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
    exclude: Annotated[list[str] | None, Query()] = None,
) -> SuggestResponse:
    """`exclude` may repeat: the requester and anyone already asked are never suggested."""
    if not q.strip():
        raise HTTPException(status_code=422, detail="q is required.")
    skip = [person.strip() for person in exclude or [] if person.strip()]
    name = retrieval.suggest_contributor(conn, q, exclude=skip)
    return SuggestResponse(contributor=name)
