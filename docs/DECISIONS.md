# Decisions Log

## 2026-09-21 — Initial code steward
**What:** Darius Lung is the initial code steward for the team.
**Why:** Decided through team discussion.

## 2026-10-24 — Team charter norms
**What:** The PR/task owner decides disagreements; the code steward decides if the owner cannot. GitHub is for work tracking, sync and work-specific discussion; LINE for quick chat.
**Why:** The CP1 charter needs a concrete decision process and communication norms. We rejected a weekly sync meeting and track work on GitHub instead.
**Led by:** Darius Lung

## 2026-11-18 — Repo docs layout
**What:** Project docs live in `docs/` (including `DECISIONS.md`, `AI_USAGE_GUIDELINES.md`, `CONTRIBUTORS.md`). The root keeps only `README.md` (all caps), and `.github/` keeps only GitHub tooling files such as the PR template.
**Why:** Keeps the repo root tidy and gives each doc one canonical location. We rejected keeping `DECISIONS.md` in `.github/`, because GitHub gives it no special treatment there, and at the root, because it clutters the top level.
**Led by:** Darius Lung

## 2026-11-19 — Model client speaks llama-server's OpenAI-compatible API; no Ollama
**What:** `app/llm.py` calls `/v1/chat/completions` (temperature 0, JSON schema via `response_format`, Qwen3 thinking off). `LLM_BACKEND` is `fake` or `llama_server`; Ollama is removed. The demo-laptop fallback is a small local `llama-server`, not Ollama.
**Why:** One protocol for the main server and the fallback, and no extra runtime to install and test. A schema-shaped reply is only a valid shape, so the citation check and question limit stay in code.
**Alternative rejected:** Keeping Ollama as a second backend (a second API to maintain and test, and the team prefers not to depend on it).
**Led by:** Darius Lung

## 2026-11-20 — Code steward: Tommy
**What:** Tommy is the code steward for Fri Nov 20 and merges the PRs approved that day.
**Why:** The CP2 rotation in `docs/cp2/architecture.md` §6 (Tommy Nov 20, 李原誌 Nov 21, Benedict Nov 22).

## 2026-11-20 — Part A: keyword search with FTS5
**What:** `search()` is SQLite FTS5 over the confirmed `M` only (procedure, based on, changes with their reasons, troubleshooting, tags, contributors), with the `porter unicode61` tokenizer and BM25 ranking. The question becomes an OR of its keywords, after a short English stopword list (`retrieval/service.py`). Each keyword is quoted, so user text never acts as FTS5 syntax. `index()` writes a record into the index when it is confirmed.
**Why:** Architecture §4 chose FTS5 with `porter`. Keyword search with stemming is enough for six to a few dozen English records, needs no extra model, and is easy to explain. OR with stopwords removed finds a record that shares any meaningful word with the question; BM25 puts the record with more and rarer shared words first.
**Alternative rejected:** AND of all keywords (one extra word in the question would hide the right record). Embeddings stay the fallback if paraphrased questions are missed (architecture §4).
**Led by:** Tommy
