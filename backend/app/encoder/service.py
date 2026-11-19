"""Encoder: a draft M from an Info, or one follow-up question (D2-3a, D2-3b).

Stub until Part B: no LLM call, no questions. It copies what it can from the Info.
"""

from app.models import EncoderResult, FollowUp, Info, RecordDraft


def encode(info: Info, follow_ups: list[FollowUp]) -> EncoderResult:
    """A question (D2-3b) or a draft (D2-3a). [Stub -> Part B]"""
    draft = RecordDraft(
        procedure=info.title,
        contributors=[info.contributor],
        project_tags=info.project_tags,
        gaps=["Stub encoder: fill in the fields from the original record."],
    )
    return EncoderResult(kind="draft", draft=draft)
