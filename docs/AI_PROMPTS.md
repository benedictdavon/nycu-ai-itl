# AI prompts log

Prompts that produced code, text or decisions in this repo, as `docs/AI_USAGE_GUIDELINES.md` §2 asks. Newest work at the bottom. A human reviews everything an AI wrote before it is merged.

## Frontend UI fix pass (branch `fix/frontend-ui-audit`, 2026-11-20)

- **Who:** Claude Opus 5.5 orchestrated and reviewed; Claude Haiku 5.5 (one subagent) wrote all code. The human (benedictdavon) set the task, chose the confirm-step option and approves each phase before it is committed.
- **Source:** the audit `frontend/.impeccable/audit/2026-11-20T14-42-35Z__project.md` (score 14/20; git-ignored).
- **Human decision:** the confirm step stays an inline panel that scrolls into view and takes focus (option a); no spec change.

### Phase 1: harden (P1)

#### Brief to the implementer

    You are the implementer for a UI fix pass on LabKnow's frontend (Part D). An orchestrator reviews your work. Phase 1 of 3: harden. Do only this phase, no extras.
    
    ## Where and rules
    - Worktree: <the git worktree for this branch> (run everything there).
    - Edit only files under `frontend/`. Do NOT touch `backend/`, `docs/`, `models.py`. No git commands (no commit, stash, checkout). Do not start or stop any server. Do not run `npm run build` (the orchestrator does).
    - Read `CLAUDE.md` (repo root) and `frontend/DESIGN.md` first, then every file you change and its tests before editing. Match the surrounding style (Tailwind token classes such as `text-coomassie-blue`, `type-label`; comments explain why).
    - Do not add features, options or abstractions beyond what is listed. Prefer the simplest change. Re-read your diff before reporting and remove anything not needed.
    - When done, run in `frontend/`: `npm run typecheck`, `npm run lint`, `npm test`. All must pass. Report failures as failures with output.
    - Report back: the list of files changed, a short description per change, test names you added, and the exact command results (pass/fail counts). Don't claim anything you didn't check.
    
    ## Fix 1: unsaved row edits are silently lost (P1)
    Files: `frontend/src/screens/contributor/ReviewScreen.tsx`, `frontend/src/screens/contributor/DraftRows.tsx`, `frontend/src/App.tsx`, tests.
    
    Problem: each draft row (`TextRow`, `TagsRow`, `ContributorsRow`, `ChangeRow` in DraftRows.tsx) keeps its edit text in local state (e.g. DraftRows.tsx:80-81). If the contributor types in an open row and then presses "Save draft" or "Confirm record" → "Confirm and publish", the typed text is dropped without warning, and confirmation is irreversible.
    
    Chosen approach (orchestrator decision): BLOCK, don't lift state. While any row is open (in edit mode), "Save draft", "Confirm record" and "Confirm and publish" do not proceed; instead they show a message that names the open row(s). Reason: blocking is simpler and safer than lifting state up, which would also need each row's validation (required procedure, empty change) to run at publish time.
    
    Details:
    - Each row reports whether it is open via a new prop, e.g. `onEditingChange: (open: boolean) => void`, called from a `useEffect` on its `editing` state, with cleanup reporting `false` on unmount (a removed change row must unregister).
    - `ChangeRow` mounts already open when `startEditing` is true (a newly added change); that must register too.
    - ReviewScreen keeps the open rows keyed by a stable row id (e.g. "procedure", "based_on", "contributors", "tags", "troubleshooting", `change-${change.key}`), mapping to a human label. Change rows have no unique label: name them "a change from the SOP" (or the change text if it has one, e.g. `Change: "Eluted in 30 uL…"` — keep it simple).
    - Message text, e.g.: "Save or cancel your edit to Based on first." (plural: "Save or cancel your edits to Based on and Project tags first."). Render it right next to the button that was pressed: in the card action bar for Save draft / Confirm record, and inside the "Before you confirm" panel for Confirm and publish. NOT in `failureView` at the top of the card (that would be off-screen, the same bug as Fix 2). Use `role="alert"` (or an aria-live region) so it is announced. After showing it, move focus to the first open row's first input so the user can act. Clear the message when no rows are open any more.
    - Re-check on "Confirm and publish": a row can be opened after the panel is shown.
    - Do not disable the buttons for this (a disabled button would need a reason nearby anyway); the press shows the message.
    
    Warn before leaving with unsaved edits:
    - "Unsaved" = any row open OR `working.edited` is true (applied but not saved with Save draft). After a successful Save draft, `toWorking(saved, …)` resets `edited` to false (check `draft.ts`).
    - Browser leave (reload, close tab, typed URL): `beforeunload` listener while unsaved (react-router's `useBeforeUnload` or a plain effect; call `event.preventDefault()`).
    - In-app leave (header links Ask / To review / Switch, "Back to To review"): `App.tsx` uses `BrowserRouter`, so `useBlocker` is not available. Switch `App` to a data router with the smallest change: `const router = createBrowserRouter([{ path: "*", element: <AppRoutes /> }])` and `<RouterProvider router={router} />` inside `MeProvider` (react-router 7.18.6 is installed; check the exports in `react-router`). Keep `AppRoutes` unchanged so existing tests that wrap `AppRoutes` in `MemoryRouter` keep working where they don't render ReviewScreen. Then in the review screen use `useBlocker(({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname && !leaving.current)`; when `blocker.state === "blocked"`, ask with `window.confirm("You have unsaved changes to this draft. Leave without saving them?")` and call `blocker.proceed()` or `blocker.reset()`.
    - The blocker must NOT block the screen's own navigation after a successful confirm (`navigate(`/records/${record.id}`)` in `confirmAndPublish`). Use a ref set just before that navigate (or equivalent). Add a test for this.
    - Any test that renders `ReviewScreen` needs a data router: use `createMemoryRouter` + `RouterProvider` in `ReviewScreen.test.tsx` (and any other test that reaches /review/:id, e.g. check `App.test.tsx`, `InboxScreen.test.tsx`).
    
    ## Fix 2: the confirm step is invisible (P1)
    File: `frontend/src/screens/contributor/ReviewScreen.tsx` (around lines 404-462).
    
    Problem: pressing "Confirm record" sets `confirming` and renders the "Before you confirm" panel below the card. Measured in the browser at 1920x1080: the panel's top is at 1088px in a 1080px viewport, no scroll happens, focus stays on the button, and the button just turns from primary to secondary (white). The user decided: KEEP the inline panel (SCREENS.md:94 specifies it), no spec change, but:
    - When the panel opens, scroll it into view and move focus to its heading "Before you confirm" (give the h2 `tabIndex={-1}` and a ref; focus after render, e.g. in an effect keyed on `confirming`). Scroll so the whole panel is visible when it fits (e.g. `scrollIntoView({ block: "nearest" })` on the section, or `block: "center"`); use `behavior: "smooth"` only when `window.matchMedia("(prefers-reduced-motion: reduce)")` does not match, otherwise `"auto"`. Focusing the heading should not cause a second jump (use `focus({ preventScroll: true })`).
    - The heading must show a visible focus indicator when focused programmatically (DESIGN.md: visible 3px Coomassie Blue focus ring; the global `:focus-visible` rule is in `frontend/src/index.css:148`; check that a programmatically focused `tabIndex=-1` heading actually matches `:focus-visible` in Chrome after a mouse click — if not, add a small `focus:` style on the heading using the same 3px coomassie-blue outline, offset 2px, and rounded corners).
    - Escape pressed anywhere inside the panel, and the "Go back and check" button, close the panel and return focus to the "Confirm record" button (keep a ref to it).
    - Keep DESIGN.md's rule that an irreversible action is never a single click: "Confirm record" only opens the panel; "Confirm and publish" in the panel does the irreversible POST.
    - Keep the existing demotion of "Confirm record" to secondary while the panel is open (one primary button per view) — it is fine now that the panel is visible and focused.
    - jsdom has no `Element.prototype.scrollIntoView`: guard the call in the app only if needed for robustness (`el.scrollIntoView?.(...)` is acceptable) and stub it in tests (`Element.prototype.scrollIntoView = vi.fn()`).
    
    ## Tests to add (in `frontend/src/screens/contributor/ReviewScreen.test.tsx`; keep all existing tests passing)
    1. Typing in an open row (e.g. Edit "Based on", type text, don't press the row's Save) then pressing "Save draft" makes no PUT, shows a message naming "Based on", and focuses the open input.
    2. Same with "Confirm record": the panel does not open (or, if you choose to let it open, "Confirm and publish" makes no PUT/POST); the message names the row.
    3. Opening a row after the panel is shown, then "Confirm and publish": no PUT/POST, message in the panel.
    4. A newly added change (Add a change, which mounts open) blocks Save draft; after Cancel/removal it no longer blocks.
    5. Pressing "Confirm record" with no open rows focuses the "Before you confirm" heading and calls scrollIntoView.
    6. Escape inside the panel closes it and focuses "Confirm record"; "Go back and check" does the same.
    7. After a successful confirm, the app navigates to /records/:id without a leave prompt (`window.confirm` spy not called).
    8. With unsaved edits, an in-app navigation is blocked and asks `window.confirm`; declining keeps the user on the review screen. A `beforeunload` event is default-prevented while unsaved and not when clean.

#### Fix round 1

    Phase 1 fix round 1: three small changes in frontend/src/screens/contributor/ReviewScreen.tsx. Your Phase 1 diff passed review and browser checks otherwise. Do only these, then rerun typecheck, lint and test and report.
    
    1. The panel lands flush against the viewport bottom: at 1920x1080 after the scroll settles, the panel's bottom = 1080 = innerHeight; at 390x844, bottom = 844. Add a scroll margin to the panel section (e.g. Tailwind `scroll-mt-6 scroll-mb-6`) so `scrollIntoView({block:"nearest"})` leaves 24px of breathing room.
    
    2. The heading's focus ring spans the whole card width. The h2 is a block, so the 3px ring draws a full-width rounded box that looks like an input. Make the heading only as wide as its text (e.g. `w-fit`) so the ring hugs "Before you confirm". Keep the 3px coomassie-blue outline, offset 2px.
    
    3. Change rows are all named "a change from the SOP" in the guard message. When the change has text, name it like `the change "Eluted in 30 uL water instead of 50 uL"` (use `change.what` at the time the row opens). Keep "a new change" (or the current wording) when the text is empty (a just-added change). Update or add one test that checks the change-row name in the message.
    
    No other changes.

### Phase 2: polish (P2)

#### Brief to the implementer

    Phase 2 of 3: polish (P2). Same rules as Phase 1: same worktree, edit only under `frontend/`, no git, no servers, no `npm run build`. Do only what is listed, no extras. Read each file (and its test) before editing. When done, run `npm run typecheck`, `npm run lint`, `npm test` in `frontend/` and report files changed, what each change does, tests added/updated, and exact results.
    
    Design rules that apply (frontend/DESIGN.md):
    - Two Meanings Rule: Coomassie Blue (and its wash) only means "confirmed, cited or the main action". Do NOT add blue or coomassie-wash as a hover colour on secondary/text/nav/chip/card elements. (Primary already deepens to coomassie-deep; keep it.)
    - Use existing colour tokens from `frontend/src/index.css` @theme. Do NOT add a new token unless unavoidable; if you do, add it to both `index.css` and the YAML + Colors section of `frontend/DESIGN.md`.
    - Respect `prefers-reduced-motion`: hover changes colour/border/shadow only, never transform/translate. (`index.css:163-170` already strips transforms under reduced motion; don't add any movement.)
    - Transitions use the existing `duration-quick ease-out` (160ms).
    - Visible 3px Coomassie Blue focus indicator must remain on every control.
    
    Measured in the browser now (1920x1080): hover on secondary button, text button, nav item and AddChip only changes background #FFFFFF → #F7F8F8 (paper → paper-sunk, ~1.06:1, invisible). Who-list buttons, inbox rows and interactive Cards only change shadow rest → lift; border stays hairline #E3E7EA.
    
    ## 3. Hover states
    Files: `frontend/src/components/ui/button.tsx:13-14`, `frontend/src/components/Shell.tsx:91` (inactive nav) and `:110` (Switch link), `frontend/src/components/Chip.tsx:68` (AddChip), `frontend/src/screens/WhoScreen.tsx:66`, `frontend/src/screens/contributor/InboxScreen.tsx:130` (and the "Confirmed by you" list items in the same file if they are clickable rows with the same hover), `frontend/src/components/Card.tsx:15` (interactive cards).
    Make hover clearly visible with existing border/background tokens:
    - Secondary button: hover → border `ink-secondary` (#3A4452) and background `bench-grey` (#F1F3F2). Keep text bench-ink.
    - Text button (`variant: "text"`): hover → background `sage-chip` (#EAEEEC) and text underline (`underline underline-offset-4`), text stays coomassie-blue (it already is blue: it's an action). `destructive-text` keeps alert-wash hover, add the same underline for consistency.
    - Inactive nav item and the Switch link in Shell: hover → background `sage-chip` (instead of paper-sunk). The active item is unchanged.
    - AddChip: hover → border `ink-secondary` (still dashed) and background `bench-grey`.
    - Clickable cards/rows (Who list buttons, inbox rows, `Card interactive`): keep shadow rest → lift, and also change border hairline → `field-edge` (#8592A0) on hover (and on focus-visible / focus-within where they already lift). Who's "last used" item keeps its 2px coomassie-blue border on hover. Make the transition cover both border-color and box-shadow (e.g. `transition-[border-color,box-shadow]`).
    - The tag/person chip remove buttons (`enabled:hover:bg-rule`) are fine; leave them.
    - Update the prose in `frontend/DESIGN.md` where hover is described (Buttons "Hover / Focus", Navigation "Inactive: ... hover adds a Paper Sunk fill", Elevation "Interactive cards ... lift a little more on hover", Chips "Add chip") so the spec matches what you built. Keep edits to those sentences.
    
    ## 4. Inputs
    Files: `frontend/src/components/ui/field-styles.ts:9` (shared by Input, Textarea, Select), `frontend/src/components/ui/textarea.tsx`, `frontend/src/index.css:148-156` only if needed.
    Now: 1px field-edge border, no hover, focus = global `:focus-visible` 3px outline with 2px offset, which draws a double ring with a white gap around the border; native resize grip; no transition.
    - Hover (not focused, not disabled): border `ink-secondary`. Gap tone (`border-tape-edge`): hover border `tape-ink`.
    - Focus: a single clean ring with no gap: on `focus-visible`, set `outline-offset: 0` and turn the border coomassie-blue so the 1px border + 3px outline read as one ring (e.g. `focus-visible:outline-offset-0 focus-visible:border-coomassie-blue`). The outline stays 3px coomassie-blue (the global rule provides width/colour). Invalid fields (`aria-invalid:border-alert-red`) keep the red border when focused.
    - Transition: `transition-[border-color,outline-color] duration-quick ease-out` (or the shorthand that covers those).
    - Textarea resize: make it grow with its content where supported (`field-sizing: content`, Tailwind v4 `field-sizing-content`), with a minimum of about 3 lines (`min-h-[...]` matching the current rows=3 height ~101px) and a max height (e.g. `max-h-80`) after which it scrolls; keep `resize-y` so browsers without field-sizing still allow manual resize. Do not change any `rows` props at call sites unless needed.
    - Do not change the Select chevron or the file drop-zone label.
    
    ## 5. Tag chips
    Files: `frontend/src/components/Chip.tsx:8` (TagChip) and `:37` (PersonChip has the same issue), `frontend/src/screens/requester/SourceCards.tsx:50`.
    - Read-only chips (no remove button) have `pl-3 pr-0.5` (measured 12px/2px): space reserved for a remove button that isn't there. Use symmetric `px-3` when there is no remove button; keep `pl-3 pr-0.5` when there is one. Same for PersonChip when it is neither locked nor removable.
    - Long tags must not overflow the pill. Now the chip is a fixed `h-9`, so "kanamycin resistance screening" wraps to two lines and spills out of the pill. Use `min-h-9` (instead of `h-9`) plus a little vertical padding (`py-1`) so a wrapped tag stays inside the pill; keep text left-aligned and allow wrapping (`break-words` / `min-w-0`). Chosen over truncation because a `title` tooltip doesn't work on touch.
    - Make tags quieter in the Sources side card (SourceCards.tsx:50): seven tags currently take four rows. Add a `size?: "default" | "small"` prop to TagChip (small = `min-h-7`, `px-2.5`, `type-body-small` (weight 400), `gap-1.5` between chips at the call site). Use `size="small"` only in SourceCards. Do not change RecordScreen or DraftRows chips.
    
    ## Tests
    - Add or update unit tests only where behaviour changes: TagChip renders symmetric padding classes without a remove button and the remove-variant classes with one, and `size="small"` applies the small classes (a small test file `frontend/src/components/Chip.test.tsx` is fine). Keep all existing tests passing.

#### Fix rounds 1-3

    Fix round 1: In the Sources side card on Ask, the seven tags of record #3 still take 4 rows with `size="small"` chips (the card's text column is only about 214px wide). Replace the TagChip row in `frontend/src/screens/requester/SourceCards.tsx` with a quiet inline text list: one `<ul aria-label="Project tags">` whose items are inline, in `type-body-small text-ink-secondary`, separated by an `aria-hidden` middot; keep `mt-3`; no pills. Remove the now-unused `size` prop and small classes from `TagChip` and its test. Add one sentence to `frontend/DESIGN.md` Chips: in the Sources side card, tags are a plain Ink Secondary list separated by middots. Update/add one test asserting the Sources card lists the tags as text.
    
    Fix round 2: At 1920 the tag "pET-28a" breaks at its hyphen across two lines. Wrap each tag's text (not the separator) in `<span className="inline-block max-w-full">{tag}</span>`.
    
    Fix round 3: With every tag inline-block, the multi-word tag "kanamycin resistance screening" jumps to its own line and leaves "T7 ·" alone. Apply `inline-block max-w-full` only to tags that contain no space, with a one-line comment: single-word tags such as "pET-28a" must not break at the hyphen, while multi-word tags wrap at their spaces like normal text.

### Phase 3: layout and adapt (P2/P3)

#### Brief to the implementer

    Phase 3 of 3: layout and adapt (P2/P3). Same rules: same worktree, edit only under `frontend/`, no git, no servers, no `npm run build`. Do only what is listed, no extras. Read each file and its test before editing. When done, run `npm run typecheck`, `npm run lint`, `npm test` in `frontend/` and report files changed, what each change does, tests added/updated, and exact results.
    
    Relevant DESIGN.md rules (frontend/DESIGN.md "Layout", "Typography"): container max 1160px; two-column pattern main `flex: 999 1 560px`, side `flex: 1 1 320px`, 32px gap (so at full width the main column is 1112 - 32 - 320 = 760px); reading text ≤ 66ch; more space above a heading than below; one display heading per screen.
    
    Measured now at 1920x1080 (main column left x=404 on every screen):
    - Who list is 560px wide; Inbox content 1160px; Ask form 1112px before an answer, then the textarea shrinks to 760px when the Sources side column appears (the layout jumps).
    - Ask "Hints first": label at x=404, switch at x=1468 (≈590px of empty space from the end of the hint text, ≈1000px from the label word).
    - Inbox: chevrons in "Drafts to check" cards are at right=1491 (inside the card's 24px padding) but in the "Confirmed by you" list at right=1516.
    - Check the draft: "Your original record" side column scrolls away (its heading at y=-416 after scrolling 900px).
    - Draft card headings: H1 "Check the draft" 36px, then H3 Procedure/Based on/Contributors/Project tags 15px, then H2 "Changes from the SOP" 22px, then H3 "What went wrong, and the fix" 15px.
    - Phone 390x844: the lead says "Read it against your record on the right." but "Confirm record" is at y=2015 and "Your original record" at y=2112, below it.
    - Draft #2 (no numbers in common) shows "Highlighted: parts the draft uses." with 0 highlighted parts.
    - AnswerView "Still stuck? Ask a person" text button: its text starts 12px right of the answer text column (button px-3).
    
    ## 6. Wide screens
    - Add one width token: `--container-reading: 760px;` in the `@theme` block of `frontend/src/index.css` (next to `--container-page`), giving `max-w-reading`. Document it in `frontend/DESIGN.md` Layout with one bullet: single-column screens use the reading width (760px), the same as the main column of the two-column pattern at full width, so content edges line up across screens.
    - Apply `max-w-reading` to the single-column content of: WhoScreen (replace `max-w-[560px]` at WhoScreen.tsx:25), InboxScreen (wrap the page content in a `max-w-reading` div, or put it on the content container), and Ask's main column (AskScreen.tsx `main`: add `max-w-reading` to the outer `flex flex-col gap-8` div). With that, the Ask form is 760px before and after an answer, so it no longer jumps when Sources appear.
    - Ask "Hints first" (AskScreen.tsx ~line 214): put the Switch directly beside its label instead of at the far end: a row with the Switch first, then the label and hint text (e.g. `flex items-start gap-3`), the switch vertically aligned with the label line. Keep `id`, `htmlFor`, `aria-describedby` wiring unchanged. Keep the 44px minimum target (check `components/ui/switch.tsx`; don't change the switch component unless needed).
    - Inbox chevrons (InboxScreen.tsx ~line 172): align the "Confirmed by you" rows with the draft cards: give each confirmed row link the same horizontal padding as the draft card (`px-5 sm:px-6`) so the title text and chevron line up with the cards' title and chevron.
    - Check the draft: make the side column ("Your original record") sticky on desktop. Add an optional prop to `frontend/src/components/TwoColumn.tsx`, e.g. `stickySide?: boolean`, that adds `lg:sticky lg:top-6` to the side flex item (the flex item itself, not an inner wrapper, or sticky won't work). Use it only in ReviewScreen. So a long original record can still be read while sticky, cap the record text block in ReviewScreen's side card (the `<p className="whitespace-pre-wrap ...">` with NumberText) at `lg:max-h-[50vh] lg:overflow-y-auto`. Do not add overflow to the side column itself (it would clip card shadows and focus rings).
    
    ## 7. Draft card hierarchy (ReviewScreen.tsx, DraftRows.tsx)
    - Make every field label in the draft card the same heading level and style, directly under the page h1: change the row labels from `h3` to `h2` (RowHeader in DraftRows.tsx:27 and the editing-mode "Contributors" h3 in ContributorsRow), keeping their `type-label text-ink-secondary` style.
    - "Changes from the SOP" (ReviewScreen.tsx ~line 409) becomes an h2 with the same `type-label text-ink-secondary` style as the other field labels (not `type-headline`), and keep its spacing consistent with the other rows (it should read as one more row: give the section the same top border/padding rhythm as the rows, `border-t border-hairline pt-4`, instead of `mt-6`).
    - Leave the GapPanel heading and the side column headings unchanged.
    - Update any tests that query these headings by level (`getByRole("heading", { level: 3 ... })` etc.).
    
    ## 8. Phone order (ReviewScreen.tsx ~line 507)
    Fix the copy, not the order. Change the lead to: "Read it against your original record. LabKnow has marked what to look at first." where "your original record" is an in-page link (`<a href="#original-record">`, styled like the other text links: `text-coomassie-blue underline underline-offset-4`) to the side heading, which gets `id="original-record"` (and `scroll-mt-6`). This drops "on the right", which is wrong on a phone, and gives phone users a jump to the record.
    
    ## 9. P3
    - ReviewScreen side card: show "Highlighted: parts the draft uses." only when at least one number in `info.text` is highlighted, i.e. when some `findNumbers(info.text)` match has `normaliseNumber(match.text)` in `highlightKeys` (use the existing helpers in `frontend/src/lib/numbers.ts`; check how `NumberText` decides what to highlight and use the same rule).
    - AnswerView.tsx:127 "Still stuck? Ask a person": remove the ghost indent so the button text lines up with the answer text, by adding `-ml-3` to that text button (keeps its hover fill padding). Check other `variant="text"` buttons that sit alone at the start of a text column on the requester screens (e.g. OpenQuestionsCard, HelpStep) and apply the same only where the button's text should align with text above it; list which ones you changed.
    
    ## Tests
    - ReviewScreen: legend hidden when no number in the record is used by the draft, shown when one is; the lead link points to `#original-record`; heading levels updated in existing tests.
    - Keep all existing tests passing.

#### Resume after a server restart

    Resume after interruption: your Phase 3 run was interrupted by a server restart before you reported. Partial edits are on disk; do not revert them. Run `git diff` (read-only) and compare it item by item against the Phase 3 brief, finish whatever is missing or half-done, make no other changes, run typecheck, lint and test, and report every brief item with done/not done and file:line, the text buttons changed under item 9, and the exact results.

### Follow-up fixes from the final check

    Follow-up 1 (guard message off-screen): on draft #4 at 1920x1080, pressing "Save draft" with "Based on" open moved focus to the input (y=503) but rendered the role="alert" message in the action bar at y=1870, off-screen. Show the message inside the open row itself, under its Save/Cancel actions: give TextRow, TagsRow, ContributorsRow and ChangeRow an optional `blockedMessage` prop rendered as `<p role="alert" className="mt-2 type-body-small text-alert-ink">`; when a press is refused, pass "Save or cancel this edit first." to every open row; keep the focus move to the first open row and the re-check on "Confirm and publish"; remove the action-bar and panel copies; update tests to assert the alert is inside the open row and no PUT/POST is made.
    
    Follow-up 2 (anchor link drops state): the lead link `<a href="#original-record">` performed a hash navigation that replaced the history state, so `fromAdd` became false and the "Record added → Check the draft" progress header disappeared. Keep the href, but on click call preventDefault, scroll the side heading into view (auto under prefers-reduced-motion) and focus it (tabIndex -1, preventScroll). Add a test that arrives from Add, clicks the link, and asserts the progress list stays, the heading has focus and scrollIntoView was called.

## Suggest: leave out the requester and anyone asked (branch `fix/frontend-ui-audit`, 2026-11-22)

- **Who:** Claude Opus 5.5 wrote the change and its tests directly (no subagent). The human (benedictdavon) asked for it.
- **Why:** Tommy's blocking point 2 in the #20 review. The backend's repeatable `exclude` came in #18.

### Prompt

    merged, whats next

## Part C: model client, decoder, discussions, prompt suite, prompt card, ask log (2026-11-19 to 2026-11-22)

- **Who:** Claude Opus 5.5 (Claude Code) wrote the code, prompts, tests and docs directly, and ran the live tests against the team's model server. The human (dariuslung) set each task, chose the model and the server setup, decided the "not enough" rule and how a discussion is stored, judged the first prompt-suite run, and approved every commit and push. Two fresh Claude Opus agents (no prior context, no verdicts shown) reviewed the prompt-suite answers; the second one's verdicts are in `docs/cp2/prompt_suite/results/2026-11-22-1445.md`.
- **PRs:** #14 (`llm.py` for `llama-server`), #15 (decoder prompt, citation check, "not enough" rule), #16 (no proxy for the model client), #26 (`POST /api/discussions`), #27 (prompt suite, model decision), #28 (decoder prompt card), #29 (ask log).
- **Left out below:** questions about the code, review requests, and the server address.

### Prompts

#14, model client:

    See https://github.com/benedictdavon/nycu-ai-itl/pull/13 I'm thinking of using the RTX 4090 with llama-server on this machine, to run qwen3-4b for the task. Check if the PR is accurate, and what we can change

    IMO it's suit for the task, not the hardware. And my 4090 is a shared hardware, I'd rather not use up all of the available resource

    I don't think I want to use ollama, I don't like their sketchy branding and attribution. [...]

    Merged, pull and let's edit our changes

    Commit. Now let's setup llama-server on this machine and test if we can prompt. Plan

    Shouldn't we edit the .env.example since we don't use ollama anymore anywhere?

#16, from Benedict's #14 review:

    See PR 14 review comment

    Yes, push and reply

#15, decoder:

    Yes, start PR 1 with the citation check, or should we PR now?

    yes, commit it and continue with the prompt

    yes, commit and fix the prompt

    Yes, write it   [the "not enough" rule, architecture §4]

    See PR 15 requested changes

    fix the decoder "increased to 50 ng" issue

#26, discussions:

    Plan PR 2

    Check current main and see if our plan still stands

    Yes, build it

    I think it's their problem   [the text length limit, left to Part B]

#27, prompt suite and model decision:

    Plan the prompt suite runner and cases

    Yes, build it

    I think you should start a clean sub session and ask Opus to judge from a clean state too

    Yes, fail and fix

    Document as known limit

    I mean let a clean Opus mark again

    Yes, write it   [the model decision, 04 §5]

    Isn't this too many PR's at once? I think we can group this into another PR

Brief to the reviewing agents (abridged): judge the decoder's answers strictly from the answers, the case file, the sample records and the decoder prompts only; read-only; for each case with a `judge` sentence give pass or fail with a quote; list any other claim not supported by the cited records, invented direction, wrong citation, cause/fix confusion, or hint that is a full answer. The second agent was also told not to open `docs/`, so it saw no earlier verdict.

#28, prompt card:

    "Write the decoder part of the prompt card", what does this mean

    The CP2's wording is in the repo, so that's all we know. Review your guess, if you think it's ok, proceed to draft

#29, ask log:

    What about log_ask function we said to implement

## Part B: reading uploaded files (branch `feat/part-b-files`, 2026-11-22)

- **Who:** Claude Opus 5.5 (Claude Code) wrote all code, tests and docs in this branch. The human (李原誌, runnywolf) set the task, chose to build it now, and reviews and tests it before the PR.
- **Prompt** (translated from Chinese): after Claude listed what Part B still lacks against architecture §6 ("PR 1: `POST /api/infos` takes a file …") and proposed to build PR 1, the human replied "OK, please do it."
- **Choices Claude made, for the human to check:** `pypdf` and `python-docx`; 10 MB limit; 415 for other types and 422 for no text (because the Add screen already shows both as "No text found"); originals under `data/uploads/<random id>/<name>`, saved only after every check passes. See the matching entry in `docs/DECISIONS.md`.

## AI usage guidelines name Claude (branch `docs/ai-guidelines-claude`, 2026-11-22)

- **Who:** Claude Opus 5.5 (Claude Code) made the edit to `docs/AI_USAGE_GUIDELINES.md` §1. The human (dariuslung) decided the wording.

### Prompts

    I think we need to change AI_GUIDELINES since we don't really use Gemini, but rather Claude

    Only change Gemini to Claude, but add Claude to the top two points

## End-to-end run on the real model, and three UI fixes (branch `fix/frontend-e2e-findings`, 2026-11-22)

- **Who:** Claude Opus 5.5 (Claude Code) ran the 03 flow against the team's model server, through the API and the browser, and wrote the three fixes and their tests directly (no subagent). The human (benedictdavon) asked for the run, chose which findings to fix and asked for the commit, push and PR.
- **Fixes:** the number check accepts "62 C" without a degree sign; a reason that starts with "because" or "to" no longer reads "Because because" or "Because to"; the upload tab is hidden until the server reads files.
- **Left out below:** the server address and API key.

### Prompts

    How about my UI part? Should we start connecting everything, and testing the flow with real docs, etcs?

    use the real mode, set up the .env

    yes

    Yes fix the three UI items first

    Commit, push, and open the PR, also add an entry in DECISIONS.md
