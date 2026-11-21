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

## 2026-11-20 — Check the draft: the confirm step stays an inline panel
**What:** "Confirm record" opens the inline "Before you confirm" panel (SCREENS.md §4), which now scrolls into view and takes focus; Escape and "Go back and check" return focus to "Confirm record". Publishing still takes two clicks.
**Why:** The panel rendered below the fold with focus left on the button, so the step looked broken (audit P1). We rejected a modal dialog, because it would change the spec for a step that needs neither interruption nor trapped focus.
**Led by:** Benedict Davon Martono

## 2026-11-20 — Check the draft: open row edits block Save and Confirm
**What:** While a draft row is open for editing, "Save draft", "Confirm record" and "Confirm and publish" refuse to run; the open row shows "Save or cancel this edit first." and takes focus. Leaving the page with unsaved edits asks first: `beforeunload` for reload and close, and react-router's `useBlocker` for in-app links, so `App` now uses a data router (`createBrowserRouter`).
**Why:** Typed text in an open row was silently dropped on an irreversible publish (audit P1). We rejected lifting each row's edit state up and applying it on publish, because every row's validation (required procedure, empty change) would then have to run at publish time. We rejected `beforeunload` alone, because it misses the header links.
**Led by:** Benedict Davon Martono

## 2026-11-21 — Frontend layout: one reading width, quiet tags in Sources
**What:** Single-column screens (Who, To review, Ask's main column) use a 760px reading width (`max-w-reading`), the main-column width of the two-column pattern, and the original record on Check the draft is sticky on desktop. In the Sources side card, project tags are a plain middot-separated text list instead of pills.
**Why:** Widths differed per screen (Who 560px, To review 1160px, Ask 1112px at 1920 wide), Ask jumped when Sources appeared, and seven tag pills took four rows in a 214px column. We rejected smaller pills (still four rows) and truncated tags (a tooltip does not work on touch).
**Led by:** Benedict Davon Martono
