# CLAUDE.md

Instructions for AI coding agents (Claude Code, Codex and others) working in this repo, and a quick start for new team members.

## The project

LabKnow: a collaboration tool for a shared wet lab. Contributors upload lab records; a local LLM drafts structured knowledge (`M`) that the contributor reviews and confirms; requesters ask questions and get answers that cite the source records and name their contributors. If the records are not enough, the tool says so and helps the requester find the right person.

- **What the product does:** [docs/cp1/03_interaction_design.md](docs/cp1/03_interaction_design.md). It decides; if code or other docs disagree with it, they are wrong.
- **How we build it (CP2):** [docs/cp2/architecture.md](docs/cp2/architecture.md). Parts, owners and the "Done when" lists are in §6.
- **HTTP API:** [docs/cp2/api.md](docs/cp2/api.md).
- **Decisions:** [docs/DECISIONS.md](docs/DECISIONS.md). **AI use:** [docs/AI_USAGE_GUIDELINES.md](docs/AI_USAGE_GUIDELINES.md). **Team norms:** [docs/cp1/01_team_charter.md](docs/cp1/01_team_charter.md).

## Commands

Backend (Python 3.12, managed by [uv](https://docs.astral.sh/uv/)), run from `backend/`:

```sh
uv sync                                            # install
uv run uvicorn app.main:app --reload --port 8000   # http://127.0.0.1:8000/docs
uv run ruff check . && uv run ruff format --check .
uv run pytest -q                                   # fake LLM, no network
```

Settings come from environment variables or a repo-root `.env` (see `.env.example`). The default `LLM_BACKEND=fake` needs no Ollama.

## Layout and ownership

| Path | Owner |
|---|---|
| `backend/app/models.py`: the shared data structures, the contract | everyone (changes need every part owner's review) |
| `backend/app/main.py`, `config.py`, `llm.py` | scaffold |
| `backend/app/db.py`, `backend/app/retrieval/` | Part A |
| `backend/app/ingest/`, `backend/app/encoder/`, `backend/app/api/infos.py` | Part B |
| `backend/app/decoder/`, `backend/app/api/ask.py` | Part C |
| `frontend/` | Part D |
| `samples/` (made-up test data) | everyone |

Work only inside the part you were asked to work on. If a change needs another part's files or `models.py`, stop and say so instead of editing them.

## How to work

- **Do only what the task asks.** Do not add features, options or abstractions it does not need. If you see a worthwhile extra, suggest it instead of building it. Prefer the simplest change, and before you finish, re-read your diff and remove what is not needed.
- **Do not guess.** Before you write that the code does or does not do something (in a reply, a doc or a PR), check the code and cite `file:line`. If you are not sure, say so or ask.
- Read the files you will change, and their tests, before you edit them.
- **Before you say a task is done**, run `ruff` and `pytest` (see Commands). Report a failure as a failure, with its output.

Personal preferences (how much to discuss before editing, reply style, and so on) go in your own `~/.claude/CLAUDE.md` or a git-ignored `CLAUDE.local.md`, not in this file.

## Rules for code

- **Records never leave the machine.** The LLM is a local Ollama model, called only through `app/llm.py`. Never add a hosted LLM API or any other network call that sends record text out (04 §5).
- **No real lab data in the repo.** Test data is made up and in English. `data/` (the database and uploads) is git-ignored; never commit it.
- **Only confirmed records are searchable**, and an answer may cite only records that search returned. The contributor confirms every `M` before it is stored as confirmed.
- **Guards go in code, not only in prompts:** at most two follow-up questions (Part B) and the citation check (Part C).
- **Prompts are files** next to the encoder and decoder (for example `encoder/prompts/system.md`), not strings in code. They feed the prompt documentation card.
- **SQL stays in `db.py`** (standard-library `sqlite3`, no ORM). Functions take the request's connection as their first argument.
- **Routes** are thin, plain `def` (not `async def`, because `sqlite3` blocks), and read settings from `request.app.state.settings`, never `get_settings()`.
- **Tests** use `LLM_BACKEND=fake` and no network. Add tests for new behaviour, and keep `tests/test_api_flow.py` passing; extend it with your part's steps of the 03 flow.
- Python 3.12, ruff (line length 100). Match the style of the code around you.

## Rules for git and PRs

- Branch from `main`, one branch per task. Never push to `main` directly.
- Every PR uses the template in `.github/PULL_REQUEST_TEMPLATE.md`, with the "Decision" section filled in for any significant choice, and a matching entry in `docs/DECISIONS.md` (what, why, alternative rejected, led by).
- Someone other than the author reviews; the review comment says how any disagreement was resolved. Only the current code steward (named in `docs/DECISIONS.md`) merges. The steward rotates daily on Nov 20, 21 and 22.
- An AI agent never pushes, opens or merges a PR, or rewrites shared history, unless the human it works for asks for that explicitly.
- **AI use is disclosed.** Say in the PR which parts an AI wrote, and log prompts that produced code, text or decisions in the repo, as `docs/AI_USAGE_GUIDELINES.md` describes. A human reviews and tests everything an AI wrote before it is merged, and must be able to explain it.
- `docs/cp1/` is the submitted CP1. Change it only through a PR that says why.
