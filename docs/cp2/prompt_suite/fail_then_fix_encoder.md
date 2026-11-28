# Prompt suite: fail-then-fix cycles (encoder)

The encoder's cycles, against Qwen3-4B Q8_0 on `llama-server`, temperature 0. The cases are in [`backend/prompt_suite/cases/encoder.json`](../../../backend/prompt_suite/cases/encoder.json). Run [results/2026-11-22-2104.md](results/2026-11-22-2104.md) is before cycle 2 and [results/2026-11-22-2105.md](results/2026-11-22-2105.md) is after it. Runs [2026-11-25-1529](results/2026-11-25-1529.md) and [2026-11-25-1533](results/2026-11-25-1533.md) are before and after cycle 4. The decoder's cycles are in [`fail_then_fix.md`](fail_then_fix.md).

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

## 4. Short records: results listed as changes, and questions the record answers (#40)

**Found** by Benedict in the contributor flow (#40), on a short record with no SOP: `Green apple took 3 years to grow, and have a mass of 500gr. Red apple has a mass of 300gr`. Two new cases, `enc-short-no-sop` (this record) and `enc-short-observation` (a short lab note with colony counts only), with a new `no_changes` check.

**Before** (prompt as in cycle 3). The suite run [1529](results/2026-11-25-1529.md) asked about the red apple and listed no changes, so it did not show the problem. Running `encode()` directly on the same record with five titles ("apple", "Apples", "test", "Apple experiment", "Green and red apple") did:

- 3 of 5 asked "How long did it take to grow the green apple?", which the record says.
- With the answer "5 years", all 3 drafts listed the record's facts as changes:

```json
"changes": [
  {"what": "Green apple took 3 years to grow", "reason": "Record states this"},
  {"what": "Red apple has a mass of 300gr", "reason": "Record states this"}
]
```

**Change 1, kept** (`encoder/prompts/system.md`, `changes`): "A result or observation (a count, a size, a mass, how long something took) is not a change. If the record names no base protocol and says nothing was done differently, `changes` is empty."

**After** ([1533](results/2026-11-25-1533.md)):

- The same three drafts have `"changes": []`.
- The other cases are unchanged: 6 of 9 pass. `enc-complete` still lists the wash change and its reason now says the cells clumped.
- The needless question is asked in 2 of 5 titles.

**Change 2, backed out:** an example after "Never ask what the record … already says": `if the record says "the culture grew for 16 h", do not ask how long it grew`. Needless questions fell to 1 of 5. But `enc-no-reason` failed again, with the reason "to increase …" guessed, as in cycle 3. A shorter rule without the example ("Before you ask about a value, look for it in the record") made no difference, so it was removed too.

**Not fixed, known limits:**

- The draft has no field for results, so the model now leaves them out instead of listing them as changes. The 3 years, 500 g and 300 g are not in the draft. Fixing this needs a `results` field in `models.py`, which every part owner must review.
- The needless question on short records. It costs the contributor one "Skip". Since #39, a contradicting answer to it is no longer lost: it becomes a gap.

## 5. The #39 guard fooled by the model's next question (`enc-answer-conflict`)

**Found** in run [2026-11-29-0023](results/2026-11-29-0023.md), on the code of #44 and #40 together. This time the model asked about the green apple, a real contradiction with the record's 3 years, and was told "5 years". Its next question was "What was the result of the 5-year growth period for the green apple?". That question went into `gaps`, and the guard counted the "5" in it as the draft using the answer. So no gap was added, and the draft took the answer's side without showing the conflict.

**Change** (`_unused_answers` in `encoder/service.py`, commit `b1cbb69` in #44): the draft's numbers are collected without `gaps`, because a gap is a question, not a use of the answer. `test_a_number_only_in_a_gap_is_not_used` checks it.

**After** ([2026-11-29-0027](results/2026-11-29-0027.md)): the same two questions, and the draft now has the gap `How long did it take to grow the green apple? Answered "5 years", which the draft does not use`. The other cases are unchanged.

The automatic check `answers_used` passed in both runs, because the gap had the "5" either way. It checks that the answer's number reaches the draft, not that the conflict is shown. Only reading the run caught this.
