# Prompt suite: fail-then-fix cycles (encoder)

The encoder's cycles, against Qwen3-4B Q8_0 on `llama-server`, temperature 0. The cases are in [`backend/prompt_suite/cases/encoder.json`](../../../backend/prompt_suite/cases/encoder.json). Run [results/2026-11-22-2104.md](results/2026-11-22-2104.md) is before cycle 2 and [results/2026-11-22-2105.md](results/2026-11-22-2105.md) is after it. The decoder's cycles are in [`fail_then_fix.md`](fail_then_fix.md).

## 1. Repeated questions and guessed reasons (before the suite)

**Found** while trying `encode()` on the real model with sample record 01, an unclear record and a record near the 12,000-character limit (Nov 22, before the runner had encoder cases). Each was run several times. Three failures:

- The model asked the same question again after it had been answered.
- It copied the prompt's example question word for word.
- It gave changes reasons that the record does not state, such as "to improve efficiency".

**Changes** (commit `369bbd9`):

- **Code** (`encoder/service.py`): a question that was already asked is dropped (it has its answer), and repeated gaps are removed.
- **Prompt** (`encoder/prompts/system.md`):
  - The example question is removed.
  - `reason` is filled "only if the record or an answer gives the reason in words … Never guess a purpose such as 'to improve efficiency'".
  - The reply schema puts the draft before the question.

**After:** no question was repeated. The case `enc-no-reason` now checks the guessed reason: record 04 adds a cold wash and gives no reason. It passes the automatic checks in both suite runs: the reason is null. Its judged property fails, though ([2105](results/2026-11-22-2105.md), judged by 李原誌). The draft also leaves out the result, the efficiency before and after (about 10^4 and 10^5 colonies per microgram), and `troubleshooting` is null. This is not fixed. It is a known limit in the prompt card, and the contributor can add the result on review.

## 2. The requester listed as a contributor (`enc-discussion`)

**Case:** the saved discussion `samples/discussions/01`. Chris Wu asks and Alex Chen answers. `POST /api/discussions` stores Alex Chen, who answered, as the Info's contributor (#26). Chris Wu only asked, so he is not a contributor.

**Before** ([2104](results/2026-11-22-2104.md)):

```json
"contributors": ["Alex Chen", "Chris Wu"]
```

**Prompt change tried, backed out.** We added to `contributors`: "In a discussion, someone who only asks questions is not a contributor." Two other rule changes were tried in the same run (cycle 3). Chris Wu was still listed. `enc-no-reason`, which had passed, failed with a guessed reason: "to increase efficiency from 10^4 to 10^5 colonies per microgram".

**Code change kept** (`_with_rules` in `encoder/service.py`): a discussion's only contributor is the Info's contributor. The model's list is used only for uploads. `test_a_discussion_never_asks` checks this.

**After** ([2105](results/2026-11-22-2105.md)): `"contributors": ["Alex Chen"]`, and `enc-no-reason` passes again.

## 3. A question the record already answers (`enc-complete`, `enc-numbers`): not fixed, a known limit

**Case:** sample record 01, a complete record. It says the cells clumped with the SOP wash volume and that doubling it fixed this. A question is not needed.

**Failure:**

- The model asks "Why was the wash volume doubled?" and leaves that change's `reason` null.
- On record 02 it asks "What was the expected size of the band?". A labmate needs the size, so it belongs in `gaps`, but only the contributor can answer it, so asking is not wrong. The case expects no question, because the result (one clean band) is written.

**Prompt changes tried, all backed out.** Each one was run on all six cases.

| Change to `system.md` | `enc-complete` | `enc-no-reason` (passed before) |
|---|---|---|
| Three rules together: the discussion rule (cycle 2); "If the record says what went wrong the first way and the change fixed it, that problem is the reason"; and "Ask only if the record does not say why an important change was made, or what the result was" | Still asked, now "Why was the plasmid amount changed to 50 ng?"; `reason` still null | **Failed:** "to increase efficiency from 10^4 to 10^5 colonies per microgram" |
| Only the "Ask only if …" rule | Asked "what was the original wash volume in the SOP?", a value the prompt says not to ask for | **Failed**, the same guessed reason |

As with the decoder's hint mode, every stricter rule made another case worse. So the prompt stays as it was.

**Why this is acceptable for CP2:** a needless question costs the contributor one click on "Skip". The question then goes into `gaps`, and the contributor reads the draft before confirming it. The limit of two questions is enforced in code. The suite keeps both cases failing so that a later prompt or model can be checked against them. `based_on` staying null on record 01 is the same kind of limit, already noted in `docs/DECISIONS.md`.
