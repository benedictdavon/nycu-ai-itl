# CP1: Team Charter

**Course:** CSIC30216, AI-in-the-Loop in Software Project Cycle
**Project focus:** Finding and sharing experimental knowledge in a shared wet lab

Our agreed working norms. We revise this file through a PR if a norm stops working.

## 1. Making decisions when we disagree

A "significant choice" is anything that affects more than one person's work: scope, architecture, tools, the interview or evaluation approach, or how we use AI. Smaller choices are made by whoever owns the task.

1. **Who decides.** The owner of the PR or task (the person whose name is in "Led by" in the PR template) decides. Others give opinions and reasons, but the owner has the final say. This matches our AI usage guidelines, section 3.
2. **Discuss first.** Disagreement is raised on the PR (GitHub) or in LINE, with a reason and, if possible, an alternative.
3. **If a reviewer still disagrees**, any member can call a short meeting (call or in person) within 3 days. Each person states their position once, then the owner decides.
4. **If the owner cannot decide** (for example, they are stuck between options or the dispute is about the owner's own work), the current code steward (recorded in `.github/DECISIONS.md`) decides.
5. **Record it.** Every significant decision gets an entry in `.github/DECISIONS.md` with what was chosen, why, the alternative rejected, and who led it. The PR review states how it was resolved: guideline compliance, consensus after discussion, or the owner was persuaded by [member] because [reason].

## 2. Definition of done

A piece of work (code, document or experiment-design task) is done only when all of these are true and a reviewer can check each one:

- [ ] It meets the acceptance criteria written in its issue or task description.
- [ ] It is in a PR that uses the PR template, with the "Decision" section filled in if a significant choice was made.
- [ ] At least one team member other than the author has reviewed it, and their review comment says how any disagreement was resolved.
- [ ] Code is tested (tests pass, or a short manual test note is in the PR), and documents are proofread and link to their sources or evidence.
- [ ] Any use of AI that produced code, text or decisions in the repo is logged as described in `AI_USAGE_GUIDELINES.md`, and a human has checked the output.
- [ ] It is merged into `main` through the PR (no direct pushes). Only the code steward merges. When the steward is the author, another member approves the PR and the steward merges it.
- [ ] `.github/DECISIONS.md` is updated if a significant choice was made, and related docs under `docs/` are updated if the change affects them.

Work that fails any item is "in progress", not done, and is not reported as finished at team meetings.

## 3. Communication outside class

| | Expectation |
|---|---|
| **Main channel** | Team group chat (LINE) for day-to-day questions, quick discussion and scheduling. |
| **Work tracking, sync and discussion** | GitHub: issues and PRs show who is doing what, what is blocked and what is done, and are where discussion about a specific piece of work happens, so the reasoning stays with it. Everyone keeps their own items up to date there. |
| **Check-in frequency** | Every member checks the group chat and GitHub notifications at least once per day. |
| **Response time** | Reply to a direct question or review request within 24 hours (acknowledging is enough). Within 48 hours of a deadline, reply within 6 hours. |
| **Unavailable** | Tell the team in the chat before you are away for more than 24 hours, and say who covers your tasks. |

Per member:

| Member | Channel | Check-in frequency | Expected response time |
|---|---|---|---|
| Darius Lung (code steward) | LINE, GitHub | Daily | Within 24 hours (6 hours within 48 hours of a deadline) |
| Benedict Davon Martono | LINE, GitHub | Daily | Within 24 hours (6 hours within 48 hours of a deadline) |
| 李原誌 | LINE, GitHub | Daily | Within 24 hours (6 hours within 48 hours of a deadline) |
| 杜洺鋒 | LINE, GitHub | Daily | Within 24 hours (6 hours within 48 hours of a deadline) |

If someone misses two response windows in a row without notice, the code steward checks in with them directly, and the topic is raised in the group chat.
