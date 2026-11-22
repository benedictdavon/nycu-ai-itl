# Prompt suite: fail-then-fix cycles (decoder)

CP2 item 6 asks for at least one cycle where a case failed and a prompt or code change fixed it. These are the decoder's two, both found while building PR #15, against Qwen3-4B Q8_0 on `llama-server` with the sample records as hits. They ran with a scratch script that called `decoder.answer()` directly, before the runner existed; the outputs below are copied from its logs. The cases `clump`, `clump-hint` and `plasmid-amount` in [`backend/prompt_suite/cases/decoder.json`](../../../backend/prompt_suite/cases/decoder.json) now check the same failures, and the suite's results are in [`results/`](results/).

## 1. Cause and fix swapped (`clump`, `clump-hint`)

**Case:** "Why did my cells clump after washing, and what should I change?" with records 01 (strain X transformation, Alex Chen), 02 (colony PCR) and 04 (competent cells) as hits. Record 01 says the cells clumped with the SOP wash volume and doubling it fixed that.

**Before** (the first prompt, commit `87d3aff`):

> Cells clumped after washing because the wash volume was doubled, as noted in record 1. To fix this, you should follow the change described there. Additionally, an extra cold wash step was added in record 4, which may also help prevent clumping.

Cited [1, 4]. Two failures: the fix is given as the cause, and record 04 (a different procedure) is cited as "may also help".

**Change** (commit `82d2b7d`, `decoder/prompts/system.md`):
- The record is shown with labels: "Problem and fix", and "Changed from the base protocol", with the note "A change is a fix or an improvement. It is never the cause of a problem."
- New rules: "Keep cause and fix apart: say what caused the problem (if the record says), then what fixed it." and "Use only records about the same procedure and the same problem as the question. Ignore the others, even if they share words with it." Rule 1 also forbids "this may also help".

**After:**

> Cells clumped because the wash volume was too small (as noted in the problem and fix section of record 1). The fix was to double the wash volume.

Cited [1] only.

**A change that made it worse, backed out.** A stricter hint rule (never name the fix, only the step) brought the swap back in hint mode:

> Look at the wash volume. Alex Chen's record shows doubling the wash volume caused cells to clump. Check the wash volume in your protocol.

It was removed. D3-1a asks only for "hints instead of a detailed answer", and the kept hint prompt gives: "Look at the wash volume. Alex Chen's record shows it mattered for cells clumping."

## 2. An invented direction of change (`plasmid-amount`)

**Case:** "Has anyone transformed strain X?" with record 01 as the only hit. Record 01 gives the plasmid amount as "Plasmid amount: 50 ng", with no earlier value. (The suite's case adds "How much plasmid did they use?" so the amount is always in the answer.)

**Before** (after cycle 1, commit `82d2b7d`):

> Yes, Alex Chen transformed strain X with plasmid P. The problem was few colonies on the first attempt, which was fixed by changing the wash method. The plasmid amount was increased to 50 ng, and the wash volume was doubled to prevent cell clumping.

"Increased" is not in the record: it is an invented parameter change, the failure 04 §4 is about.

**Change** (commit `0c01b77`, rule 2 of `decoder/prompts/system.md`), added:

> Never say a value went up or down (increased, raised, lowered, extended, shortened) unless the record gives both the old and the new value, or says which way it changed. If the record gives only one value, state it as it is: "used 50 ng plasmid", not "increased the plasmid to 50 ng".

**After:**

> Alex Chen transformed strain X with plasmid P. The first attempt gave few colonies, which was fixed by changing the wash volume. The plasmid amount used was 50 ng.

Directions the records do give are kept, for example "The lysis step was extended from 2 to 5 minutes" (record 03 gives both values).
