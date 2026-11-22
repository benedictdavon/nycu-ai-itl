"""POST /api/ask: search confirmed records, answer with the records it cites, log the ask."""

from fastapi import APIRouter

from app import db
from app.api.deps import ConnDep
from app.decoder import service as decoder
from app.models import AskRequest, AskResponse
from app.retrieval import service as retrieval

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
def ask(body: AskRequest, conn: ConnDep) -> AskResponse:
    hits = retrieval.search(conn, body.question, k=5)
    answer = decoder.answer(body.question, hits, body.hint_mode)
    # Every question and answer is kept as evidence for the evaluation (04 §3).
    db.insert_ask(
        conn,
        requester=body.requester,
        question=body.question,
        hint_mode=body.hint_mode,
        hit_ids=[hit.record.id for hit in hits],
        answer=answer,
    )
    by_id = {hit.record.id: hit.record for hit in hits}
    # The decoder already ran the citation check, so every cited id is one of the hits.
    sources = [by_id[record_id] for record_id in answer.cited_record_ids if record_id in by_id]
    return AskResponse(answer=answer, sources=sources)
