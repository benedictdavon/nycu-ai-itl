"""Records: list (the review inbox), view, edit a draft, confirm."""

import sqlite3
from typing import Literal

from fastapi import APIRouter, HTTPException

from app import db
from app.api.deps import ConnDep
from app.models import ConfirmRequest, Record, RecordDraft, RecordView
from app.retrieval import service as retrieval

router = APIRouter()


def _require_draft(conn: sqlite3.Connection, record_id: int) -> Record:
    record = db.get_record(conn, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"No record with id {record_id}.")
    if record.status == "confirmed":
        raise HTTPException(status_code=409, detail="This record is already confirmed.")
    return record


@router.get("/records", response_model=list[Record])
def list_records(
    conn: ConnDep,
    status: Literal["draft", "confirmed"] | None = None,
    contributor: str | None = None,
) -> list[Record]:
    return db.list_records(conn, status=status, contributor=contributor or None)


@router.get("/records/{record_id}", response_model=RecordView)
def get_record(record_id: int, conn: ConnDep) -> RecordView:
    record = db.get_record(conn, record_id)
    info = db.get_info(conn, record.info_id) if record else None
    if record is None or info is None:
        raise HTTPException(status_code=404, detail=f"No record with id {record_id}.")
    return RecordView(record=record, info=info)


@router.put("/records/{record_id}", response_model=Record)
def update_record(record_id: int, body: RecordDraft, conn: ConnDep) -> Record:
    _require_draft(conn, record_id)
    try:
        return db.update_record_draft(conn, record_id, body)
    except ValueError as exc:  # confirmed by another request in the meantime
        raise HTTPException(status_code=409, detail="This record is already confirmed.") from exc


@router.post("/records/{record_id}/confirm", response_model=Record)
def confirm_record(record_id: int, body: ConfirmRequest, conn: ConnDep) -> Record:
    record = _require_draft(conn, record_id)
    confirmed_by = body.confirmed_by.strip()
    if confirmed_by not in record.contributors:
        raise HTTPException(status_code=403, detail="Only a listed contributor can confirm.")
    try:
        confirmed = db.confirm_record(conn, record_id, confirmed_by)
    except ValueError as exc:  # confirmed by another request in the meantime
        raise HTTPException(status_code=409, detail="This record is already confirmed.") from exc
    retrieval.index(conn, confirmed)
    return confirmed
