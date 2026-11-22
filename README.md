# LabKnow

A collaboration tool for a shared wet lab. Contributors add lab records; a model the team hosts itself drafts a structured summary that the contributor checks and confirms. Labmates ask questions and get answers that cite the source records and name the people who wrote them. When the records are not enough, LabKnow says so and helps the requester find the right person, and the answer they get can be saved back as a new record.

This is the CP2 prototype for NYCU 535527 (AI in the Loop). The product is specified in [03 Interaction Design](docs/cp1/03_interaction_design.md); how it is built is in [architecture.md](docs/cp2/architecture.md).

## Run it

You need [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 for you) and Node.js 22 or later. The commands work in PowerShell, Git Bash, macOS and Linux. Run them from the repo root.

**1. Settings.** Copy `.env.example` to `.env` in the repo root. With the default `LLM_BACKEND=fake`, everything runs without a model server: drafts copy the title and answers name the best search hit. For the real model, set the three `LLM_` lines; see [Model server](backend/README.md#model-server). `.env` is git-ignored; never commit it or show it on screen.

**2. Build the frontend.** The backend serves the built app, so build it before you start the server.

```sh
cd frontend
npm ci
npm run build
cd ..
```

**3. Install the backend and load the sample records.** The six made-up records in `samples/records/` become confirmed, searchable records, so there is something to ask about. Running it twice is safe.

```sh
cd backend
uv sync
uv run python -m app.retrieval.seed
```

**4. Start the server.**

```sh
uv run uvicorn app.main:app --port 8000
```

Open <http://127.0.0.1:8000>, pick a name, and try the flow below. <http://127.0.0.1:8000/api/health> shows which model backend is in use, and <http://127.0.0.1:8000/docs> lists the API.

**Two people at once.** Start the server with `--host 0.0.0.0` and have the second person open `http://<this laptop's IP>:8000`. If the network blocks that, use a second browser (or an incognito window) on the same laptop: the chosen name is kept per browser.

**Start over.** Stop the server, delete `data/app.sqlite3` (and `data/uploads/` if present), and run the seed command again.

## Try it

1. **Add a record** as one person (for example Dana Huang): paste a short made-up record, answer any follow-up questions (the real model asks up to two), then check the draft against the original, fix anything wrong, and confirm it.
2. **Ask** as another person (for example Chris Wu), using words from the record. The answer links to its sources and names their contributors. Turn on **Hints first** for pointers instead of the full answer.
3. Ask something no record covers. LabKnow says the records are not enough, suggests or lets you choose a person to ask, and lets you **save the discussion** once it is solved.
4. Switch to the person who answered. The saved discussion waits in **To review**; confirm it, and the next person who asks finds it.

Use made-up records only. No real lab data goes into this repo (see [CLAUDE.md](CLAUDE.md)).

## Develop

| | Commands |
|---|---|
| Backend checks (from `backend/`) | `uv run ruff check . && uv run ruff format --check .` then `uv run pytest -q` (fake model, no network) |
| Frontend checks (from `frontend/`) | `npm run lint`, `npm run typecheck`, `npm test` |
| Frontend with hot reload | Start the backend on port 8000, then `npm run dev` in `frontend/` and open the address Vite prints. `/api` is proxied to the backend. |
| Prompt test suite (real model) | See [`backend/prompt_suite/`](backend/prompt_suite/) and [docs/cp2/prompt_suite/](docs/cp2/prompt_suite/) |

## Where things are

| Path | What |
|---|---|
| [`backend/`](backend/) | FastAPI app: storage and search (Part A), encoder (Part B), decoder (Part C). Details in [backend/README.md](backend/README.md). |
| [`frontend/`](frontend/) | React app (Part D). Product and design notes in `PRODUCT.md`, `DESIGN.md` and `SCREENS.md`. |
| [`samples/`](samples/) | Made-up members, records with answer keys, and a saved discussion. |
| [`docs/`](docs/) | CP1 documents, CP2 architecture and API, prompt card, [DECISIONS.md](docs/DECISIONS.md), [AI usage guidelines](docs/AI_USAGE_GUIDELINES.md) and the [AI prompt log](docs/AI_PROMPTS.md). |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for AI coding agents and a quick start for new team members. |

## Team

Benedict Davon Martono, Darius Lung Wei Liang, Tommy To and 李原誌. The owner of each part is in [architecture.md §6](docs/cp2/architecture.md#6-owners-and-plan).
