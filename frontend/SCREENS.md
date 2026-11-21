# LabKnow screens (Part D build spec)

What each screen shows, what it calls, and the states it must handle. The look is in [DESIGN.md](DESIGN.md); the product context is in [PRODUCT.md](PRODUCT.md); the API is [docs/cp2/api.md](../docs/cp2/api.md); the flow is 03 §"How Two Lab Members Use It". The design canvas (private, ask Benedict for access) has one board per screen: https://claude.ai/artifact/9o24vMkFkQgErgJ61846Mh

Items marked **[needs API]** depend on a change listed in [Needs from other parts](#needs-from-other-parts). Until it lands, build the fallback given.

## Global

- **Stack:** React, TypeScript, Vite, shadcn/ui (Tailwind), with the DESIGN.md tokens mapped into the Tailwind theme. FastAPI serves the build (Part D PR 2).
- **Routes:** proposed below; plain client-side routes.
- **Current person:** picked on `/who`, kept in `localStorage` (`labknow.me`). No name means redirect to `/who`. The header shows the name and a "Switch" link to `/who`.
- **Header:** wordmark (links to `/ask`), nav (Ask, Add a record, To review with a count badge), current person. Phone: wordmark and avatar on one row, the three nav items as equal tabs below.
- **Model calls** (`POST /api/infos`, follow-ups, `POST /api/ask`, `POST /api/discussions`) can take up to about 30 s:
  - Disable the triggering button while waiting, so nothing is sent twice.
  - Show the waiting card ("Drafting your record" / "Finding an answer"): an indeterminate bar plus elapsed seconds with tabular numerals ("12 seconds so far. It usually takes under 30.").
  - On **503**, show "Can't reach the model", keep all form input, and offer "Try again".
- **422:** show the field-level message under the field. Never a raw `detail`.
- **Accessibility:**
  - All controls are real `button`, `a`, `input` or `select` elements.
  - 44px minimum targets and a 3px focus ring.
  - Answers render in an `aria-live="polite"` region.
  - Errors use `role="alert"`, toasts use `role="status"`.

## 1. Who are you: `/who` (board: Who are you)

- **Data:** `GET /api/members` → `string[]` (Part D adds it, reading `samples/members.json`).
- **Content:**
  - Display heading "Who are you?" and a one-line explanation.
  - One large row per member: initials avatar plus name. The last-used name is highlighted.
- **Action:** picking a name saves it and goes to `/ask` (always `/ask`, whoever is picked).
- **States:** loading (skeleton rows); error ("Couldn't load the member list" plus Try again).

## 2. Add a record: `/add` (board: Contributor: add a record)

- **Content:**
  - Title (required).
  - Tabs, "Paste text" / "Upload a file":
    - **Paste text:** a textarea.
    - **Upload a file:** a drop zone labelled "PDF, Word (.docx), text or Markdown". The file input is visually hidden inside the label.
  - Link to the original (optional), project tags (optional, comma-separated).
  - A side column with "What happens next" (3 steps) and "Your record stays in the lab".
- **Action:** "Draft the record" sends `POST /api/infos` (multipart: `contributor` = me, `title`, `text` or `file`, `link`, `tags`) → `EncodeState`:
  - `result.kind == "question"` → `/add/{info.id}`.
  - `result.kind == "draft"` → `/review/{record_id}`.
- **States:**
  - Waiting card.
  - 503.
  - 422: a blank field.
  - Unsupported or unreadable file: "No text found in plate-photos.pdf. It looks like scanned pages or photos… Paste a short summary as text instead", plus "Paste text instead" (switches the tab). Part B settles the exact error code.

## 3. Follow-up question: `/add/:infoId` (board: Contributor: follow-up question)

- **Data:** `GET /api/infos/{id}` → `EncodeState`, so a reload or a return from To review works.
- **Content:**
  - Progress: "Record added" ✓, "Question N of at most 2", "Check the draft".
  - The question as a title, then one line on why it matters.
  - An answer textarea.
  - Side column: the original record text and the link.
- **Actions:**
  - **Send answer:** `POST /api/infos/{id}/follow-ups` `{answer}` → `EncodeState`. If another question comes back, stay here with "Question 2 of at most 2"; if a draft comes back, go to `/review/{record_id}`.
  - **Skip this question:** **[needs API]** (`FollowUpAnswer` requires at least 1 character). Fallback: send the answer "I don't know", which becomes a gap.
- **Copy:** "Don't know? Skip it. It becomes a gap you can fill in on the next screen. You can also leave and come back: the question waits in To review."

## 4. Check the draft: `/review/:recordId` (board: Contributor: check the draft)

This screen is for proofreading the draft, not filling in a form.

- **Data:**
  - `GET /api/records/{id}` → `RecordView` (`record`, `info`).
  - `GET /api/infos/{info.id}` for the follow-up answers.
  - Only shown to a member in `record.contributors`.
- **Header:**
  - Progress, when arriving from the add flow; otherwise "Back to To review".
  - Display heading "Check the draft".
  - **Summary chips:**
    - "N changes from the SOP".
    - "N steps the same as the SOP" **[needs API]**.
    - "N gaps", as a tape label.
    - The number check: "N numbers not in your record" (alert) or "Every number checked" (blue).
- **Draft rows** are read-only text with an "Edit" text button. Editing turns that row into inputs with Save / Cancel. Rows:
  - **Procedure, Based on.**
  - **Contributors:** the uploader's chip has no remove control and reads "(you, always kept)"; "Add someone" picks from members.
  - **Project tags.**
  - **Changes from the SOP:** each row is the change in bold with "Because …" under it, or "No reason given. Add one". There is an "Add a change" button.
  - **Same as the SOP** **[needs API]**. Fallback: leave this section out and keep such rows under Changes.
  - **What went wrong, and the fix.**
  - **Gap panel:** one input per `gaps` entry, with the placeholder "Leave empty if you don't know".
- **Number check (client-side, no API change):**
  - Find every number-with-unit in the draft fields (for example `50 ng`, `1 h`, `37 °C`, `2x`).
  - Any number that doesn't appear in `info.text` or in a follow-up answer gets the number flag, plus a check panel: "'1 h at 37 °C' isn't in your record or your answers… Is it right?", with "Yes, it's right" / "Remove it".
- **Original record** (side column): the text, with the parts the draft uses highlighted in Coomassie Wash, the "Open in Benchling" link, and "Your answers".
- **Actions:**
  - **Save draft:** `PUT /api/records/{id}` with the edited `RecordDraft`. An empty gap stays in `gaps`.
  - **Confirm record:** opens the inline "Before you confirm" panel, which lists:
    - unchecked numbers;
    - empty gaps ("Labmates will see them as not recorded");
    - "Labmates can find this record as soon as you confirm. You can't edit it after."

    Then "Confirm and publish" sends PUT if anything was edited, then `POST /api/records/{id}/confirm` `{confirmed_by: me}`, then goes to `/records/{id}` with a toast.
  - **Discard draft** **[needs API]**. Fallback: hide it.
- **States:**
  - 403: not a contributor.
  - 409: already confirmed ("This record was just confirmed… Open the confirmed record").
  - 503 does not apply here (no model call).
- **Decision:** a draft can be confirmed with empty gaps; they are shown as "Not recorded". Record this in `docs/DECISIONS.md`, as the Part D checklist requires.

## 5. To review: `/inbox` (board: Contributor: to review)

- **Data:**
  - `GET /api/records?status=draft&contributor={me}`.
  - Pending questions **[needs API]** (Part B).
  - `GET /api/records?status=confirmed&contributor={me}` for "Confirmed by you".
- **Content:**
  - **Questions from LabKnow:** record title, the question, "Question 1 of at most 2", → `/add/{infoId}`.
  - **Drafts to check:**
    - **Origin line:** "Your upload", or "From a discussion Chris Wu saved" (needs `info.kind`, via `GET /api/records/{id}`, and the requester **[needs API]**).
    - **Title:** `procedure`.
    - **Gap count:** a tape label.
    - **Date** **[needs API]**.
    - The row opens `/review/{id}`.
  - **Confirmed by you:** a list linking to `/records/{id}`.
- **Badge** in the header = pending questions + drafts.
- **Empty:** "You're all caught up. Questions and drafts show up here when you add a record or when someone saves a discussion they had with you", plus "Add a record".

## 6. Ask: `/ask` (boards: Requester: answered; Ask at phone width)

- **Your open questions** (top, only when there are any): questions this person took to a labmate. Kept in `localStorage` for CP2 **[needs API]** for sharing across devices. Each entry is either:
  - **Asking:** "You're asking Alex Chen", with "Save the answer" (→ `/discussions/new` prefilled) and "Not solved" (→ the help step with that person left out).
  - **Waiting:** "Saved. Waiting for Dana Huang to confirm it." It is removed once a confirmed record exists for it. Before timestamps exist, check `GET /api/records?status=confirmed&contributor=X` for a matching question.
- **Form:**
  - The question (min 3 characters) and the "Hints first" switch (`role="switch"`) with its description. Hint mode is chosen **before** asking.
  - "Ask" sends `POST /api/ask` `{question, requester: me, hint_mode}` → `AskResponse`. While waiting, show the waiting card.
- **Answered, full** (`answer.kind == "answered"`, `hint_mode` false):
  - Heading "Answer", plus "From N confirmed records by {contributors}. Each fact links to the record it came from."
  - The body is `answer.text` rendered as Markdown. Each `[n]` becomes a source marker **[needs API]**. Before that lands, put one marker per cited source after the text.
  - Any number in the text with no marker gets the number flag, plus "No source for '1 mL'… Don't use it without checking".
  - Then the gap panel "What the records don't say", listing `answer.uncertainties` (hidden if empty).
  - Then "Still stuck? Ask a person" (→ the help step).
- **Sources** (side column): one card per `sources[]` item: number badge, `procedure`, contributor names, "Confirmed by …" (date **[needs API]**), tags, "Open record" (→ `/records/{id}`), "Original" (`info.link`, if any).
- **Hints** (`hint_mode` true):
  - The hints from `answer.text` with no source markers, and source cards without links ("Links to the record appear with the full answer").
  - "Show the full answer" re-sends with `hint_mode: false` and shows the waiting card ("Asks again, up to 30 seconds").
- **Not enough** (`answer.kind == "insufficient"`): see screen 7, on the same route.
- **Empty search history / first use:** just the form. If no records are confirmed yet, the answer says so (Part C), and the page offers "Add a record".

## 7. Not enough in the records: `/ask` with an insufficient answer (board: Requester: not enough in the records)

- **Banner:** a tape label "Not enough in the records" plus a headline that names what isn't explained.
- **Body:** "What the records do say" (the answer text, with source markers), and "What's uncertain" (`answer.uncertainties`).
- **"Want to ask a person?"**
  - The line "LabKnow won't contact anyone for you".
  - A radiogroup: "Suggest someone" / "I'll choose". **Nothing is selected by default** (D3-2 consent).
  - **Suggest someone:** `GET /api/suggest-contributor?q={question}`.
    - Returns a person: show their card.
    - Returns `null`: show "No one's records match this question closely. Choose someone yourself. The professor often knows who has done an experiment" and switch to "I'll choose".
  - **I'll choose:** a select from `GET /api/members`, without me.
- **Once a person is picked:**
  - **A message you can send:** a read-only textarea built in the browser from the question, the "do say" text and the uncertainties. "Copy message" uses the Clipboard API, then reads "Copied".
  - Add the question to "Your open questions" as "asking {person}".
  - "It's solved: save the answer" → `/discussions/new?q=…&contributor=…`.
  - "Not solved: ask someone else" keeps the asked list, shows "You asked Alex Chen and it isn't solved yet. Alex is left out below", and removes them from the select. The suggestion needs **[needs API]** to leave out people already asked. Fallback: if the suggestion is someone already asked, show the no-close-match state.

## 8. Save the discussion: `/discussions/new` (board: Requester: save the discussion)

- **Fields:**
  - Your question (prefilled).
  - Who answered it (select, prefilled).
  - The discussion (textarea: paste the chat, or type what was said in person).
  - Link (optional).
  - The checkbox "{person} and I agree this answers the question". **Unticked by default.** "Send" is disabled until it's ticked, with the reason shown next to the button.
- **Action:** "Send to {person} for review" sends `POST /api/discussions` `{requester: me, contributor, question, text, link}` → `EncodeState` (always a draft).
  - The waiting card while it runs.
  - Then `/ask`, with the toast "Sent to Alex for review. It stays in Your open questions until Alex confirms it.", and the open question changes to "Waiting".
- **Side column:** "What happens next" (3 steps).
- **Credit:** "You are credited as the person who asked." **[needs API]** Until it lands, drop the sentence.

## 9. Record view: `/records/:recordId` (board: Record view)

- **Data:** `GET /api/records/{id}` → `RecordView`.
- **Content:**
  - "Confirmed by {confirmed_by}" (date **[needs API]**).
  - The procedure as the display heading, and "Based on …".
  - "Changed from the SOP" as a list: the change in bold, the reason or "No reason recorded".
  - "Same as the SOP" **[needs API]**.
  - "What went wrong, and the fix".
  - A gap panel "Not recorded: Ask {contributor} if you need these", listing the remaining `gaps`.
  - Contributors and project tags.
- **Side column:** the original record text, "Open in Benchling" (`info.link`), and "Download the original file" only when `info.has_file` is true (`GET /api/infos/{id}/file`). A pasted record says "Added as pasted text, so there is no file to download."
- **Drafts:** a draft opened here by a non-contributor shows "This record isn't confirmed yet" and no content.

## Needs from other parts

| # | Change | Owner | Used by | Fallback until then |
|---|---|---|---|---|
| 1 | `Change` can mark a step as the same as the SOP (flag or separate list) | `models.py`, all owners review | Review, Record, Ask | Keep such steps under Changes |
| 2 | Store who saved a discussion (`Info.requester`) | `models.py`, Part C | Inbox origin line, credit | "From a saved discussion", no name |
| 3 | List a contributor's pending follow-up questions | Part B | To review | Only drafts listed; the user must not leave mid-question |
| 4 | Allow an empty answer or a skip on follow-ups | Part B | Follow-up "Skip" | Send "I don't know" |
| 5 | `suggest-contributor` can leave people out (`exclude=`) | Part A | "Not solved" | Show the no-close-match state |
| 6 | `created_at` / `confirmed_at` timestamps | `models.py`, Part A | Inbox, sources, record view | Hide dates |
| 7 | A `[n]` marker convention in `Answer.text` | Part C | Source markers, number flags | One marker per source after the text |
| 8 | Delete a draft | Part A | Review "Discard draft" | Hide the button |
| 9 | Open questions stored on the server | Part A or C | Ask | `localStorage` per browser |

## Build order (matches the Part D checklist in architecture.md §6)

- **PR 1:**
  - The shell (header, current person, tokens in Tailwind) and `GET /api/members`.
  - Who are you, Add a record (paste), Check the draft (without the number check), Ask (full, hints, insufficient with suggest/choose), and Record view, all against the scaffold API with `LLM_BACKEND=fake`.
- **PR 2:**
  - FastAPI serves the build.
  - Follow-up question, To review, Save the discussion, the number check, the waiting/error/empty states, and the phone layout.
  - The decision on confirming with empty gaps goes into `docs/DECISIONS.md`.
- **Later**, as each **[needs API]** item lands: replace its fallback.
