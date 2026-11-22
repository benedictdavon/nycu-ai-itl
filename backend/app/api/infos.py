"""Infos: a contributor pastes or uploads a raw record; the encoder asks or drafts M."""

import sqlite3
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app import db
from app.api.deps import ConnDep, SettingsDep
from app.config import Settings
from app.encoder import service as encoder
from app.ingest import service as ingest
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


def _uploads(settings: Settings) -> Path:
    """Original files are kept in uploads/, next to the database (so under data/)."""
    return settings.db_path.parent / "uploads"


def _read_file(name: str, file: UploadFile) -> tuple[str, bytes]:
    """The file's text and bytes, or a clear error the Add screen can show."""
    data = file.file.read(ingest.MAX_FILE_BYTES + 1)  # 多讀 1 byte，才知道有沒有超過
    if len(data) > ingest.MAX_FILE_BYTES:
        limit = ingest.MAX_FILE_BYTES // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"{name} is over {limit} MB.")
    try:
        text = ingest.extract_text(name, data)
    except ingest.UnsupportedFileType as exc:
        types = ", ".join(ingest.TYPES)
        detail = f"{name} can't be read. Upload one of: {types}."
        raise HTTPException(status_code=415, detail=detail) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"{name} could not be read.") from exc
    if not text:
        detail = f"No text found in {name}. Scanned pages and photos can't be read yet."
        raise HTTPException(status_code=422, detail=detail)
    return text, data


def _save_file(settings: Settings, name: str, data: bytes) -> str:
    """Keep the original under its own name, in a new folder; returns the path in uploads/."""
    relative = f"{uuid.uuid4().hex}/{name}"
    path = _uploads(settings) / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return relative


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
    settings: SettingsDep,
    contributor: Annotated[str, Form()],
    title: Annotated[str, Form()],
    text: Annotated[str | None, Form()] = None,
    file: Annotated[UploadFile | None, File()] = None,
    link: Annotated[str | None, Form()] = None,
    tags: Annotated[str | None, Form()] = None,
) -> EncodeState:
    """Send the record as `text` or as `file` (.txt, .md, .pdf, .docx), not both."""
    contributor, title, text = contributor.strip(), title.strip(), (text or "").strip()
    if not (contributor and title and (text or file is not None)):
        detail = "contributor, title, and text or a file are required."
        raise HTTPException(status_code=422, detail=detail)
    if text and file is not None:
        raise HTTPException(status_code=422, detail="Send the text or a file, not both.")
    name, data = "", b""
    if file is not None:
        name = Path(file.filename or "").name  # 只留檔名，不信任使用者給的路徑
        text, data = _read_file(name, file)
    if len(text) > encoder.MAX_TEXT_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"The record is {len(text):,} characters; the limit is"
            f" {encoder.MAX_TEXT_CHARS:,}. Split it into smaller records.",
        )
    file_path = None
    if file is not None:  # 檢查都通過才存檔，被拒絕的檔案不會留在 data/
        file_path = _save_file(settings, name, data)
    info = db.insert_info(
        conn,
        kind="upload",
        contributor=contributor,
        title=title,
        text=text,
        link=(link or "").strip() or None,
        project_tags=[tag.strip() for tag in (tags or "").split(",") if tag.strip()],
        file_path=file_path,
    )
    return _save(conn, info, encoder.encode(info, follow_ups=[]))


@router.get("/infos/{info_id}", response_model=EncodeState)
def get_info(info_id: int, conn: ConnDep) -> EncodeState:
    return _state(conn, _require_info(conn, info_id))


@router.get("/infos/{info_id}/file")
def get_info_file(info_id: int, conn: ConnDep, settings: SettingsDep) -> FileResponse:
    """The original file, as it was uploaded (D1-3)."""
    _require_info(conn, info_id)
    relative = db.get_info_file_path(conn, info_id)
    path = _uploads(settings) / relative if relative else None
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="This record has no original file.")
    return FileResponse(path, filename=path.name)


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
