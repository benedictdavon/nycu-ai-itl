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

## 2026-11-19 — When the decoder says "not enough"
**What:** An answer is `insufficient` when search returns no hits (no model call), when the model finds the hits do not answer the question, or when no cited record survives the citation check. A partial answer, or one from a record about a different case, is `answered` with the gaps in `uncertainties`. The rule is in `architecture.md` §4.
**Why:** Answers 03's open question with rules that code can enforce where possible: no hits and no valid citation are checked in code, so a model that ignores the prompt still cannot answer without a source. Partial answers stay useful to the requester, with what is missing said plainly.
**Alternative rejected:** A search score threshold decided by Part C (the score belongs to Part A's search, which is not built yet); `insufficient` for any partial answer (hides useful records).
**Led by:** Darius Lung

## 2026-11-20 — Code steward: Tommy
**What:** Tommy is the code steward for Fri Nov 20 and merges the PRs approved that day.
**Why:** The CP2 rotation in `docs/cp2/architecture.md` §6 (Tommy Nov 20, 李原誌 Nov 21, Benedict Nov 22).

## 2026-11-20 — A draft can be confirmed with empty gaps
**What:** A contributor can confirm a draft while some `gaps` are still empty. Empty gaps stay in `gaps`, and the record view shows them in the "Not recorded: Ask {contributor} if you need these" panel. Before confirming, the "Before you confirm" panel lists each empty gap ("Labmates will see them as not recorded"), so confirming with gaps is a deliberate choice.
**Why:** Contributors often don't know every detail, and blocking confirmation would keep useful records unsearchable (PRODUCT.md principle 3: keep the contributor's extra work small). Showing the gaps keeps documented facts visibly apart from missing ones (principle 2). We rejected requiring every gap to be filled before confirming, because it pushes contributors to guess or to leave drafts unconfirmed.
**Led by:** Benedict

## 2026-11-20 — Part A: keyword search with FTS5
**What:** `search()` is SQLite FTS5 over the confirmed `M` only (procedure, based on, changes with their reasons, troubleshooting, tags, contributors), with the `porter unicode61` tokenizer and BM25 ranking. The question becomes an OR of its keywords, after a short English stopword list (`retrieval/service.py`). Each keyword is quoted, so user text never acts as FTS5 syntax. `index()` writes a record into the index when it is confirmed.
**Why:** Architecture §4 chose FTS5 with `porter`. Keyword search with stemming is enough for six to a few dozen English records, needs no extra model, and is easy to explain. OR with stopwords removed finds a record that shares any meaningful word with the question; BM25 puts the record with more and rarer shared words first.
**Alternative rejected:** AND of all keywords (one extra word in the question would hide the right record). Embeddings stay the fallback if paraphrased questions are missed (architecture §4).
**Led by:** Tommy

## 2026-11-20 — Part A: "relevant enough" contributor, and evidence for the evaluation
**What:** `suggest_contributor()` (D3-3) counts a record only if it contains **more than half** of the question's keywords (1 of 1, 2 of 2, 2 of 3, 3 of 4). It adds up the search scores per contributor and returns the highest, or `None` if no record counts. An optional, repeatable `exclude` (the requester, and anyone already asked under D3-5) is never suggested, so nobody is pointed to themselves or back to someone who could not help (suggested by Darius in the #18 review; made repeatable for the frontend in the #20 review). Each record keeps the encoder's first draft (`records.first_draft`) next to the edited one, and an `asks` table is ready to log every question with its hits and answer, as evidence for 04 §3 (corrections, invented details).
**Why:** Architecture §6 asks for a written threshold. A keyword share is readable and does not depend on the number of records, unlike a fixed BM25 score.
**Alternative rejected:** A fixed BM25 score threshold (its scale changes with the number of records).
**Led by:** Tommy

