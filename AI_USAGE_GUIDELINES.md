# AI Usage Guidelines

## 1. What AI tools we plan to use, and what we will use each for
- We will mainly use OpenAI Codex for brainstorming implementation ideas, generating and revising code, debugging small code issues, and producing boilerplate code. All AI-generated code must be reviewed and tested by a team member before being merged.
- We will use Codex to generate first drafts of unit tests and technical documentation. A human team member will verify correctness, add missing edge cases, and revise the final version.
- We will use Google Gemini for research tasks, such as exploring unfamiliar concepts, comparing possible approaches, and gathering background information. Important technical claims or information used in project decisions will be verified by team members before being adopted.
- We will not rely on AI tools to make final design or architectural decisions without team discussion.
- We will not use AI-generated code directly for security-sensitive features such as authentication, authorization, or handling sensitive user data without careful human review.

## 2. How we will document AI interactions

One-off debugging questions or syntax lookups don't need a log entry — only prompts that produced code, text, or decisions that ended up in the repo.

## 3. How we will handle disagreements about AI output quality

We will perform absolute reviews from the PR owner. Reviews will be based on code guidelines co-defined by all of us (currently none). When a PR faces an issue that cannot be decided independently, a meeting can be called for discussion. We may offer our opinions for reference, but the final decision still lies with the PR owner. PR reviews require a brief explanation, such as citing compliance with code guidelines, noting a consensus reached after discussion and vote, or stating that the PR owner was persuaded by [Team Member] due to [Reason].