# Prompt documentation card

One section per prompt. The prompt files are the source of truth (architecture §3); this card says what each prompt is for, what goes in and out, what code enforces around it, and how it was tested. Change the card when a prompt changes.

## Decoder: answer from confirmed records (Part C)

| | |
|---|---|
| **Task** | Answer a requester's question from the confirmed records that search returned, cite them and name their contributors (D3-1); give hints instead of a detailed answer when the requester asks (D3-1a); say what is missing when the records are not enough (D3-2). |
| **Prompt files** | [`decoder/prompts/system.md`](../../backend/app/decoder/prompts/system.md), always. [`decoder/prompts/hint.md`](../../backend/app/decoder/prompts/hint.md), appended in hint mode. |
| **Called by** | `decoder.answer()` in [`decoder/service.py`](../../backend/app/decoder/service.py), from `POST /api/ask` with the top 5 search hits. |
| **Model** | Qwen3-4B, Q8_0 GGUF, on `llama-server` that the team hosts (an RTX 4090 over Tailscale). Records go to no outside AI service (04 §5). |
| **Settings** | Temperature 0. Qwen3 thinking off (`enable_thinking: false`). Output constrained to the JSON schema of `Answer` (`response_format`). 0.4–0.7 s per answer on the suite's cases. |

### Input

The system prompt, then one user message: the question and each hit, formatted by `_format_record()`. Example with sample record 01:

```text
Question: Why did my cells clump after washing, and what should I change?

Records:

[id 1] Procedure: Transformation of strain X with plasmid P
Based on: Drive SOP "Transformation v2"
Contributors: Alex Chen
Problem and fix: First attempt gave few colonies. Fixed by the wash change above.
Changed from the base protocol: Wash volume doubled (why: cells clumped with the SOP wash volume)
Changed from the base protocol: Plasmid amount: 50 ng
Changed from the base protocol: Recovery step unchanged from the SOP
```

The labels "Problem and fix" and "Changed from the base protocol" are part of the prompt design: the system prompt explains them, and they stopped the model from reading a fix as the cause (fail-then-fix cycle 1).

### Output

One `Answer` (`models.py`): `kind` (`answered` or `insufficient`), `text` (Markdown), `cited_record_ids`, `contributors`, `uncertainties`.

### What the prompt asks

- **Sources:** answer only from the records, nothing else; use only records about the same procedure and problem; cite every record used and no other.
- **No invented details:** no number, amount, time, temperature or reagent that is not in a cited record; no direction of change (increased, lowered) unless the record gives both values or the direction.
- **Reading a record:** keep cause and fix apart; a change from the base protocol is a fix, never a cause; describe a record only with its own details.
- **Not enough:** `insufficient` with no citations when the records do not answer; `answered` plus `uncertainties` for a partial answer, a condition the record does not cover (another insert, construct or kit), or records that disagree.
- **Style:** short Markdown, name the contributor; leave `contributors` empty.
- **Hint mode:** no fix, no values; point to the step or variable that mattered and whose record to read, in one to three sentences, with a worked example.

### Enforced in code, whatever the model does

- **No hits, no model call:** the answer is `insufficient` straight away.
- **Citation check:** cited ids that were not among the hits are dropped, and duplicates too. An `answered` answer with no valid citation left becomes `insufficient`. An `insufficient` answer never carries citations.
- **Contributors** are recomputed from the cited records, never taken from the model.
- **Shape:** the reply must validate as `Answer`; otherwise the API returns 503 and shows no answer.
- `POST /api/ask` returns as sources only cited records that were among the hits.

### Tested

- Unit tests with a fake model: [`tests/test_decoder.py`](../../backend/tests/test_decoder.py) (citation check, no-hit path, prompt contents, hint mode).
- The prompt suite against the real model: 7 decoder cases in [`prompt_suite/cases/decoder.json`](../../backend/prompt_suite/cases/decoder.json): typical, a value with no direction, no relevant record, two in hint mode, a record about a different case, and a question only a saved discussion answers. Latest run: 6 of 7 pass ([results](prompt_suite/results/)).
- Fail-then-fix ([`fail_then_fix.md`](prompt_suite/fail_then_fix.md)): cause and fix swapped, fixed by record labels and rules; "increased to 50 ng", fixed by the direction rule; a hint that gives the fix, not fixed (below).

### Known limits

- **Hint mode can give away a fix that is an added step** ("adding an extra cold wash improved efficiency"). Three stricter hint prompts were tried; each made another hint case worse, so the prompt was kept and the suite records the failure. Present a hint as "where to look".
- **Small inferences beyond the record**, for example "the wash volume was too small" when the record says only that the cells clumped with the SOP volume, and the odd extra sentence that does not answer the question. The citations let the reader check against the source.
- **Relevance is the model's call.** Search decides what counts as a hit; if tests show answers from unrelated hits, a search score threshold is the fallback (architecture §4).
- A small model is sensitive to prompt wording: rerun the whole suite after any prompt change.

### People stay in charge

Only records their contributors confirmed are searched. The requester chooses hint mode, sees the cited records and their contributors, and can ask a person instead (D3-3, D3-4).

## Encoder: draft M from a record (Part B)

