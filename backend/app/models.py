"""Shared data structures: the contract between all parts (architecture.md §3).

Owner: scaffold. Changes need a PR reviewed by every part owner.
"""

from typing import Literal

from pydantic import BaseModel, Field


class Change(BaseModel):
    what: str
    reason: str | None = None


class Info(BaseModel):
    id: int
    kind: Literal["upload", "discussion"]
    contributor: str
    title: str
    text: str
    link: str | None = None
    project_tags: list[str] = []
    has_file: bool = False  # an original file can be downloaded


class RecordDraft(BaseModel):
    procedure: str
    based_on: str | None = None
    contributors: list[str] = Field(min_length=1)
    project_tags: list[str] = []
    changes: list[Change] = []
    troubleshooting: str | None = None
    gaps: list[str] = []


class Record(RecordDraft):
    id: int
    info_id: int
    status: Literal["draft", "confirmed"]
    confirmed_by: str | None = None


class FollowUp(BaseModel):
    question: str
    answer: str | None = None


class EncoderResult(BaseModel):
    kind: Literal["question", "draft"]
    question: str | None = None
    draft: RecordDraft | None = None


class Hit(BaseModel):
    record: Record
    score: float


class Answer(BaseModel):
    kind: Literal["answered", "insufficient"]
    text: str
    cited_record_ids: list[int] = []
    contributors: list[str] = []
    uncertainties: list[str] = []


# ---- API request/response models ----
class EncodeState(BaseModel):
    info: Info
    follow_ups: list[FollowUp]
    result: EncoderResult
    record_id: int | None = None  # set iff result.kind == "draft"


class FollowUpAnswer(BaseModel):
    answer: str = Field(min_length=1)


class ConfirmRequest(BaseModel):
    confirmed_by: str = Field(min_length=1)


class RecordView(BaseModel):
    record: Record
    info: Info


class AskRequest(BaseModel):
    question: str = Field(min_length=3)
    requester: str = Field(min_length=1)
    hint_mode: bool = False


class AskResponse(BaseModel):
    answer: Answer
    sources: list[Record]  # the cited records, in cited order


class SuggestResponse(BaseModel):
    contributor: str | None


class DiscussionCreate(BaseModel):
    requester: str = Field(min_length=1)
    contributor: str = Field(min_length=1)
    question: str = Field(min_length=3)
    text: str = Field(min_length=1)
    link: str | None = None


class Health(BaseModel):
    status: Literal["ok"]
    llm_backend: Literal["fake", "llama_server"]
    llm_model: str
