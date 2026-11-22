"""The prompt suite's cases load and its checks work. No model: the suite itself needs one."""

import pytest

from app.models import Answer, Change, EncoderResult, RecordDraft
from prompt_suite import run

CASES = run.load_cases()


@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_case_is_well_formed(case: dict) -> None:
    assert case["part"] in run.RUNNERS
    assert case["about"].strip()
    if case["part"] == "encoder":
        assert set(case["expect"]) <= run.ENCODER_EXPECT
        assert run.load_info(case).text.strip()
        return
    assert case["question"].strip()
    assert set(case["expect"]) <= run.DECODER_EXPECT
    for ref in case["hits"]:
        assert run.load_hit(ref).record.id == run.record_id(ref)


def test_ids_are_unique() -> None:
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids))
    for part in run.RUNNERS:  # architecture §6: at least 5 cases per part
        assert sum(case["part"] == part for case in CASES) >= 5


EXPECT = {
    "kind": "answered",
    "cites": ["R01"],
    "contributors": ["Alex Chen"],
    "must_include": ["wash volume"],
    "must_not_include": ["increase"],
    "no_digits": True,
    "needs_uncertainty": True,
}
GOOD = Answer(
    kind="answered",
    text="Look at the wash volume in Alex Chen's record.",
    cited_record_ids=[1],
    contributors=["Alex Chen"],
    uncertainties=["The record is about strain X only."],
)


def test_a_good_answer_passes() -> None:
    assert run.check_answer(EXPECT, GOOD, seconds=1.0) == []


def test_each_check_catches_its_failure() -> None:
    bad = GOOD.model_copy(
        update={
            "text": "The plasmid was increased to 50 ng.",
            "cited_record_ids": [1, 4],
            "uncertainties": [],
        }
    )
    failed = run.check_answer(EXPECT, bad, seconds=31.0)
    assert len(failed) == 6  # cites, must_include, must_not_include, digits, uncertainty, time
    assert run.check_answer({"cites_include": ["D01"]}, GOOD, seconds=1.0) == ["does not cite D01"]


DRAFT_EXPECT = {
    "asks": False,
    "contributors": ["Alex Chen"],
    "based_on_includes": "Transformation v2",
    "changes_include": ["wash volume"],
    "reason_includes": ["clump"],
    "no_reason_for": ["plasmid"],
    "has_troubleshooting": True,
    "has_gaps": False,
    "must_not_include": ["to improve"],
    "no_invented_numbers": True,
}
SOURCE = "Following Drive SOP 'Transformation v2'. Doubled the wash volume; 50 ng plasmid."
GOOD_DRAFT = RecordDraft(
    procedure="Transformation of strain X",
    based_on="Drive SOP 'Transformation v2'",
    contributors=["Alex Chen"],
    changes=[
        Change(what="Wash volume doubled", reason="cells clumped"),
        Change(what="Plasmid amount: 50 ng"),
    ],
    troubleshooting="Few colonies; fixed by the wash change.",
)


def test_a_good_draft_passes() -> None:
    assert run.check_draft(DRAFT_EXPECT, GOOD_DRAFT, 0, SOURCE, seconds=1.0) == []


def test_each_draft_check_catches_its_failure() -> None:
    bad = RecordDraft(
        procedure="Transformation",
        contributors=["Alex Chen", "Bea Lin"],
        changes=[Change(what="Plasmid amount: 100 ng", reason="to improve efficiency")],
        gaps=["Which strain?"],
    )
    failed = run.check_draft(DRAFT_EXPECT, bad, 1, SOURCE, seconds=31.0)
    # asks, contributors, based_on, changes, reason, no_reason_for, troubleshooting, gaps,
    # must_not_include, invented number, time
    assert len(failed) == 11


def test_the_encoder_runner_answers_then_skips(monkeypatch: pytest.MonkeyPatch) -> None:
    """The runner answers with the case's answers, then "I don't know", until it gets a draft."""
    seen: list[list[str | None]] = []

    def encode(info, follow_ups):  # type: ignore[no-untyped-def]
        seen.append([f.answer for f in follow_ups])
        if len(follow_ups) < 2:
            return EncoderResult(kind="question", question=f"Q{len(follow_ups)}?")
        return EncoderResult(kind="draft", draft=GOOD_DRAFT)

    monkeypatch.setattr(run.encoder, "encode", encode)
    case = {"id": "x", "about": "x", "sample": "R01", "answers": ["Yes."], "expect": {}}
    result = run.run_encoder(case)
    assert seen == [[], ["Yes."], ["Yes.", run.SKIPPED]]
    assert result.failed == [] and "Questions asked: 2" in result.output


def test_refuses_the_fake_backend() -> None:
    assert run.main(["--no-save"]) == 2
