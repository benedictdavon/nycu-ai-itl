# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Graduate students and research assistants in one shared academic wet lab (docs/cp1/02_problem_statement.md). Every member can play both roles:

- **Requester:** usually a newer member who needs to repeat, troubleshoot or take over a labmate's procedure, and wants the labmate's protocol changes, the reasons for them, and what failed and how it was fixed.
- **Contributor:** usually the experienced member who did the experiment and is asked the same questions repeatedly. Uploads records and checks the drafts LabKnow makes from them.

Members mostly use LabKnow at a desk on a laptop or lab computer. Phone width must work, but desktop is the primary target. The CP2 demo runs on one laptop, with two people on separate browsers or windows.

## Product Purpose

LabKnow turns scattered lab records into searchable knowledge. A contributor uploads a record, a local model drafts a structured summary (`M`), and the contributor corrects and confirms it. A requester asks a question in plain language and gets an answer that cites the source records and names their contributors. When the records are not enough, LabKnow says what is missing and helps the requester choose a person to ask; the resolved discussion is saved back as a new record, so the next person finds it without asking again (docs/cp1/03_interaction_design.md).

Success (docs/cp1/04_evaluation_plan.md): at least 4 of 5 researchers find and correctly interpret the relevant context within 5 minutes; contributors confirm an extracted record within 5 minutes; no invented parameter is presented as verified fact.

## Positioning

Answers come only from records a labmate has confirmed, always name who contributed them, and say plainly what the records do not cover. Records never leave the lab: the model runs on a server the team hosts itself.

## Operating Context

- Records come from Benchling, Google Drive SOPs, the lab NAS, personal computers, GoodNotes and paper notebooks. CP2 accepts pasted text and PDF, DOCX, TXT and Markdown files (including Benchling exports).
- Asking a labmate or the professor in person or over LINE is normal and stays the way help happens; LabKnow does not message anyone.
- Model replies can take up to about 30 seconds, and the model server may be unreachable (HTTP 503).

## Capabilities and Constraints

- Flow and screens: pick your name (no login), add a record, at most two follow-up questions, review and confirm a draft, review inbox, ask (with an optional hints-only mode), "not enough" answer with suggest-or-choose a person, save a resolved discussion, record view with a link to the original. The API is docs/cp2/api.md.
- Only confirmed records are searchable; only a listed contributor can confirm; a confirmed record can't be edited; the uploader always stays a contributor.
- Terminology: contributor, requester, record, draft, gaps, sources, hint mode, saved discussion.
- Stack (docs/cp2/architecture.md): React, TypeScript, Vite, shadcn/ui (Tailwind), served by the FastAPI backend as one process.
- UI, prompts and test data are in English. All sample data is made up (samples/).
- Undecided: whether a draft can be confirmed with open gaps (Part D decides and records it); notifications are out of scope for CP2 (the review inbox replaces them).

## Evidence on Hand

- Made-up members (samples/members.json), six sample records with expected summaries (samples/records/), one discussion (samples/discussions/).
- Interview findings from five researchers in one lab (docs/cp1/02_problem_statement.md). No real lab records, testimonials or usage numbers exist; do not invent them.

## Product Principles

1. Show where every claim comes from: sources and contributor names on every answer.
2. Keep documented facts visibly apart from what is missing or uncertain.
3. Keep the contributor's extra work small: their records as they are, at most two questions, one review screen.
4. People, not the tool, decide whom to ask and what is confirmed.
5. Lab records stay in the lab.

## Accessibility & Inclusion

Users read experimental parameters (amounts, volumes, temperatures) off the screen, so characters and numbers must be easy to tell apart. Readers are likely mostly non-native English speakers (inferred: the lab is in Taiwan, the UI is in English): plain, short sentences.
