"""The citation check (architecture.md §3, Part C). Made-up records, no LLM."""

from app.decoder.service import NOT_CITED, check_citations
from app.models import Answer, Hit, Record


def _hit(record_id: int, *contributors: str) -> Hit:
    record = Record(
        id=record_id,
        info_id=record_id,
        status="confirmed",
        procedure=f"Procedure {record_id}",
        contributors=list(contributors),
    )
    return Hit(record=record, score=1.0)


HITS = [_hit(1, "Alex Chen"), _hit(2, "Bea Lin", "Alex Chen")]


def test_valid_citations_pass_and_contributors_are_recomputed() -> None:
    draft = Answer(kind="answered", text="Do X.", cited_record_ids=[2, 1], contributors=["Made Up"])
    checked = check_citations(draft, HITS)
    assert checked.kind == "answered"
    assert checked.cited_record_ids == [2, 1]
    assert checked.contributors == ["Bea Lin", "Alex Chen"]


def test_ids_not_in_hits_are_dropped() -> None:
    checked = check_citations(Answer(kind="answered", text="x", cited_record_ids=[1, 999]), HITS)
    assert checked.cited_record_ids == [1]
    assert checked.contributors == ["Alex Chen"]


def test_duplicate_ids_are_dropped() -> None:
    checked = check_citations(Answer(kind="answered", text="x", cited_record_ids=[1, 1]), HITS)
    assert checked.cited_record_ids == [1]


def test_answer_with_no_valid_citation_becomes_insufficient() -> None:
    for cited in ([], [999]):
        draft = Answer(
            kind="answered", text="Use 50 ng.", cited_record_ids=cited, uncertainties=["u"]
        )
        checked = check_citations(draft, HITS)
        assert checked.kind == "insufficient"
        assert checked.cited_record_ids == [] and checked.contributors == []
        assert "50 ng" not in checked.text
        assert checked.uncertainties == ["u", NOT_CITED]


def test_insufficient_stays_insufficient() -> None:
    draft = Answer(kind="insufficient", text="No record.", uncertainties=["Nothing matches."])
    assert check_citations(draft, HITS) == draft
