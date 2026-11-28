"""Encoder: a draft M from an Info, or one follow-up question (D2-3a, D2-3b).

Asks the model, then enforces the rules in code (architecture.md §3, Part B): at most two
questions, none for a saved discussion, the uploader always stays a contributor, and an answer
the draft does not use is never lost silently.
"""

import re
from pathlib import Path

from pydantic import BaseModel

from app.llm import chat_json
from app.models import EncoderResult, FollowUp, Info, RecordDraft

PROMPTS = Path(__file__).parent / "prompts"

MAX_QUESTIONS = 2  # D2-3b: at most two follow-up questions per record
# The model server has an 8192-token context. Lab text with numbers and units runs at about
# 3-4 characters per token, so 12,000 characters leave room for the prompt and the reply.
MAX_TEXT_CHARS = 12_000
SKIPPED = "I don't know"  # what the Follow-up screen sends for "Skip"
NUMBER = re.compile(r"\d+(?:\.\d+)?")


class ModelReply(BaseModel):
    """What the model returns: always a draft, and a question only if it has one.

    The draft comes first, so the model writes it before it decides whether to ask.
    """

    draft: RecordDraft
    question: str | None = None


def _same(text: str) -> str:
    """Text compared for repeats: lower case, single spaces, no final "?" or "."."""
    return " ".join(text.lower().split()).rstrip("?.")


def _format_info(info: Info, follow_ups: list[FollowUp]) -> str:
    lines = [f"Contributor (uploader): {info.contributor}", f"Title: {info.title}"]
    if info.project_tags:
        lines.append(f"Project tags: {', '.join(info.project_tags)}")
    lines += ["", "Record:", info.text]
    for number, follow_up in enumerate(follow_ups, start=1):
        lines += ["", f"Follow-up question {number}: {follow_up.question}"]
        lines.append(f"Answer from {info.contributor}: {follow_up.answer or '(no answer)'}")
    return "\n".join(lines)


def _unused_answers(draft: RecordDraft, follow_ups: list[FollowUp]) -> list[str]:
    """A gap for each answer with a number the draft does not have (#39).

    The model can keep the record's value and drop an answer that says otherwise ("3 years"
    in the record, "5 years" in the answer). Code cannot tell which value is right, so the
    contributor sees both on the review screen. Answers without numbers are not checked.

    The gap is published if left empty, and becomes the change "{gap}: {answer}" if filled in
    (frontend draft.ts), so it reads as a fact and has no final period.
    """
    used = set(NUMBER.findall(draft.model_dump_json()))
    gaps = []
    for follow_up in follow_ups:
        answer = (follow_up.answer or "").strip()
        if answer == SKIPPED or set(NUMBER.findall(answer)) <= used:
            continue
        gaps.append(
            f'{follow_up.question.strip()} Answered "{answer}", which the draft does not use'
        )
    return gaps


def _with_rules(
    draft: RecordDraft, info: Info, follow_ups: list[FollowUp], unasked: str | None
) -> RecordDraft:
    """The uploader first in contributors (D1-4), the upload's tags kept, an unused answer and
    an unasked question in gaps, and no gap twice. A discussion's only contributor is the
    person who answered: the model also listed the requester, who only asked (prompt suite,
    enc-discussion)."""
    names = [info.contributor]
    if info.kind == "upload":
        names += [name.strip() for name in draft.contributors]
    tags = [*info.project_tags, *(tag.strip() for tag in draft.project_tags)]
    gaps: dict[str, str] = {}  # by _same(), keeping the first wording and the order
    for gap in [*draft.gaps, *_unused_answers(draft, follow_ups), unasked or ""]:
        if gap.strip():
            gaps.setdefault(_same(gap), gap.strip())
    return draft.model_copy(
        update={
            "contributors": list(dict.fromkeys(name for name in names if name)),
            "project_tags": list(dict.fromkeys(tag for tag in tags if tag)),
            "gaps": list(gaps.values()),
        }
    )


def encode(info: Info, follow_ups: list[FollowUp]) -> EncoderResult:
    """A question (D2-3b) or a draft (D2-3a). `follow_ups` are the questions already answered.

    The question limit is enforced here, not only in the prompt: once two questions were
    asked, or for a saved discussion, any question the model still has goes into `gaps`.
    A question that was already asked is dropped: it has its answer.
    """
    may_ask = info.kind == "upload" and len(follow_ups) < MAX_QUESTIONS
    system = (PROMPTS / "system.md").read_text(encoding="utf-8")
    if not may_ask:
        system += (PROMPTS / "no_questions.md").read_text(encoding="utf-8")
    # Without a model (LLM_BACKEND=fake), a draft from the title, so the API and UI still work.
    fake = ModelReply(
        draft=RecordDraft(
            procedure=info.title,
            contributors=[info.contributor],
            gaps=["[Fake LLM] Fill in the fields from the original record."],
        )
    )
    reply = chat_json(system, _format_info(info, follow_ups), ModelReply, fake_reply=fake)
    question = (reply.question or "").strip() or None
    if question and _same(question) in {_same(f.question) for f in follow_ups}:
        question = None
    if question and may_ask:
        return EncoderResult(kind="question", question=question)
    return EncoderResult(kind="draft", draft=_with_rules(reply.draft, info, follow_ups, question))
