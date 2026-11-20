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
