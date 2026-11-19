"""Decoder: answer a question from search hits, or say what is missing (D3-1, D3-1a, D3-2).

Stub until Part C: no LLM call. It names the best hit and cites it.
"""

from app.models import Answer, Hit

NOT_CITED = "The records do not give a source for this answer."


def check_citations(draft: Answer, hits: list[Hit]) -> Answer:
    """The guard against invented sources (04 §4). Runs on every model answer.

    Cited IDs that were not in `hits` are dropped (duplicates too, keeping order), and
    `contributors` is recomputed from the cited records, not taken from the model. An
    `answered` answer with no valid citation left becomes `insufficient`.
    """
    by_id = {hit.record.id: hit.record for hit in hits}
    cited = list(dict.fromkeys(i for i in draft.cited_record_ids if i in by_id))
    if draft.kind == "answered" and not cited:
        return Answer(
            kind="insufficient",
            text="I could not back an answer with a confirmed record.",
            uncertainties=[*draft.uncertainties, NOT_CITED],
        )
    contributors = list(dict.fromkeys(c for i in cited for c in by_id[i].contributors))
    return draft.model_copy(update={"cited_record_ids": cited, "contributors": contributors})


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
