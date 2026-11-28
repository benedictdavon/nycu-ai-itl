"""The encoder's rules in code (architecture.md §3, Part B). Made-up records, fake LLM."""

from app import llm
from app.encoder.service import ModelReply, encode
from app.models import FollowUp, Info, RecordDraft

ALEX = "Alex Chen"
UPLOAD = Info(
    id=1,
    kind="upload",
    contributor=ALEX,
    title="Miniprep",
    text="Miniprep from a 5 mL culture. Yield was low. Longer lysis fixed it.",
    project_tags=["Project X"],
)
DISCUSSION = UPLOAD.model_copy(update={"kind": "discussion"})


def _fake() -> llm.FakeClient:
    client = llm.get_llm()
    assert isinstance(client, llm.FakeClient)
    return client


def _reply(question: str | None = None, **draft: object) -> str:
    fields: dict = {"procedure": "Plasmid miniprep", "contributors": ["Bea Lin"], **draft}
    return ModelReply(question=question, draft=RecordDraft(**fields)).model_dump_json()


def _answered(count: int) -> list[FollowUp]:
    # answers without numbers, which the unused-answer check (#39) would put in gaps
    return [FollowUp(question=f"Q{n}?", answer="Yes.") for n in range(1, count + 1)]


def test_a_question_is_passed_on() -> None:
    fake = _fake()
    fake.queue(_reply("How long was the lysis before?"))
    result = encode(UPLOAD, [])
    assert result.kind == "question"
    assert result.question == "How long was the lysis before?"
    system, user, schema = fake.calls[0]
    assert schema is ModelReply
    assert UPLOAD.text in user and ALEX in user
    assert "No more questions" not in system


def test_no_question_gives_a_draft() -> None:
    _fake().queue(_reply(None), _reply("  "))
    assert encode(UPLOAD, []).kind == "draft"
    assert encode(UPLOAD, []).kind == "draft"  # a blank question counts as none


def test_answers_are_sent_to_the_model() -> None:
    fake = _fake()
    fake.queue(_reply())
    encode(UPLOAD, _answered(1))
    user = fake.calls[0][1]
    assert "Follow-up question 1: Q1?" in user and "Answer from Alex Chen: Yes." in user


def test_third_question_becomes_a_gap() -> None:
    fake = _fake()
    fake.queue(_reply("Which kit?", gaps=["Culture volume unclear."]))
    result = encode(UPLOAD, _answered(2))
    assert result.kind == "draft" and result.draft is not None
    assert result.draft.gaps == ["Culture volume unclear.", "Which kit?"]
    assert "No more questions" in fake.calls[0][0]


def test_a_discussion_never_asks() -> None:
    fake = _fake()
    fake.queue(_reply("Which kit?"))
    result = encode(DISCUSSION, [])
    assert result.kind == "draft" and result.draft is not None
    assert result.draft.gaps == ["Which kit?"]
    assert result.draft.contributors == [ALEX]  # not "Bea Lin", whom the model named
    assert "No more questions" in fake.calls[0][0]


def test_uploader_and_tags_are_kept() -> None:
    _fake().queue(_reply(contributors=["Bea Lin", " Alex Chen ", ""], project_tags=["Project Y"]))
    draft = encode(UPLOAD, []).draft
    assert draft is not None
    assert draft.contributors == [ALEX, "Bea Lin"]
    assert draft.project_tags == ["Project X", "Project Y"]


def test_fake_backend_drafts_from_the_title() -> None:
    _fake()
    result = encode(UPLOAD, [])
    assert result.kind == "draft" and result.draft is not None
    assert result.draft.procedure == UPLOAD.title
    assert result.draft.contributors == [ALEX]
    assert result.draft.project_tags == ["Project X"]


def test_a_question_already_asked_is_dropped() -> None:
    _fake().queue(_reply("  q1 "))  # same as "Q1?" after case, spaces and "?"
    result = encode(UPLOAD, _answered(1))
    assert result.kind == "draft" and result.draft is not None
    assert result.draft.gaps == []  # it has its answer, so it is not a gap either


def test_gaps_are_not_repeated() -> None:
    _fake().queue(_reply("Which kit?", gaps=["Which kit?", "Culture volume.", "culture volume"]))
    draft = encode(UPLOAD, _answered(2)).draft
    assert draft is not None
    assert draft.gaps == ["Which kit?", "Culture volume."]


def test_an_answer_the_draft_drops_becomes_a_gap() -> None:
    """#39: the record says 3 years, the answer 5 years, and the model kept 3 years."""
    _fake().queue(_reply(procedure="Apple growth: 3 years"))
    asked = [FollowUp(question="How long did it take to grow?", answer="5 years")]
    draft = encode(UPLOAD, asked).draft
    assert draft is not None
    assert draft.gaps == [
        'How long did it take to grow? Answered "5 years", which the draft does not use'
    ]


def test_used_skipped_and_wordy_answers_add_no_gap() -> None:
    _fake().queue(_reply(gaps=["Lysis took 5 min, not 3?"]))
    asked = [
        FollowUp(question="How long was the lysis?", answer="5 min"),  # in gaps: used
        FollowUp(question="Which kit?", answer="I don't know"),  # skipped
    ]
    draft = encode(UPLOAD, asked).draft
    assert draft is not None and draft.gaps == ["Lysis took 5 min, not 3?"]
    _fake().queue(_reply())
    draft = encode(UPLOAD, [FollowUp(question="Which kit?", answer="The usual one")]).draft
    assert draft is not None and draft.gaps == []  # no number: not checked
