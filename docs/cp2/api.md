# CP2 HTTP API

The contract between the backend and the frontend. The Python models live in [`backend/app/models.py`](../../backend/app/models.py); the running server also serves the OpenAPI schema at `/docs` and `/openapi.json`.

All JSON unless noted. Errors use FastAPI's default `{"detail": ...}`. Every endpoint is a plain `def` (not `async def`), because `sqlite3` blocks. Any route that calls the LLM returns **503** when the LLM fails.

## In the scaffold

| Method and path | Request | Response | Errors |
|---|---|---|---|
| `GET /api/health` | — | `Health` | — |
| `POST /api/infos` | **multipart/form-data**: `contributor`*, `title`*, `text`*, `link`?, `tags`? (comma-separated) | `EncodeState` (always a draft for now) | 422 blank field; 503 |
| `GET /api/records` | query `status`?, `contributor`? | `Record[]`, newest first | 422 bad status |
| `GET /api/records/{id}` | — | `RecordView` | 404 |
| `PUT /api/records/{id}` | `RecordDraft` | `Record` | 404; 409 already confirmed; 422 |
| `POST /api/records/{id}/confirm` | `ConfirmRequest` | `Record` | 404; 409 already confirmed; 403 `confirmed_by` not in `contributors` |
| `POST /api/ask` | `AskRequest` | `AskResponse` | 422; 503 |

**Ask flow** (`api/ask.py`): `hits = retrieval.search(conn, q, k=5)`, then `answer = decoder.answer(q, hits, hint_mode)`, then return the cited records that were in the hits as `sources`, in cited order.

**Confirm flow:** `db.confirm_record`, then `retrieval.index(conn, record)`.

## Added by the parts

The request and response models already exist in `models.py`. The owner of each route settles its error codes and adds them here.

| Method and path | Request | Response | Part |
|---|---|---|---|
| `POST /api/infos` with `file` | multipart, `file` instead of `text` | `EncodeState`, possibly a question | B |
| `GET /api/infos/{id}` | — | `EncodeState` (current state, for page reloads) | B |
| `POST /api/infos/{id}/follow-ups` | `FollowUpAnswer` | `EncodeState` | B |
| `GET /api/infos/{id}/file` | — | the original file | B |
| `GET /api/suggest-contributor` | query `q`*, `exclude`? (repeatable, for example `?exclude=A&exclude=B`: the requester and anyone already asked; never suggested) | `SuggestResponse`; `contributor` is `null` when no record is relevant enough (rule in `retrieval/service.py`, `suggest_contributor`). Errors: 422 missing or blank `q` | A |
| `POST /api/discussions` | `DiscussionCreate` (JSON) | `EncodeState`, always a draft with `record_id`, in the contributor's inbox. The `Info` has `kind: "discussion"`, the question as `title` and the chat as `text`. Errors: 422 missing or blank field (`detail[].loc` names each field); 500 the encoder asked a question; 503 | C |
| `GET /api/members` | — | `string[]` from `samples/members.json` | D |

## Models

```python
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
```
