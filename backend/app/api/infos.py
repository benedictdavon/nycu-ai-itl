"""POST /api/infos: a contributor pastes a raw record; the encoder turns it into a draft M.

Skeleton: pasted text only, and the encoder always returns a draft. Part B adds file uploads
and the follow-up questions (D2-3b).
"""

from typing import Annotated

from fastapi import APIRouter, Form, HTTPException

from app import db
from app.api.deps import ConnDep
from app.encoder import service as encoder
from app.models import EncodeState

router = APIRouter()


@router.post("/infos", response_model=EncodeState)
def create_info(
    conn: ConnDep,
    contributor: Annotated[str, Form()],
    title: Annotated[str, Form()],
    text: Annotated[str, Form()],
    link: Annotated[str | None, Form()] = None,
    tags: Annotated[str | None, Form()] = None,
) -> EncodeState:
    contributor, title, text = contributor.strip(), title.strip(), text.strip()
    if not (contributor and title and text):
        raise HTTPException(status_code=422, detail="contributor, title and text are required.")
    info = db.insert_info(
        conn,
        kind="upload",
        contributor=contributor,
        title=title,
        text=text,
        link=(link or "").strip() or None,
        project_tags=[tag.strip() for tag in (tags or "").split(",") if tag.strip()],
    )
    result = encoder.encode(info, follow_ups=[])
    if result.kind != "draft" or result.draft is None:
        raise HTTPException(status_code=501, detail="Follow-up questions are not built yet.")
    record = db.insert_record(conn, info.id, result.draft)
    return EncodeState(info=info, follow_ups=[], result=result, record_id=record.id)
