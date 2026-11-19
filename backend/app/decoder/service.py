"""Decoder: answer a question from search hits, or say what is missing (D3-1, D3-1a, D3-2).

Stub until Part C: no LLM call. It names the best hit and cites it.
"""

from app.models import Answer, Hit


def answer(question: str, hits: list[Hit], hint_mode: bool) -> Answer:
    """Answered with citations, or insufficient. [Stub -> Part C]"""
    if not hits:
        return Answer(
            kind="insufficient",
            text="I could not find a confirmed record about this.",
            uncertainties=["No confirmed record matches the question."],
        )
    best = hits[0].record
    return Answer(
        kind="answered",
        text=f"Stub decoder: see **{best.procedure}**.",
        cited_record_ids=[best.id],
        contributors=best.contributors,
    )