| | |
|---|---|
| **Task** | Turn a raw record (pasted text or a saved discussion) into a draft `M` for the contributor to review (D2-3a), and ask up to two short follow-up questions when the record does not say something only the contributor knows (D2-3b). |
| **Prompt files** | [`encoder/prompts/system.md`](../../backend/app/encoder/prompts/system.md), always. [`encoder/prompts/no_questions.md`](../../backend/app/encoder/prompts/no_questions.md) is appended when no more questions may be asked: after two answers, and always for a discussion. |
| **Called by** | `encoder.encode()` in [`encoder/service.py`](../../backend/app/encoder/service.py). Its callers are `POST /api/infos`, `POST /api/infos/{id}/follow-ups` (once per answer) and `POST /api/discussions`. |
| **Model** | The decoder's model: Qwen3-4B, Q8_0 GGUF, on `llama-server` that the team hosts. Records go to no outside AI service (04 §5). |
| **Settings** | Temperature 0. Qwen3 thinking off. The output is constrained to the JSON schema of `ModelReply` (`draft`, then `question`). 0.7–1.0 s per call on the suite's cases. Record text is limited to 12,000 characters (413 above that), so the 8,192-token context has room for the prompt, two answers and the reply. |

### Input

The system prompt is followed by one user message, built by `_format_info()`. Here is sample record 01 after one skipped question:

```text
Contributor (uploader): Alex Chen
Title: Transformation of strain X with plasmid P
Project tags: Project X

Record:
Transformation of strain X with plasmid P, following Drive SOP "Transformation v2". First try (SOP wash volume): few colonies, cells clumped after washing. Second try: doubled the wash volume, used 50 ng plasmid. Recovery step was the same as the SOP. Normal colonies on the second try.

Follow-up question 1: Why was the wash volume doubled?
Answer from Alex Chen: I don't know
```

"I don't know" is what the Follow-up screen sends for "Skip". The prompt reads it as a skipped question.

### Output

The model returns one `ModelReply`: a `draft` (`RecordDraft` in `models.py`) and a `question` (text or null). The draft is always filled in, even when there is a question. Code then turns the reply into an `EncoderResult`: a question to ask, or the draft.

### What the prompt asks

- **Fields:** one line for each field of `M`. `based_on` is the protocol, SOP or kit the record names. `changes` lists each step done differently from the base protocol.
- **Reasons:** a change's `reason` is given only when the record or an answer says it in words. Never guess a purpose such as "to improve efficiency".
- **No invented details:** no number, amount, time, temperature or reagent that is not in the record or an answer. No direction of change unless the record gives both values or says which way it went. Anything missing goes in `gaps`.
- **Cause and fix apart:** a change is a fix or an improvement, never the cause of a problem.
- **Questions:**
  - Most records need none.
  - Ask only for what a labmate needs and only the contributor can tell, such as why an important change was made or what the result was.
  - Do not ask for values that are in the SOP.
  - Ask one short question about one thing, and never ask the same thing twice.
  - Treat "I don't know" as a skipped question: the detail goes in `gaps`.
- **Language:** plain English, even when the record is in another language.

### Enforced in code, whatever the model does

- **At most two questions, and none for a discussion.** If no more questions are allowed, a question the model still returns goes into `gaps`, and the draft is kept.
- **A question already asked is dropped.** It has its answer, so it does not become a gap either. Repeated gaps are removed.
- **Contributors:**
  - For an upload, the uploader is always the first contributor (D1-4).
  - For a discussion, the person who answered is the only contributor. The model also listed the requester (fail-then-fix cycle 2).
- **The upload's project tags are kept.**
- **Shape:** the reply must validate as `ModelReply`. If it does not, the API returns 503. For a follow-up answer, the question stays open so the contributor can retry.
- **Two answers to one question:** an answer is stored only if its question is still the open one. A second answer (a double click, or a second tab) gets 409.
- **The contributor confirms every draft** before it can be searched. The encoder never confirms.

### Tested

- **Unit tests with a fake model:**
  - [`tests/test_encoder.py`](../../backend/tests/test_encoder.py) covers the question limit, discussions, repeated questions and gaps, contributors and tags.
  - [`tests/test_api_flow.py`](../../backend/tests/test_api_flow.py) covers questions then a draft, a model failure, double answers and the text limit.
- **The prompt suite against the real model:**
  - 6 encoder cases in [`prompt_suite/cases/encoder.json`](../../backend/prompt_suite/cases/encoder.json): a complete record, a record full of values, a change with no written reason, an unclear record that must be asked about, every question skipped, and a discussion.
  - Latest run: 4 of 6 pass the automatic checks, and 2 of the 3 judged properties pass ([results/2026-11-22-2105.md](prompt_suite/results/2026-11-22-2105.md)). `enc-no-reason` passes its checks but fails its judged property (see below).
- **Fail-then-fix** ([`fail_then_fix_encoder.md`](prompt_suite/fail_then_fix_encoder.md)):
  1. Repeated questions and guessed reasons, fixed in code and in the prompt.
  2. The requester listed as a contributor, fixed in code.
  3. Questions the record already answers, not fixed (see below).

### Known limits

- **Needless questions:** the model sometimes asks what a complete record already says. On record 01 it asks why the wash volume was doubled, although the record says the cells clumped with the SOP volume. It then leaves that `reason` null. Two stricter question rules were tried; each made the model guess reasons again, so the prompt was kept. A needless question costs one "Skip".
- **`based_on` is often null** even when the record says "following Drive SOP …". Asked alone, the model finds it; among all the fields it misses it. The contributor fills it in on review.
- **A result can go missing.** On record 04 the draft leaves out the efficiency before and after the extra cold wash (about 10^4 and 10^5 colonies per microgram). It gives no reason, as it should, but it drops the result too, and `troubleshooting` is null. The contributor sees the original record next to the draft and can add it on review.
- **Reasons that are close to the record but not in it,** for example "to eliminate non-specific bands" for record 02, where the record gives the bands before and after but no reason. The contributor reviews every draft.
- A small model is sensitive to prompt wording: rerun the whole suite after any prompt change.

### People stay in charge

The contributor answers or skips each question and reviews and edits every field. Only they can confirm the draft, and only confirmed records can be searched (D2-3a).
