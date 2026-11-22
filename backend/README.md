# LabKnow backend (CP2 prototype)

Contributors upload lab records, a local LLM drafts structured knowledge (`M`) for them to confirm, and requesters ask questions that are answered with links to the source records and their contributors. The product flow is [03 Interaction Design](../docs/cp1/03_interaction_design.md); how we build it is [architecture.md](../docs/cp2/architecture.md); the HTTP API is [api.md](../docs/cp2/api.md).

To run the whole app (backend and frontend together), follow the [root README](../README.md). This file covers the backend on its own, the model server and the backend's layout.

## Run it

You need [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you). The same commands work in PowerShell, Git Bash, macOS and Linux:

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

To load the six made-up records in `samples/records/` as confirmed, searchable records (safe to run twice):

```sh
uv run python -m app.retrieval.seed
```

Open <http://127.0.0.1:8000/docs> to try the routes: `POST /api/infos`, then `POST /api/records/{id}/confirm`, then `POST /api/ask` with a word from the title. If `frontend/dist` exists (built with `npm run build`), the app itself is at <http://127.0.0.1:8000>.

Settings come from environment variables or a `.env` file in the **repo root** (copy [`.env.example`](../.env.example)). The database goes to `data/` (git-ignored). With the default `LLM_BACKEND=fake`, nothing needs a model server. For a real model, see [Model server](#model-server).

## Model server

The app calls [`llama-server`](https://github.com/ggml-org/llama.cpp) (llama.cpp) through its OpenAI-compatible API. Records never go to an outside AI service.

Host side (Darius's shared GPU; keep it small, and pin one GPU):

```sh
CUDA_VISIBLE_DEVICES=1 llama-server \
  -hf Qwen/Qwen3-4B-GGUF:Q8_0 \
  --jinja -ngl 99 -c 8192 -np 2 \
  --host <tailscale-ip> --port 8080 --api-key-file ~/.config/labknow/llm_api_key
```

Make the key file once with `mkdir -p ~/.config/labknow && (umask 077; openssl rand -hex 16 > ~/.config/labknow/llm_api_key)`. Use `--api-key-file`, not `--api-key`: on a shared machine, every user can read command-line arguments with `ps`. `--jinja` is needed so the app can switch Qwen3 thinking off. `-c 8192 -np 2` means two parallel requests with 4096 tokens each. Use `--host 127.0.0.1` when running locally, never `0.0.0.0`.

App side, in `.env`:

```sh
LLM_BACKEND=llama_server
LLM_BASE_URL=http://<tailscale-ip>:8080/v1
LLM_API_KEY=<same key>
```

The fallback is the same command with a smaller model on the demo laptop and `LLM_BASE_URL=http://localhost:8080/v1`.

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
| `app/db.py`, `app/retrieval/` | SQLite storage, FTS5 search, contributor suggestion, sample seeder | Part A |
| `app/encoder/` | Encoder: drafts `M` with the model, at most two follow-up questions; prompts in `prompts/` | Part B |
| `app/decoder/` | Decoder: answers from search hits with the citation check; prompts in `prompts/` | Part C |
| `prompt_suite/` | Prompt test suite runner and cases, run against the real model | Parts B and C |
| `../frontend/` | React app, served from `frontend/dist` once built | Part D |
| `../samples/` | Made-up members, records with answer keys, a discussion (English) | everyone |
