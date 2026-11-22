"""POST /api/discussions: save a resolved discussion as a draft M for the contributor (D3-4).

The requester asked the contributor directly and both agree it is resolved. The chat is stored
as an Info of kind "discussion" (the question as its title) and goes through the encoder with no
follow-up questions, into the contributor's review inbox.
"""

from fastapi import APIRouter, HTTPException

from app import db
from app.api.deps import ConnDep
from app.encoder import service as encoder
from app.models import DiscussionCreate, EncodeState

router = APIRouter()


@router.post("/discussions", response_model=EncodeState)
def create_discussion(body: DiscussionCreate, conn: ConnDep) -> EncodeState:
    fields = {
        "requester": body.requester.strip(),
        "contributor": body.contributor.strip(),
        "question": body.question.strip(),
        "text": body.text.strip(),
    }
    blank = [name for name, value in fields.items() if not value]
    if blank:  # FastAPI's validation shape, so the frontend shows the message under the field
        detail = [{"loc": ["body", name], "msg": "Must not be blank."} for name in blank]
        raise HTTPException(status_code=422, detail=detail)
    info = db.insert_info(
        conn,
        kind="discussion",
        contributor=fields["contributor"],
        title=fields["question"],
        text=fields["text"],
        link=(body.link or "").strip() or None,
    )
    result = encoder.encode(info, follow_ups=[])
    # Guard in code: a discussion never gets follow-up questions (D3-4).
    if result.kind != "draft" or result.draft is None:
        raise HTTPException(status_code=500, detail="The encoder asked about a discussion.")
    record = db.insert_record(conn, info.id, result.draft)
    return EncodeState(info=info, follow_ups=[], result=result, record_id=record.id)
