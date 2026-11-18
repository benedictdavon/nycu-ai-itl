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
