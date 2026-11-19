# LabKnow backend (CP2 prototype)

Contributors upload lab records, a local LLM drafts structured knowledge (`M`) for them to confirm, and requesters ask questions that are answered with links to the source records and their contributors. The product flow is [03 Interaction Design](../docs/cp1/03_interaction_design.md); how we build it is [architecture.md](../docs/cp2/architecture.md); the HTTP API is [api.md](../docs/cp2/api.md).

**This is a walking skeleton.** One thin path runs end to end: paste a record, get a draft, edit and confirm it, ask about it. Search, the encoder and the decoder are **stubs**, and file upload, follow-up questions, saved discussions and the UI are not built yet. Each part owner adds theirs ([architecture.md §6](../docs/cp2/architecture.md#6-owners-and-plan)).

## Run it

You need [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you). The same commands work in PowerShell, Git Bash, macOS and Linux:

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Open <http://127.0.0.1:8000/docs> to try the routes: `POST /api/infos`, then `POST /api/records/{id}/confirm`, then `POST /api/ask` with a word from the title.

Settings come from environment variables or a `.env` file in the **repo root** (copy [`.env.example`](../.env.example)). The database goes to `data/` (git-ignored). With the default `LLM_BACKEND=fake`, nothing needs Ollama. To use a real model today, install [Ollama](https://ollama.com/), `ollama pull <model>`, and set `LLM_BACKEND=ollama` and `LLM_MODEL=<model>` in `.env`. The team's model server will be `llama-server` on Darius's GPU over Tailscale; Part C switches the client to it ([architecture.md §6](../docs/cp2/architecture.md#6-owners-and-plan)).

## Tests

```sh
uv run ruff check . && uv run ruff format --check .
uv run pytest -q
```

`tests/test_api_flow.py` walks the skeleton through the API. Keep it passing, and extend it with your part's steps of the 03 flow.

## Where things live

| Path | What | Owner |
|---|---|---|
| `app/models.py` | Shared data structures: the contract. Changes need every owner's review. | Scaffold |
| `app/main.py`, `app/config.py`, `app/llm.py`, `app/api/` | App, settings, LLM client, HTTP routes | Scaffold, then each part adds its routes |
| `app/db.py`, `app/retrieval/` | SQLite storage; **stub** search | Part A |
| `app/encoder/` | **Stub** encoder (Part B also adds `app/ingest/`) | Part B |
| `app/decoder/` | **Stub** decoder | Part C |
| `../frontend/` | Not started | Part D |
| `../samples/` | Made-up members, records with answer keys, a discussion (English) | everyone |
