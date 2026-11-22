"""The prompt suite's cases load and its checks work. No model: the suite itself needs one."""

import pytest

from app.models import Answer
from prompt_suite import run

CASES = run.load_cases()


@pytest.mark.parametrize("case", CASES, ids=[case["id"] for case in CASES])
def test_case_is_well_formed(case: dict) -> None:
    assert case["part"] in run.RUNNERS or case["part"] == "encoder"
    assert case["question"].strip() and case["about"].strip()
    assert set(case["expect"]) <= run.DECODER_EXPECT
    for ref in case["hits"]:
        assert run.load_hit(ref).record.id == run.record_id(ref)


def test_ids_are_unique() -> None:
    ids = [case["id"] for case in CASES]
    assert len(ids) == len(set(ids)) and len(ids) >= 5


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


def test_refuses_the_fake_backend() -> None:
    assert run.main(["--no-save"]) == 2
