"""Decoder: answer a question from search hits, or say what is missing (D3-1, D3-1a, D3-2).

Asks the model, then runs the citation check in code.
"""

from pathlib import Path

from app.llm import chat_json
from app.models import Answer, Hit, Record

PROMPTS = Path(__file__).parent / "prompts"

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


def _format_record(record: Record) -> str:
    lines = [f"[id {record.id}] Procedure: {record.procedure}"]
    if record.based_on:
        lines.append(f"Based on: {record.based_on}")
    lines.append(f"Contributors: {', '.join(record.contributors)}")
    for change in record.changes:
        reason = f" (reason: {change.reason})" if change.reason else ""
        lines.append(f"Change: {change.what}{reason}")
    if record.troubleshooting:
        lines.append(f"Troubleshooting: {record.troubleshooting}")
    for gap in record.gaps:
        lines.append(f"Gap: {gap}")
    return "\n".join(lines)


def answer(question: str, hits: list[Hit], hint_mode: bool) -> Answer:
    """Answered with citations, or insufficient. No hits means no model call."""
    if not hits:
        return Answer(
            kind="insufficient",
            text="I could not find a confirmed record about this.",
            uncertainties=["No confirmed record matches the question."],
        )
    system = (PROMPTS / "system.md").read_text(encoding="utf-8")
    if hint_mode:
        system += (PROMPTS / "hint.md").read_text(encoding="utf-8")
    records = "\n\n".join(_format_record(hit.record) for hit in hits)
    user = f"Question: {question}\n\nRecords:\n\n{records}"
    return check_citations(chat_json(system, user, Answer), hits)