## 2026-11-20 — Merge plan for Nov 21 (CP2 item 10) — proposal, to be agreed
**What:** On merge day, the steward (李原誌) merges in dependency order, and each PR is brought up to date with the current `main` (merge `main` into the branch, which avoids force-pushing shared branches, or rebase) and passes `ruff` and `pytest` before it is merged:
1. Any `models.py` change, reviewed by every owner (none planned).
2. Shared fixes first, for example `llm.py` (#16) and the fake-LLM and test-settings fixes asked for on #15, so every later PR is tested the same way.
3. Part A PRs (search, then suggestion and seed). Parts B and C use only `search()` and `index()`, whose signatures do not change.
4. Part B PRs (files, follow-ups), then Part C PRs (decoder, discussions). Discussions go through B's encoder.
5. Part D last, against the merged API.
Files several parts touch: `db.py` (B adds `follow_ups` and the file path, C adds discussion infos; Tommy reviews every SQL change), `main.py` (one router line per part), `tests/test_api_flow.py` (each part appends its own numbered steps) and `docs/DECISIONS.md` (append only). Conflicts there are resolved by the later PR's author.
**Why:** Merging in dependency order keeps `main` runnable after every merge, so the user tests on Nov 21–22 run on a working build.
**Led by:** Tommy

## 2026-11-21 — Code steward: 李原誌
**What:** 李原誌 is the code steward for Sat Nov 21 (merge day) and merges the PRs approved that day.
**Why:** The CP2 rotation in `docs/cp2/architecture.md` §6 (Tommy Nov 20, 李原誌 Nov 21, Benedict Nov 22).

## 2026-11-22 — Code steward: Benedict
**What:** Benedict is the code steward for Sun Nov 22 and merges the PRs approved that day.
**Why:** The CP2 rotation in `docs/cp2/architecture.md` §6 (Tommy Nov 20, 李原誌 Nov 21, Benedict Nov 22).

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

## 2026-11-22 — How a saved discussion is stored (D3-4)
**What:** `POST /api/discussions` stores the chat unchanged as an `Info` of kind `discussion`, with the question as its `title` and the person who answered as its `contributor`, so the draft goes to their inbox and only they can confirm it. The requester is not stored separately; the chat names them. A discussion gets no follow-up questions: the encoder does not ask for `kind == "discussion"` (Part B), and the route refuses with 500 if it ever returns a question, so no half-finished record is saved.
**Why:** Keeps `models.py` and the `infos` table unchanged, and the raw record stays exactly what the two people wrote (D1-3).
**Alternative rejected:** A `requester` column on `infos` (a `models.py` and schema change for a name the chat already shows); writing "Asked by ..." into `text` (changes the raw record).
**Led by:** Darius Lung

## 2026-11-22 — How the prompt suite runs and keeps its results
**What:** `backend/prompt_suite/run.py` runs every case in `prompt_suite/cases/<part>.json` against the real model (it refuses `LLM_BACKEND=fake`) and saves a dated results file under `docs/cp2/prompt_suite/results/`, with the model name and commit but never the server address or key. A case is an input plus properties checked in code (kind, citations, contributors, phrases that must or must not appear, no digits, an uncertainty, at most 30 s), and optionally a `judge` sentence that a person marks by hand in the results file. Decoder cases name their hits by sample file (`R01`, `D01`), so they do not depend on search or the encoder. Part B adds an encoder runner and `cases/encoder.json`.
**Why:** CP2 item 6 and architecture §5 ask for cases with required properties, run against the model, with results kept. Checks in code make a rerun cheap and comparable; some properties (cause vs fix, a hint that is not an answer) need a person.
**Alternative rejected:** Running the suite under `pytest` (it would need the model server and the network, which unit tests must not); checking only in code (would miss the cause/fix swap that was the first failure).
**Led by:** Darius Lung

## 2026-11-22 — Model: Qwen3-4B Q8_0 on llama-server (04 §5)
**What:** The encoder and decoder use Qwen3-4B (Q8_0 GGUF) on `llama-server`, hosted by the team on one RTX 4090 of a shared lab machine (about 7 GB of GPU memory) and reached over Tailscale. Settings: temperature 0, thinking off, JSON schema output, context 8192 tokens with 2 parallel requests. CP1 (04 §5) left the model open until CP2. Tested so far:
- **Speed:** 0.4–0.7 s per decoder answer on the prompt suite's cases; about 4 s for an encoder draft in the first test. Far under the 30 s limit (architecture §4).
- **Valid JSON:** every reply in the decoder suite runs validated as `Answer` (the schema constrains the shape; the values are checked in code).
- **Invented details:** the decoder suite checks for invented numbers and directions of change (`plasmid-amount`, the hint cases). Two failures were fixed by prompt changes; one remains, a hint that gives away an added step (`docs/cp2/prompt_suite/fail_then_fix.md`). Latest run: 6 of 7 decoder cases pass (`docs/cp2/prompt_suite/results/`).
- **Not tested yet:** the encoder cases (Part B), and the fallback, a smaller model on the demo laptop's 8 GB GPU.
**Why:** Records go to no outside AI service (04 §5). A 4B model is enough for answering from a few short records and drafting `M` from one record, it replies in under a second, and it leaves most of a shared GPU to its other users. A Q8_0 copy loses little quality against the full model and fits easily.
**Alternative rejected:** Qwen3-8B or 14B (about 10–19 GB, more of the shared GPU for no failure the 4B model has shown that a bigger one is known to fix; the first choice if the suite starts failing); a third-party model API (sends record text outside, which 04 §5 rules out).
**Led by:** Darius Lung

## 2026-11-22 — Part B: the encoder, follow-up questions and the text limit
**What:** `encode()` sends the record and the answers so far to the model, which always returns a draft and, if it has one, a question (`encoder/service.py`). Code then decides: a question is asked only for an upload with fewer than two answered questions; otherwise it goes into `gaps` and the draft is kept (D2-3b). The uploader is always the first contributor, and the upload's tags are kept. Questions live in a `follow_ups` table; an answer is stored only after the model call succeeds, so a 503 leaves the question open to retry. Pasted text over 12,000 characters is refused with 413.
**Why:** Asking for a draft every time means the two-question limit and discussions (no questions) need no second model call: code just drops the question. The model server has an 8192-token context; lab text with numbers and units is about 3-4 characters per token, so 12,000 characters leave room for the prompt, two answers and the reply.
**Alternative rejected:** Asking the model for either a question or a draft (a third question would need a second call to get a draft); truncating long text silently (the draft would miss part of the record without anyone knowing).
**Led by:** 李原誌
**Tried on the real model (Qwen3-4B, Nov 22):** the model asked the same question twice despite the prompt, copied the prompt's example question, and gave changes reasons the record does not state. So code now also drops a question that was already asked and removes repeated gaps; the draft comes before the question in the reply; the prompt has no example question and forbids guessed reasons.
**Known issue:** `based_on` stays null even when the record says `following Drive SOP "Transformation v2"`. Asked alone, the model finds it, so the cause is the number of fields, not the schema; an extra prompt rule did not help and made questions worse. The contributor fills it on review for now.

## 2026-11-22 — Add a record: pasted text only until the server reads files
**What:** The Add a record screen hides the "Upload a file" tab while `FILE_UPLOAD_READY` (`frontend/src/api/client.ts`) is false, and the "text missing" message no longer mentions a file. The upload code and its tests stay; setting the constant to true brings the tab back when Part B's file upload (architecture §6, B PR 1) is merged.
**Why:** In the Nov 22 run against the real model, the tab offered something the backend cannot do yet: `POST /api/infos` takes only `text`, so every upload failed. Hiding it keeps the demo and the user tests on what works.
**Alternative rejected:** Keeping the tab with an error after upload (users would try it and fail); deleting the upload code (it would have to be rewritten once Part B adds files).
**Led by:** Benedict Davon Martono
