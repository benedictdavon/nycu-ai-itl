# CP2: Prototype Architecture

**Status:** Draft for team review. Comment on the PR, especially on §3 (interfaces) and §6 (owners).

This file says **how** we build the CP2 prototype. **What** we build is already in [03 Interaction Design](../cp1/03_interaction_design.md): the roles, the flow, the fields of `M` (D1), the encoder (D2), the decoder (D3), and the scope in "First Version (Planned for CP2)". This file does not repeat those. If the two disagree, 03 decides what the product does, and we fix this file.

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic | JSON API under `/api`. |
| Storage | SQLite (Python's built-in `sqlite3`, no ORM) | One file in `data/`. Full-text search with FTS5 (§4). |
| LLM | Ollama, running locally on the demo laptop | Model chosen by test on that laptop (§4). Records never leave the machine (04 §5). |
| File reading | Part B chooses (for example `pypdf`, `python-docx`) | PDF, DOCX, TXT/MD. Benchling exports are read by their file type. |
| Frontend | React, TypeScript, Vite, shadcn/ui (Tailwind) | Built into static files that FastAPI serves, so the demo is one process. Part D builds it. |
| Tests | `pytest` | Unit tests, plus the prompt test suite (§5). |

## 2. The scaffold, and who adds what

The scaffold is deliberately small: the contract, and **one thin path through every layer** (paste a record → stub encoder → draft → edit and confirm → ask → stub search → stub decoder → answer with a source). Everything else is built by the part owners, so the prototype is the team's work and not one person's.

```text
backend/
  app/
    models.py        Shared data structures (§3). The contract.        [Scaffold, changes need review]
    main.py          FastAPI app factory                               [Scaffold]
    config.py        Settings from environment variables               [Scaffold]
    llm.py           Ollama client + fake client for tests             [Scaffold]
    db.py            SQLite tables (infos, records) and queries        [Scaffold, then Part A]
    api/             HTTP routes, thin: call the services below        [Scaffold, then each part]
    retrieval/       Search over confirmed M (stub)                    [Part A]
    encoder/         Draft M (stub: copies the title, asks nothing)    [Part B]
    decoder/         Answer (stub: names the best hit)                 [Part C]
  tests/             test_api_flow.py walks the skeleton end to end
frontend/            React app                                         [Part D]
samples/             Made-up records and members for dev and demos     [everyone]
data/                SQLite file and uploads (git-ignored)
```

Each part owns its folder and adds the routes, tables and modules listed for it in §6. To change another part's folder or `models.py`, open a PR and ask that owner to review it.

## 3. Interfaces

Each part only depends on these. The exact contract is [`backend/app/models.py`](../../backend/app/models.py), the module signatures in `backend/app/`, and [api.md](api.md).

### Shared data (`app/models.py`)

```python
class Change(BaseModel):
    what: str                        # "Wash volume doubled"
    reason: str | None = None        # "Cells clumped with the SOP volume"

class Info(BaseModel):               # D1-1: a raw record, as uploaded or saved
    id: int
    kind: Literal["upload", "discussion"]   # discussion = D3-4 saved discussion
    contributor: str
    title: str                       # file name or discussion title
    text: str                        # extracted plain text
    link: str | None = None          # Benchling / Drive URL, if given
    project_tags: list[str] = []     # optional tag at upload (03 Inputs); the encoder uses it
    has_file: bool = False           # the original file can be downloaded

class RecordDraft(BaseModel):        # M before the contributor confirms it (D2-3a)
    procedure: str
    based_on: str | None = None      # e.g. Drive SOP "Transformation v2"
    contributors: list[str] = Field(min_length=1)   # at least one (D1-4)
    project_tags: list[str] = []
    changes: list[Change] = []
    troubleshooting: str | None = None
    gaps: list[str] = []             # what the encoder could not fill in; shown on review

class Record(RecordDraft):           # M
    id: int
    info_id: int                     # the Info this M came from (D1-2: one Info, one M)
    status: Literal["draft", "confirmed"]
    confirmed_by: str | None = None
```

The fields follow the worked example in 03. Only `confirmed` records are searchable (D2-3a). `models.py` already holds the shapes the parts will need (`FollowUp`, `SuggestResponse`, `DiscussionCreate`), so adding a route does not change the contract.

### Part A: storage and retrieval (`db.py`, `retrieval/`)

```python
# `conn` is the request's sqlite3 connection: all SQL stays in one place, and tests use :memory:.
def index(conn, record: Record) -> None                  # called when a record is confirmed
def search(conn, query: str, k: int = 5) -> list[Hit]    # confirmed records only, best first
def suggest_contributor(conn, query: str) -> str | None  # D3-3; None if nothing is relevant enough (Part A adds it)

class Hit(BaseModel):
    record: Record
    score: float
```

### Part B: ingest and encoder (`ingest/`, `encoder/`)

```python
def extract_text(filename: str, data: bytes) -> str     # Part B adds it

class FollowUp(BaseModel):
    question: str
    answer: str | None = None

class EncoderResult(BaseModel):
    kind: Literal["question", "draft"]
    question: str | None = None       # when kind == "question" (D2-3b)
    draft: RecordDraft | None = None  # when kind == "draft" (D2-3a)

def encode(info: Info, follow_ups: list[FollowUp]) -> EncoderResult
```

The encoder asks one question at a time, at most two in total. **The limit is enforced in code, not only in the prompt**, so it holds whatever the model does: a third question becomes a draft, with the unasked question in `gaps`. The uploader always stays in `contributors` (D1-4), also after edits on review.

**A saved discussion (D3-4) goes straight to a draft, with no follow-up questions.** The requester submits it, so nobody is there to answer them. Anything the encoder would ask goes into `gaps`, and the contributor fills it in on review.

### Part C: decoder (`decoder/`)

```python
class Answer(BaseModel):
    kind: Literal["answered", "insufficient"]
    text: str                        # Markdown; hints instead of a full answer in hint mode (D3-1a)
    cited_record_ids: list[int] = [] # must come from the hits passed in
    contributors: list[str] = []     # contributors of the cited records (D3-1)
    uncertainties: list[str] = []    # what is missing or uncertain (D3-2)

def answer(question: str, hits: list[Hit], hint_mode: bool) -> Answer
```

**Citation check, in code:** any cited ID that was not in `hits` is removed, and `contributors` is recomputed from the cited records. If an `answered` answer has no valid citation left, it becomes `insufficient`. This is our main guard against the "invented parameter" failure in 04 §4. The scaffold only drops sources that were not in the hits.

### Shared: LLM client (`llm.py`)

```python
def chat_json(system: str, user: str, schema: type[T]) -> T
```

It uses Ollama's `/api/chat` with temperature 0 and asks for JSON in the shape of `schema`. `LLM_BACKEND=fake` returns canned replies, so the API and tests work without Ollama. If Ollama fails or the reply is not valid JSON, it raises `LLMError`, which the API returns as HTTP 503. Prompts live as files next to the encoder and decoder, not as strings in code. They are the source for the CP2 prompt documentation card.

### HTTP API (`api/`)

Full request and response shapes and error codes: [api.md](api.md).

| Method and path | Does | Spec | Built by |
|---|---|---|---|
| `GET /api/health` | Status and the LLM backend in use | — | Scaffold |
| `POST /api/infos` | Pasted text with contributor, optional link and tags. Runs the encoder. | D2-2c | Scaffold; Part B adds files and follow-ups |
| `GET /api/records?status=draft&contributor=X` | Contributor's inbox of drafts to review | D2-3a | Scaffold |
| `PUT /api/records/{id}` | Edit a draft | D2-3a | Scaffold |
| `POST /api/records/{id}/confirm` | Confirm. The record becomes searchable. | D2-3a | Scaffold |
| `GET /api/records/{id}` | One record with its source text and link | D1-3 | Scaffold |
| `POST /api/ask` | Question and hint mode in, `Answer` out | D3-1, D3-1a, D3-2 | Scaffold |
| `GET /api/infos/{id}` | Current state of an upload (question or draft), for page reloads | D2-3b | Part B |
| `POST /api/infos/{id}/follow-ups` | Answer the encoder's question. Returns the next question or the draft. | D2-3b | Part B |
| `GET /api/infos/{id}/file` | Download the original file | D1-3 | Part B |
| `GET /api/suggest-contributor?q=` | Most relevant contributor | D3-3 | Part A |
| `POST /api/discussions` | Save a resolved discussion as an `Info` of kind `discussion`. It goes through the encoder, with no follow-up questions, into the contributor's inbox. | D3-4 | Part C |
| `GET /api/members` | List of lab members to pick from (no login in CP2) | — | Part D |

### Part D: screens (`frontend/`)

1. **Who are you:** pick a name. It is kept in the browser.
2. **Contributor, upload:** file or pasted text, optional link and tags, then the follow-up question(s), then the review screen.
3. **Contributor, review inbox:** drafts waiting for review, including drafts made from saved discussions. Edit the fields, fill the `gaps`, confirm.
4. **Requester, ask:** question and hint toggle. The answer shows source links and contributor names. If the answer is `insufficient`, show the uncertainties, "suggest someone" or a member picker, and then "save resolved discussion".
5. **Record view:** `M` rendered as Markdown with a link to the original.

**Notifications** are an open question in 03. For CP2 the answer is the inbox in screen 3. There are no push notifications.

## 4. Choices made for CP2, and their fallbacks

| Topic | CP2 choice | If it fails |
|---|---|---|
| Model | The smallest Ollama model that passes the prompt suite on the demo laptop (Benedict's: RTX 3070 Ti 8 GB, 64 GB RAM), at about 30 seconds or less per reply. | Try a smaller model, or shorter prompts. Record the result in `docs/DECISIONS.md` (04 §5 requires this decision before CP2). |
| Language | Test records, prompts and the UI are in English. | — |
| Retrieval | SQLite FTS5 keyword search over the text of confirmed `M`, with the `porter` tokenizer so "transform" also matches "transformation". | If tests miss paraphrased questions, add embeddings from an Ollama embedding model. |
| "Enough to answer" rule (open in 03) | `insufficient` if search returns nothing relevant, or the model says the records do not answer the question, or no citation passes the check. | Part C adjusts it and records the rule. |
| Two people at once | Both use the laptop's address over the local network, each with a different name. | Campus Wi-Fi may block this. Fallback: two browser windows on the demo laptop. |

## 5. Tests

- **Unit tests** (`pytest`) for each part, using `LLM_BACKEND=fake`. `tests/test_api_flow.py` must keep passing; each part extends it with its own steps of the 03 flow.
- **Prompt test suite**: at least 10 cases across the encoder and decoder, run against the real model. Each case is an input plus the properties the output must have, for example "lists the wash change and its reason", "does not invent a plasmid amount" or "returns `insufficient`". It must include typical inputs and edge cases (unclear record, no relevant record, hint mode, a question answered only by a saved discussion). It must also include at least one documented cycle where a case failed and a prompt or code change fixed it (CP2 item 6).
- Test data is made up, starting from the strain X example in 03. No real lab records go in the repo. `samples/records/` has six records, each with its expected `M` as a `.json` answer key.

## 6. Owners and plan

| Part | Owner | Also writes for CP2 |
|---|---|---|
| Scaffold (§2, end-to-end with stubs) | Benedict | This file; `DECISIONS.md` entries for the stack; demo laptop |
| A: storage and retrieval | **TBD** | Merge plan entry in `DECISIONS.md` (CP2 item 10) |
| B: ingest and encoder | **TBD** | Encoder part of the prompt card and test suite |
| C: decoder | **TBD** | Decoder part of the prompt card and test suite |
| D: frontend | **TBD** | Design rationale (CP2 item 2) |

Shared: interim evaluation report, updated AI usage guidelines, two user testing sessions.

Every member needs at least two merged PRs with substantive code by CP2, so each part is split into at least two PRs (the lists below suggest where).

| When | What |
|---|---|
| Wed Nov 18 | This file reviewed. Owners chosen. |
| Thu Nov 19 | Scaffold PR merged: the thin path runs with the fake LLM. |
| Thu Nov 19 – Sat Nov 21 | Parts A–D in parallel, at least two PRs each, reviewed by someone other than the author. |
| Thu Nov 19 | Model tested on the demo laptop. |
| Sat Nov 21 | Merge day, with its entry in `DECISIONS.md`. The real encoder and decoder must be in by then, for the user tests. |
| Sat Nov 21 – Sun Nov 22 | Two user testing sessions with lab members outside the team. Prompt suite run, including one fail-then-fix cycle. |
| Sun Nov 22 | CP2 documents, contributor graph screenshot, zip. |
| Mon Nov 23, before class | Demo ready on the laptop. |

### Done when

Each part is done when its PRs are merged with every box below ticked. Progress is tracked in one GitHub issue per part with the same list.

**Every part:**
- [ ] The stub is replaced, and the word "stub" is gone from the part's code.
- [ ] `uv run ruff check .` and `uv run pytest -q` pass, with tests for the new behaviour. `test_api_flow.py` still passes.
- [ ] `models.py` is unchanged, or changed in a PR that every owner reviewed.
- [ ] Each PR is reviewed by someone other than the author.

**A: storage and retrieval** (`app/db.py`, `app/retrieval/`)
- [ ] PR 1: `search()` uses SQLite FTS5 with the `porter` tokenizer, over confirmed records only. `index()` adds a record on confirm. A test shows a different word form matches ("transform" finds a "transformation" record).
- [ ] PR 2: a seed script loads `samples/records/` as confirmed records. `GET /api/suggest-contributor` returns `None` when nothing is relevant enough, with the threshold written down.
- [ ] Every question and answer is logged (an `asks` table), and the encoder's first draft is kept next to the edited one, as evidence for the evaluation (04: number of corrections, invented details).
- [ ] The merge plan entry is in `DECISIONS.md` (CP2 item 10).

**B: ingest and encoder** (`app/ingest/`, `app/encoder/`, `app/api/infos.py`)
- [ ] PR 1: `POST /api/infos` takes a file. `.txt`, `.md`, `.pdf` and `.docx` are read, the original is saved under `data/`, and `GET /api/infos/{id}/file` returns it. Size limit and unsupported types return clear errors.
- [ ] PR 2: an encoder prompt file exists, and `encode()` calls `llm.chat_json`. Follow-up questions work (`follow_ups` table, `POST /api/infos/{id}/follow-ups`, `GET /api/infos/{id}` for reloads), at most two, enforced in code. The uploader stays a contributor.
- [ ] At least 5 encoder cases are in the prompt suite, typical and edge (for example an unclear record, or a record with nothing to ask). The encoder part of the prompt card is written.

**C: decoder** (`app/decoder/`, `app/api/ask.py`)
- [ ] PR 1: a decoder prompt file exists, and `answer()` calls `llm.chat_json`. It cites only records from the hits and names their contributors. The citation check runs in code. Hint mode gives hints, not full steps (D3-1a). The "not enough" rule is written down (§4).
- [ ] PR 2: `POST /api/discussions` saves a resolved discussion as a draft for the contributor, with no follow-up questions.
- [ ] At least 5 decoder cases are in the prompt suite, including no relevant record, hint mode, and a question only a saved discussion answers. At least one documented fail-then-fix cycle (CP2 item 6). The decoder part of the prompt card is written.

**D: frontend** (`frontend/`)
- [ ] PR 1: the five screens in §3 Part D work against the API, at phone width. `GET /api/members` lists the members from `samples/members.json`.
- [ ] PR 2: FastAPI serves the build from one process. Whether a draft can be confirmed with open `gaps` is decided and recorded.
- [ ] The design rationale is written (CP2 item 2).

**Shared:**
- [ ] A model is chosen on the demo laptop (latency, valid JSON, invented numbers) and recorded in `DECISIONS.md` (04 §5).
- [ ] The prompt suite has a runner and at least 10 cases, and is run against that model, with the results kept.
- [ ] Two user testing sessions are done, and the interim evaluation report and the AI usage guidelines are updated.

## 7. Open questions for the team

1. Who owns Parts A–D? Does the UI owner know React? If not, we switch to server-rendered pages.
2. Who books the two user testing sessions, and with whom?
