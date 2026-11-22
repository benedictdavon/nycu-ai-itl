"""Infos: a contributor pastes a raw record; the encoder asks follow-up questions or drafts M.

Pasted text only for now; file uploads come in a later Part B PR.
"""

import sqlite3
from typing import Annotated

from fastapi import APIRouter, Form, HTTPException

from app import db
from app.api.deps import ConnDep
from app.encoder import service as encoder
from app.models import EncoderResult, EncodeState, FollowUp, FollowUpAnswer, Info, RecordDraft

router = APIRouter()


def _require_info(conn: sqlite3.Connection, info_id: int) -> Info:
    info = db.get_info(conn, info_id)
    if info is None:
        raise HTTPException(status_code=404, detail=f"No record upload with id {info_id}.")
    return info


def _state(conn: sqlite3.Connection, info: Info) -> EncodeState:
    """Where an Info is now: its draft if there is one, else its open question."""
    follow_ups = db.list_follow_ups(conn, info.id)
    record = db.get_record_for_info(conn, info.id)
    if record is not None:
        draft = RecordDraft.model_validate(record.model_dump(include=set(RecordDraft.model_fields)))
        result = EncoderResult(kind="draft", draft=draft)
        return EncodeState(info=info, follow_ups=follow_ups, result=result, record_id=record.id)
    if follow_ups and follow_ups[-1].answer is None:
        result = EncoderResult(kind="question", question=follow_ups[-1].question)
        return EncodeState(info=info, follow_ups=follow_ups, result=result)
    # Only when the model failed on the first call: nothing to resume from.
    raise HTTPException(status_code=409, detail="This upload was never encoded. Upload it again.")


def _save(conn: sqlite3.Connection, info: Info, result: EncoderResult) -> EncodeState:
    """Store the encoder's next step: a new open question, or the draft M."""
    if result.kind == "question" and result.question:
        db.insert_follow_up(conn, info.id, result.question)
    elif result.draft is not None:
        db.insert_record(conn, info.id, result.draft)
    return _state(conn, info)


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
    if len(text) > encoder.MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"The record is {len(text):,} characters; the limit is"
            f" {encoder.MAX_TEXT_CHARS:,}. Split it into smaller records.",
        )
    info = db.insert_info(
        conn,
        kind="upload",
        contributor=contributor,
        title=title,
        text=text,
        link=(link or "").strip() or None,
        project_tags=[tag.strip() for tag in (tags or "").split(",") if tag.strip()],
    )
    return _save(conn, info, encoder.encode(info, follow_ups=[]))


@router.get("/infos/{info_id}", response_model=EncodeState)
def get_info(info_id: int, conn: ConnDep) -> EncodeState:
    return _state(conn, _require_info(conn, info_id))


@router.post("/infos/{info_id}/follow-ups", response_model=EncodeState)
def answer_follow_up(info_id: int, body: FollowUpAnswer, conn: ConnDep) -> EncodeState:
    """Answer the open question, then ask the next one or draft M (D2-3b)."""
    info = _require_info(conn, info_id)
    answer = body.answer.strip()
    if not answer:
        raise HTTPException(status_code=422, detail="The answer is blank.")
    follow_ups = db.list_follow_ups(conn, info.id)
    if db.get_record_for_info(conn, info.id) is not None or not (
        follow_ups and follow_ups[-1].answer is None
    ):
        raise HTTPException(status_code=409, detail="There is no open question for this upload.")
    answered = [*follow_ups[:-1], FollowUp(question=follow_ups[-1].question, answer=answer)]
    # Encode first, store after: if the model fails (503), the question stays open to retry.
    result = encoder.encode(info, answered)
    try:
        db.answer_follow_up(conn, info.id, len(follow_ups), answer)
    except ValueError as exc:  # another request (double click, second tab) answered it first
        raise HTTPException(status_code=409, detail="This question was already answered.") from exc
    return _save(conn, info, result)
