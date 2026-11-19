"""POST /api/ask: search confirmed records, then answer with the records it cites."""

from fastapi import APIRouter

from app.api.deps import ConnDep
from app.decoder import service as decoder
from app.models import AskRequest, AskResponse
from app.retrieval import service as retrieval

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, conn: ConnDep) -> AskResponse:
    hits = retrieval.search(conn, body.question, k=5)
    answer = decoder.answer(body.question, hits, body.hint_mode)
    by_id = {hit.record.id: hit.record for hit in hits}
    # Only records that were in the hits can be sources. Part C adds the full citation check.
    sources = [by_id[record_id] for record_id in answer.cited_record_ids if record_id in by_id]
    return AskResponse(answer=answer, sources=sources)
