# Part A: Storage and Search

| | |
|---|---|
| **Owner** | Tommy |
| **Doc version** | 1.3, 2026-11-21 (`exclude` takes several names, for the frontend in #20) |
| **PRs** | #17 `feat/part-a-fts-search` (search and index). #18 `feat/part-a-suggest-seed` (everything else, this doc included), built on #17. Both are up to date with `main` at `40eac0f`. |
| **Spec** | [03 Interaction Design](cp1/03_interaction_design.md): D1-2, D2-3a, D3-1, D3-3 |
| **Plan** | [architecture.md](cp2/architecture.md) §3 (interface), §4 (retrieval choice), §6 (Done when) |
| **API** | [api.md](cp2/api.md) |
| **Decisions** | [DECISIONS.md](DECISIONS.md): "Part A: keyword search with FTS5" (PR 1); "Part A: relevant enough contributor, and evidence for the evaluation" and the merge plan (PR 2) |

Part A keeps the lab's knowledge and finds it again. It stores every upload (`Info`) and its structured record (`M`). Once a contributor confirms a record, a requester's question finds it. When the records are not enough, Part A names the lab member most likely to help, or says that nobody fits.

Contents: [0 Environment](#0-environment-and-versions) · [1 What changed](#1-what-changed) · [2 How search decides](#2-how-search-decides) · [3 Requirements](#3-requirements-status) · [4 Limitations](#4-known-limitations-and-risks) · [5 Open items](#5-not-done-yet-and-what-other-parts-need-to-do) · [6 Automated tests](#6-automated-tests) · [7 Manual check](#7-manual-check-with-the-real-server)

## 0. Environment and versions

Checked on Windows 11 with the versions below, which come from `backend/.python-version` and `backend/uv.lock`. Other platforms should work with the same lock file; only Windows was tried.

| Component | Version | Where it is set | Notes |
|---|---|---|---|
| Python | 3.12 (checked with 3.12.14) | `backend/.python-version`; `requires-python = ">=3.12"` in `pyproject.toml` | uv installs it for you. The code uses 3.12 syntax (`def _require[T]` in `db.py`). |
| uv | 0.12.12 checked | — | Installs Python and the packages from `uv.lock`. [Install uv](https://docs.astral.sh/uv/getting-started/installation/). |
| SQLite | 3.53.1 checked; **needs FTS5** (SQLite 3.9.0 or later, built with FTS5) | Comes with Python | The Python that uv installs includes FTS5. Some system Pythons on Linux do not; see the check below. |
| FastAPI | 0.163.2 (Starlette 1.10.0) | `uv.lock` | |
| Pydantic | 2.14.3; pydantic-settings 2.16.3 | `uv.lock` | |
| Uvicorn | 0.54.0 | `uv.lock` | |
| python-multipart | 0.0.34 | `uv.lock` | For the form upload in `POST /api/infos`. |
| httpx | 0.28.1 | `uv.lock` | Used by the test client. |
| pytest / ruff | 9.2.0 / 0.17.5 | `uv.lock` (dev group) | |

Check that your Python's SQLite has FTS5 (from `backend/`). It should print a version number and `FTS5 OK`:

```sh
uv run python -c "import sqlite3; c = sqlite3.connect(':memory:'); c.execute('CREATE VIRTUAL TABLE t USING fts5(x)'); print(sqlite3.sqlite_version, 'FTS5 OK')"
```
.

## 1. What changed

### Database tables (`backend/app/db.py`, `SCHEMA`)

| Table / column | What it holds | Why |
|---|---|---|
| `records_fts` (new) | A full-text index (SQLite FTS5, `porter unicode61` tokenizer) of every **confirmed** record: procedure, based on, changes with their reasons, troubleshooting, project tags, contributors. `rowid` = `records.id`. | Search (D3-1). Drafts are never in it, so they cannot be found (D2-3a). |
| `records.first_draft` (new column) | The encoder's draft as it was first stored. Edits on review change `data`, never this. | Evidence for the evaluation: how many corrections a contributor made, and whether the encoder invented details (04 §3). Seeded records have `first_draft` equal to the answer key, so leave them out of those numbers. |
| `asks` (new) | Every question: requester, question, hint mode, the ids search returned, and the answer. | Evidence for the evaluation (04 §3). **Not filled yet**, see §5. |

### Functions

`backend/app/db.py` (all SQL lives here; each function takes the connection first):

| Function | Does |
|---|---|
| `insert_record(conn, info_id, draft)` *(changed)* | Also saves the draft as `first_draft`. |
| `get_first_draft(conn, record_id)` | The encoder's original draft, or `None` if the record does not exist. |
| `index_record(conn, record)` | Puts a confirmed record into `records_fts`, replacing any earlier entry, so indexing twice gives one entry. |
| `search_records(conn, match, k)` | Confirmed records matching an FTS5 query, best first, with a score (higher = better). |
| `matching_record_ids(conn, match)` | Ids of all confirmed records matching an FTS5 query. Used by the contributor suggestion. |
| `insert_ask(conn, *, requester, question, hint_mode, hit_ids, answer)` | Adds one row to `asks`. |
| `find_info(conn, contributor, title)` | An existing `Info` with that contributor and title. Used by the seeder to skip duplicates. |

`backend/app/retrieval/service.py` (the interface other parts call, architecture §3):

| Function | Does |
|---|---|
| `index(conn, record)` | Makes a just-confirmed record searchable. Already called by `POST /api/records/{id}/confirm`. |
| `search(conn, query, k=5) -> list[Hit]` | Confirmed records that share a keyword with the question, best first, at most `k`. Used by `POST /api/ask`. |
| `suggest_contributor(conn, query, exclude=()) -> str \| None` | The most relevant contributor not in `exclude` (the requester and anyone already asked; one name may be a plain string), or `None` if no record is relevant enough (D3-3). |
| `keywords(query)` | The question's words, lower case, without stopwords and repeats. |

`backend/app/retrieval/seed.py`: `seed(conn)` loads the six made-up records in `samples/records/` as confirmed, searchable records, skipping any already loaded. Run it with `uv run python -m app.retrieval.seed`.

### API

| Route | In | Out | Errors |
|---|---|---|---|
| `GET /api/suggest-contributor?q=...&exclude=...` (new, `backend/app/api/suggest.py`) | `q`: the question. `exclude` (optional, repeatable: `?exclude=A&exclude=B`): names never suggested. The frontend should send the requester and anyone already asked about the question (D3-5). Blank values are ignored. | `{"contributor": "Alex Chen"}`, or `{"contributor": null}` when nobody is relevant enough | 422 if `q` is missing or blank |
| `POST /api/ask` (existing) | unchanged | unchanged; its `sources` now come from the real search | unchanged |

### Other files touched

- `backend/app/main.py`: one line registers the `suggest` router.
- `backend/tests/test_retrieval.py` (new), `tests/test_db.py`, `tests/test_api_flow.py` (step 5: suggest a contributor).
- `docs/DECISIONS.md`: the search decision, and the merge plan (proposal). `docs/cp2/api.md`: the route's errors. `backend/README.md`: the seed command.

## 2. How search decides

- **Matching.** The question is split into words, and stopwords ("what", "did", "the", "my", …; the list is `STOPWORDS` in `service.py`) are dropped. A record matches if it contains **any** of the remaining words. Stemming means "transformed" finds "Transformation" and "clump" finds "clumped". Each word is quoted, so characters like `"`, `*`, `AND` or `(` in a question are plain text, not search syntax.
- **Ranking.** BM25: rare words and records with more of the question's words rank higher.
- **Searched fields.** Only the fields of the confirmed `M`. The raw uploaded text (`Info.text`) is **not** searched; it reaches search through the record the contributor confirms.
- **"Relevant enough" for a suggestion (D3-3).** A record counts only if it contains **more than half** of the question's keywords: 1 of 1, 2 of 2, 2 of 3, 3 of 4. The search scores of the counted records are added up per contributor, and the highest total wins. If no record counts, the answer is `null`, and the frontend tells the requester that nobody fits.
- **Where it is called.** `POST /api/ask` calls `search(conn, question, k=5)` (`backend/app/api/ask.py:15`). `POST /api/records/{id}/confirm` calls `index()` right after the record is confirmed (`backend/app/api/records.py:62`).
- **Why a confirmed record never goes stale in the index.** A confirmed record cannot be edited (409, `db.update_record_draft`), and there is no delete route. So the index entry written on confirm stays correct.

## 3. Requirements status

The Part A list in [architecture.md §6 "Done when"](cp2/architecture.md#done-when), plus the list for every part:

| Requirement | Status | Evidence |
|---|---|---|
| `search()` uses SQLite FTS5 with `porter`, over confirmed records only | Done | `db.py` `SCHEMA` (`records_fts`), `search_records`; tests `test_drafts_are_not_searchable` (both files) |
| `index()` adds a record on confirm | Done | `retrieval.index` → `db.index_record`, called at `api/records.py:62`; `test_index_twice_keeps_one_entry` |
| A test shows a different word form matching ("transform" finds "transformation") | Done | `test_other_word_form_matches` |
| A seed script loads `samples/records/` as confirmed records | Done | `app/retrieval/seed.py`; `test_seed_loads_samples_once` |
| `GET /api/suggest-contributor` returns `None` when nothing is relevant enough, with the threshold written down | Done | `api/suggest.py`; §2 above, `DECISIONS.md`; `test_suggest_contributor_none_when_not_relevant_enough`, `test_api_flow.py` step 5 |
| The encoder's first draft is kept next to the edited one | Done | `records.first_draft`, `db.get_first_draft`; `test_first_draft_is_kept_after_edits` |
| Every question and answer is logged (`asks` table) | **Partly**: the table and `db.insert_ask` exist and are tested; the call in `api/ask.py` is Part C's | `test_insert_ask_logs_question_and_answer`; see §5 |
| Merge plan entry in `DECISIONS.md` (CP2 item 10) | **Proposal**, needs the team's agreement | `DECISIONS.md` |
| The word "stub" is gone from the part's code | Done | `grep -i stub app/db.py app/retrieval` finds nothing |
| `ruff` and `pytest` pass, with tests for the new behaviour; `test_api_flow.py` still passes | Done | §6 |
| `models.py` unchanged | Done | `git diff` shows no change to it |
| At least two PRs, each reviewed by someone else | **In review** | PR 1 `feat/part-a-fts-search`: search and index. PR 2 `feat/part-a-suggest-seed`: seed, suggestion, `asks`, `first_draft`, docs |

## 4. Known limitations and risks

| Limitation | Effect | What to do if it matters |
|---|---|---|
| **English only.** The stopword list is English. A Chinese sentence has no spaces, so the tokenizer reads it as one long word. | A question in Chinese finds nothing, unless it contains English words (`轉形 strain X` still finds the strain X record). Records and the UI are in English for CP2 (architecture §4), but real lab members may type Chinese in user tests. | Tell user testers to ask in English, or add a CJK-aware tokenizer (for example FTS5 `trigram`) later. |
| **Keywords, not meaning.** Search needs a shared word, after stemming. | Works when a word is shared: "big protein" finds "150 kDa protein" through "protein". Fails on paraphrase, checked on the samples: "membrane tank" finds nothing, though the Western blot record is about transfer; "cut a band out and purify it" (meaning gel extraction) finds Colony PCR through "band". The decoder must still judge whether the hits answer the question. | The fallback in architecture §4: embeddings from a local model. |
| **The raw upload text is not searched**, only the confirmed `M`. | Something the contributor left out of `M` cannot be found, even if it is in the original file. | Intended: only reviewed content is searchable (D2-3a). The decoder can still show the original through the record's `info`. |
| **Confirm and index are two steps** (`api/records.py:59` and `:62`, scaffold code). | If indexing failed after the confirm was saved, the record would be confirmed but not searchable, and nothing re-indexes it. It has not happened in tests; both are local SQLite writes. | Add a re-index command, or one transaction for both, if it ever happens. |
| **Schema change without migration.** `records.first_draft` is new and required. | A database made before Part A PR 2 is refused at start-up with `OutdatedDatabaseError` and a message to delete the file. Without that check, uploads would fail with a 500, and records confirmed before PR 1 would silently be missing from search (they were never indexed). | Delete `data/app.sqlite3` once. Every `data/` file is test data. |
| **The threshold was tuned on six samples.** | "More than half of the keywords" may be too strict for long questions, or too loose for short ones, on real records. | Watch the user tests. The rule is one line in `suggest_contributor`. |
| **Long questions.** | Not a problem: a 3,000-word question takes about 0.1 s for search and suggestion on the samples. | — |

## 5. Not done yet, and what other parts need to do

| Item | Who | What |
|---|---|---|
| Fill the `asks` table | Part C (Darius), in `api/ask.py` | After `answer = decoder.answer(...)`, add `db.insert_ask(conn, requester=body.requester, question=body.question, hint_mode=body.hint_mode, hit_ids=[h.record.id for h in hits], answer=answer)`. Part A does not edit Part C's file. |
| The `main.py` router line | Scaffold (Benedict) | Please confirm in the PR review. |
| Merge plan | Everyone | The entry in `DECISIONS.md` is a proposal until the team agrees. |
| Old database files | Anyone who ran the scaffold or #17 alone, and the demo laptop | The server refuses to start with a message to delete the file. Delete `data/app.sqlite3` once; it is rebuilt on the next start. |

## 6. Automated tests

From `backend/`:

```sh
uv sync
uv run ruff check . && uv run ruff format --check .
uv run pytest -q
```

Expected on #18: `All checks passed!`, `28 files already formatted`, and `29 passed, 1 warning` (#17 alone: `26 files`, `22 passed`). They also pass with `LLM_BACKEND=llama_server` in `.env`, because Part A's tests never call the LLM. The warning (`StarletteDeprecationWarning` about `httpx`) comes from the scaffold's test client, not from Part A.

Tests for Part A. All use an in-memory database or a temporary file, the fake LLM and no network:

| Test | Checks |
|---|---|
| `test_retrieval.py::test_other_word_form_matches` | "transform" finds a "Transformation" record (porter stemming), with a score above 0 |
| `test_retrieval.py::test_changes_and_reasons_are_searchable` | Words in a change's reason ("clumping") find the record |
| `test_retrieval.py::test_drafts_are_not_searchable` | A draft is never returned |
| `test_retrieval.py::test_best_match_first_and_k` | The better match ranks first; `k` limits the number of hits |
| `test_retrieval.py::test_k_zero_or_negative_returns_nothing` | `k <= 0` returns nothing (SQLite would read a negative limit as "no limit") |
| `test_retrieval.py::test_index_twice_keeps_one_entry` | Indexing a record again does not duplicate it |
| `test_retrieval.py::test_query_syntax_and_stopwords_are_safe` | Quotes, `AND`, `NOT`, `*`, `(` in a question do not break search; a question of only stopwords or punctuation returns nothing |
| `test_retrieval.py::test_suggest_contributor` | The right contributor for two different questions |
| `test_retrieval.py::test_suggest_contributor_none_when_not_relevant_enough` | `None` for an unrelated question, for 1 of 2 keywords, and for only stopwords |
| `test_retrieval.py::test_seed_loads_samples_once` | Six samples load as confirmed and searchable; a second run adds none |
| `test_db.py::test_first_draft_is_kept_after_edits` | An edit changes the record but not its first draft |
| `test_db.py::test_insert_ask_logs_question_and_answer` | One `asks` row with every field |
| `test_retrieval.py::test_suggest_contributor_excludes_the_requester` | Excluded names (one, or several) are never suggested; the next best contributor is |
| `test_db.py::test_old_database_is_refused` | A database without `records.first_draft` raises `OutdatedDatabaseError` |
| `test_api_flow.py::test_paste_review_confirm_ask` step 5 | `GET /api/suggest-contributor` over HTTP: a name, `null` when the only match is excluded, a repeated `exclude` with a blank value, `null` for an unrelated question, and 422 for a blank `q` |

To run only Part A's tests: `uv run pytest -q tests/test_retrieval.py tests/test_db.py`.

## 7. Manual check with the real server

This walks through the 03 flow as real users would: a requester asks questions, a contributor uploads and confirms a new record, and the server is restarted. You only need a terminal and a browser. The browser uses the API page that FastAPI generates at `/docs`.

The encoder and decoder are still stubs (Parts B and C). So **ignore the answer's `text`**; look at `answer.kind`, `sources` and `contributors`, which come from Part A's search.

**With or without the decoder PR (#15).** Before #15 the decoder is a stub; after #15, with `LLM_BACKEND=fake`, it cites the top search hit and its text starts with `[Fake LLM]`. Either way, `answer.kind` and `sources` come out as written below. With `LLM_BACKEND=llama_server` in `.env`, the real model writes the text and decides what to cite, so judge `sources` against the expected record, not the wording.

### Step 0: Setup

**Terminal 1**, from the repo root. A separate database keeps your own `data/app.sqlite3` untouched.

PowerShell (Windows):

```powershell
cd backend
uv sync
$env:DB_PATH = "data/part-a-check.sqlite3"
uv run python -m app.retrieval.seed
uv run python -m app.retrieval.seed
uv run uvicorn app.main:app --port 8000
```

Git Bash, macOS or Linux: the same, but `export DB_PATH=data/part-a-check.sqlite3` instead of the `$env:` line.

- [ ] The first seed prints `Added 6 sample records to ...part-a-check.sqlite3.`
- [ ] The second seed prints `Added 0 sample records ...` (seeding twice adds nothing).
- [ ] The server prints `Uvicorn running on http://127.0.0.1:8000`.

Open **<http://127.0.0.1:8000/docs>** in a browser. To call a route: click it to expand it, click **Try it out**, fill in the fields, click **Execute**, and read the **Response body** under it.

The six sample records are:

| Contributor | Record |
|---|---|
| Alex Chen | Transformation of strain X with plasmid P; Preparation of competent cells |
| Bea Lin | Colony PCR with primer pair Q; Gel extraction of a 3 kb fragment |
| Chris Wu | Plasmid miniprep from a 5 mL overnight culture |
| Dana Huang | Western blot for a 150 kDa protein |

### Step 1: The seeded records are confirmed

`GET /api/records`: set `status` to `confirmed` and leave `contributor` empty.

- [ ] Six records, all with `"status": "confirmed"`.

### Step 2: A requester finds a labmate's record, in other words

Chris is about to transform strain X. `POST /api/ask`, request body:

```json
{ "question": "Has anyone transformed strain X? What did they change from the SOP?", "requester": "Chris Wu" }
```

- [ ] `"kind": "answered"`.
- [ ] `sources` has **Transformation of strain X with plasmid P**, and `contributors` is `["Alex Chen"]`.

The record says "Transformation"; the question says "transformed". This is the stemming.

Then ask, with the same route:

```json
{ "question": "My Western blot shows almost no signal for a big protein. What should I try?", "requester": "Chris Wu" }
```

- [ ] `sources` has **Western blot for a 150 kDa protein**, and `contributors` is `["Dana Huang"]`.

### Step 3: Nothing in the records, and nobody to suggest

`POST /api/ask`:

```json
{ "question": "How do I inject zebrafish embryos?", "requester": "Chris Wu" }
```

- [ ] `"kind": "insufficient"` and `"sources": []`.

Chris asks the tool to suggest someone. `GET /api/suggest-contributor`, `q` = `How do I inject zebrafish embryos?`

- [ ] `{"contributor": null}`: nobody in the lab has a relevant record (D3-3).

### Step 4: The tool suggests the right person

Chris has read Alex's record but wants to know more. `GET /api/suggest-contributor`:

| `q` | Expected |
|---|---|
| `Why did the cells clump after washing?` | [ ] `{"contributor": "Alex Chen"}` |
| `Who knows about low yield in a miniprep?` | [ ] `{"contributor": "Chris Wu"}` |
| `zebrafish transformation` | [ ] `{"contributor": null}`: only 1 of 2 keywords matches a record, not more than half |

Chris is the one asking, so he should not be pointed to himself. Repeat with `exclude`:

| `q` | `exclude` | Expected |
|---|---|---|
| `Who knows about low yield in a miniprep?` | `Chris Wu` | [ ] `{"contributor": null}`: Chris has the only miniprep record |
| `Why did the cells clump after washing?` | `Chris Wu` | [ ] `{"contributor": "Alex Chen"}`: excluding someone else changes nothing |

`exclude` can be given more than once, for the requester and anyone already asked (D3-5). In the `/docs` page, click **Add string item** under `exclude` for a second name:

| `q` | `exclude` | Expected |
|---|---|---|
| `low yield or low recovery` | (none) | [ ] `{"contributor": "Chris Wu"}` (miniprep, low yield) |
| `low yield or low recovery` | `Chris Wu` | [ ] `{"contributor": "Bea Lin"}`: gel extraction, low recovery |
| `low yield or low recovery` | `Chris Wu` and `Bea Lin` | [ ] `{"contributor": null}` |

### Step 5: A contributor uploads a new record; it is not searchable yet

Dana uploads a new record. `POST /api/infos`, form fields:

| Field | Value |
|---|---|
| `contributor` | `Dana Huang` |
| `title` | `Agarose gel casting with TAE buffer` |
| `text` | `Cast a 1 percent agarose gel in TAE. First gel set unevenly. Second try: let the agarose cool to about 60 C before pouring. Gel was even.` |
| `link` | leave empty |
| `tags` | `Project Y` |

- [ ] The response has `"record_id": 7`. If you got a different number, use yours in the steps below.

Before Dana confirms it, Chris asks. `POST /api/ask`:

```json
{ "question": "Why did my agarose gel set unevenly?", "requester": "Chris Wu" }
```

- [ ] `sources` does **not** have the Agarose record. Search only covers confirmed records (D2-3a). You will see Bea's **Gel extraction** record instead, because it shares the word "gel". That is correct: it is the closest *confirmed* record.

`GET /api/suggest-contributor`, `q` = `Why did my agarose gel set unevenly?`

- [ ] `{"contributor": null}`: the Gel extraction record has only 1 of the 4 keywords.

### Step 6: The contributor reviews, edits and confirms

`GET /api/records`, `status` = `draft`, `contributor` = `Dana Huang`.

- [ ] One record, the Agarose one, with `"status": "draft"` and empty `troubleshooting` (the stub encoder copies only the title).

Dana fills in what the encoder missed. `PUT /api/records/{record_id}`, `record_id` = `7`, request body:

```json
{
  "procedure": "Agarose gel casting with TAE buffer",
  "contributors": ["Dana Huang"],
  "project_tags": ["Project Y"],
  "changes": [{ "what": "Agarose cooled to about 60 C before pouring", "reason": "the first gel set unevenly" }],
  "troubleshooting": "First gel set unevenly. Fixed by cooling the agarose before pouring.",
  "gaps": []
}
```

- [ ] Status 200.

`POST /api/records/{record_id}/confirm`, `record_id` = `7`, body `{ "confirmed_by": "Dana Huang" }`

- [ ] `"status": "confirmed"`.

### Step 7: The confirmed record is found at once

Repeat step 5's question in `POST /api/ask`:

```json
{ "question": "Why did my agarose gel set unevenly?", "requester": "Chris Wu" }
```

- [ ] `sources` now has **Agarose gel casting with TAE buffer**, and `contributors` is `["Dana Huang"]`.

Ask with words that appear only in Dana's edits on review:

```json
{ "question": "cooling before pouring", "requester": "Chris Wu" }
```

- [ ] `sources` has the Agarose record. The reviewed fields are searched.

`GET /api/suggest-contributor`, `q` = `Why did my agarose gel set unevenly?`

- [ ] `{"contributor": "Dana Huang"}`.

### Step 8: Odd input does not break search

`POST /api/ask`:

```json
{ "question": "What did they do?", "requester": "Chris Wu" }
```

- [ ] `"kind": "insufficient"`: the question is only stopwords, so there is nothing to search for.

`POST /api/ask`, with quotes and search operators in the question:

```json
{ "question": "strain \"X\" AND (NOT*) -- OR", "requester": "Chris Wu" }
```

- [ ] Status 200 (no server error), and `sources` has the Transformation record.

`GET /api/suggest-contributor`, `q` = a single space.

- [ ] Status 422, `{"detail": "q is required."}`.

### Step 9: Data survives a restart

In terminal 1, stop the server with `Ctrl+C`, then start it again in the same terminal, so `DB_PATH` is still set:

```sh
uv run uvicorn app.main:app --port 8000
```

Reload the `/docs` page and repeat step 7's first question.

- [ ] The Agarose record is still found. The index is stored in the SQLite file, not in memory.

### Step 10: The encoder's first draft is kept

Leave the server running. In **terminal 2**, from `backend/` (use your `record_id` if it was not 7):

```sh
uv run python -c "from pathlib import Path; from app import db; c = db.connect(Path('../data/part-a-check.sqlite3')); print('first draft:', db.get_first_draft(c, 7).troubleshooting); print('confirmed:  ', db.get_record(c, 7).troubleshooting)"
```

- [ ] `first draft: None` (what the encoder produced)
- [ ] `confirmed:   First gel set unevenly. Fixed by cooling the agarose before pouring.` (after Dana's edit)

### Clean up

Stop the server with `Ctrl+C`, then delete the check database: `data/part-a-check.sqlite3` in the repo root.

```powershell
Remove-Item ../data/part-a-check.sqlite3        # PowerShell, from backend/
```

```sh
rm ../data/part-a-check.sqlite3                 # Git Bash, macOS, Linux, from backend/
```

### If something goes wrong

| Symptom | Cause and fix |
|---|---|
| The seed says `Added 0` the first time | The database already has the samples. Delete `data/part-a-check.sqlite3` and start again. |
| The server stops at start-up with `OutdatedDatabaseError: The database file was made by an older version of LabKnow` | The database was made before Part A PR 2. Delete that file (check which one `DB_PATH` points to) and start again. |
| Record ids are not 7 | The database was not empty. Use the ids from your responses, or start from a fresh file. |
| `sqlite3.OperationalError: no such module: fts5` | Your Python's SQLite has no FTS5. Use the Python that uv installs (`uv python install 3.12`, then `uv sync`), and run the FTS5 check in §0. |
| `address already in use` | Another server is on port 8000. Stop it, or use `--port 8001` and open `http://127.0.0.1:8001/docs`. |
