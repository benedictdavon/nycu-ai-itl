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

To be written by Part B.
