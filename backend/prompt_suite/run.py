"""Prompt test suite: run the cases against the real model and keep the results (architecture §5).

Run from `backend/` with the model server set in `.env` (LLM_BACKEND=llama_server):

    uv run python -m prompt_suite.run                    # every case, results saved
    uv run python -m prompt_suite.run --case clump --no-save

Each case file in `cases/` is named after the part it tests. A case is an input plus the
properties its output must have. Most are checked in code; a `judge` sentence is a property a
person checks by reading the answer, and is marked by hand in the results file.
"""

import argparse
import json
import re
import subprocess
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import REPO_ROOT, get_settings
from app.decoder import service as decoder
from app.encoder import service as encoder
from app.models import Answer, FollowUp, Hit, Info, Record, RecordDraft

CASES = Path(__file__).parent / "cases"
RESULTS = REPO_ROOT / "docs" / "cp2" / "prompt_suite" / "results"
MAX_SECONDS = 30  # architecture §4: the model must reply in about 30 seconds or less

# A hit is named by its sample file: R01 is samples/records/01-*.json (record id 1), D01 is
# samples/discussions/01-*.json (record id 101), so expected citations read the same way.
SAMPLE_DIRS = {"R": ("records", 0), "D": ("discussions", 100)}
DECODER_EXPECT = {
    "kind",
    "cites",
    "cites_include",
    "contributors",
    "must_include",
    "must_not_include",
    "no_digits",
    "needs_uncertainty",
}

ENCODER_EXPECT = {
    "asks",
    "contributors",
    "based_on_includes",
    "changes_include",
    "reason_includes",
    "no_reason_for",
    "has_troubleshooting",
    "has_gaps",
    "must_not_include",
    "no_invented_numbers",
}
SKIPPED = "I don't know"  # what the Follow-up screen sends for "Skip"
NUMBER = re.compile(r"\d+(?:\.\d+)?")


@dataclass
class Result:
    case: dict[str, Any]
    seconds: float
    failed: list[str] = field(default_factory=list)
    output: str = ""


def record_id(ref: str) -> int:
    _, offset = SAMPLE_DIRS[ref[0]]
    return offset + int(ref[1:])


def load_hit(ref: str) -> Hit:
    """The sample's expected M as a confirmed record."""
    folder, _ = SAMPLE_DIRS[ref[0]]
    [path] = (REPO_ROOT / "samples" / folder).glob(f"{ref[1:]}-*.json")
    data = json.loads(path.read_text(encoding="utf-8"))["record"]
    rid = record_id(ref)
    return Hit(record=Record(id=rid, info_id=rid, status="confirmed", **data), score=1.0)


def check_answer(expect: dict[str, Any], answer: Answer, seconds: float) -> list[str]:
    """The checks a decoder case fails; empty if it passes."""
    failed = []
    text = answer.text.lower()
    if answer.kind != expect.get("kind", answer.kind):
        failed.append(f"kind is {answer.kind}, expected {expect['kind']}")
    if "cites" in expect and answer.cited_record_ids != [record_id(r) for r in expect["cites"]]:
        failed.append(f"cites {answer.cited_record_ids}, expected exactly {expect['cites']}")
    for ref in expect.get("cites_include", []):
        if record_id(ref) not in answer.cited_record_ids:
            failed.append(f"does not cite {ref}")
    if "contributors" in expect and answer.contributors != expect["contributors"]:
        failed.append(f"contributors {answer.contributors}, expected {expect['contributors']}")
    for phrase in expect.get("must_include", []):
        if phrase.lower() not in text:
            failed.append(f'text lacks "{phrase}"')
    for phrase in expect.get("must_not_include", []):
        if phrase.lower() in text:
            failed.append(f'text has "{phrase}"')
    if expect.get("no_digits") and re.search(r"\d", answer.text):
        failed.append("text has a digit")
    if expect.get("needs_uncertainty") and not answer.uncertainties:
        failed.append("no uncertainty")
    if seconds > MAX_SECONDS:
        failed.append(f"took {seconds:.1f} s (limit {MAX_SECONDS} s)")
    return failed


def run_decoder(case: dict[str, Any]) -> Result:
    hits = [load_hit(ref) for ref in case["hits"]]
    start = time.monotonic()
    answer = decoder.answer(case["question"], hits, case.get("hint_mode", False))
    seconds = time.monotonic() - start
    lines = [
        f"- Question: {case['question']}" + (" (hint mode)" if case.get("hint_mode") else ""),
        f"- Hits: {', '.join(f'{ref} (id {record_id(ref)})' for ref in case['hits'])}",
        f"- Kind: `{answer.kind}`; cites {answer.cited_record_ids}; contributors "
        f"{answer.contributors}",
        "- Text:",
        "",
        *(f"  > {line}" for line in answer.text.splitlines()),
        "",
        f"- Uncertainties: {answer.uncertainties or 'none'}",
    ]
    failed = check_answer(case["expect"], answer, seconds)
    return Result(case=case, seconds=seconds, failed=failed, output="\n".join(lines))


def load_info(case: dict[str, Any]) -> Info:
    """The case's Info: a sample's .txt with its .json `info`, or the case's own `info`."""
    if "sample" in case:
        folder, offset = SAMPLE_DIRS[case["sample"][0]]
        [path] = (REPO_ROOT / "samples" / folder).glob(f"{case['sample'][1:]}-*.json")
        fields = json.loads(path.read_text(encoding="utf-8"))["info"]
        fields["text"] = path.with_suffix(".txt").read_text(encoding="utf-8").strip()
    else:
        fields = dict(case["info"])
    return Info(id=1, **fields)


def check_draft(
    expect: dict[str, Any], draft: RecordDraft, asked: int, source: str, seconds: float
) -> list[str]:
    """The checks an encoder case fails; empty if it passes. `source` is the record and answers."""
    failed = []
    whole = draft.model_dump_json().lower()
    reasons = " ".join(change.reason or "" for change in draft.changes).lower()
    if "asks" in expect and (asked > 0) != expect["asks"]:
        failed.append(f"asked {asked} question(s), expected {'some' if expect['asks'] else 'none'}")
    if "contributors" in expect and draft.contributors != expect["contributors"]:
        failed.append(f"contributors {draft.contributors}, expected {expect['contributors']}")
    if (
        "based_on_includes" in expect
        and expect["based_on_includes"].lower() not in (draft.based_on or "").lower()
    ):
        failed.append(f"based_on is {draft.based_on!r}, expected {expect['based_on_includes']!r}")
    for phrase in expect.get("changes_include", []):
        if not any(phrase.lower() in change.what.lower() for change in draft.changes):
            failed.append(f'no change says "{phrase}"')
    for phrase in expect.get("reason_includes", []):
        if phrase.lower() not in reasons:
            failed.append(f'no reason says "{phrase}"')
    for phrase in expect.get("no_reason_for", []):
        for change in draft.changes:
            if phrase.lower() in change.what.lower() and change.reason:
                failed.append(f'"{change.what}" has a reason the record does not give')
    if (
        "has_troubleshooting" in expect
        and bool(draft.troubleshooting) != expect["has_troubleshooting"]
    ):
        failed.append(f"troubleshooting is {draft.troubleshooting!r}")
    if "has_gaps" in expect and bool(draft.gaps) != expect["has_gaps"]:
        failed.append(f"gaps are {draft.gaps}")
    for phrase in expect.get("must_not_include", []):
        if phrase.lower() in whole:
            failed.append(f'draft has "{phrase}"')
    if expect.get("no_invented_numbers"):
        invented = sorted(set(NUMBER.findall(whole)) - set(NUMBER.findall(source)))
        if invented:
            failed.append(f"numbers not in the record or answers: {invented}")
    if seconds > MAX_SECONDS:
        failed.append(f"slowest call took {seconds:.1f} s (limit {MAX_SECONDS} s)")
    return failed


def run_encoder(case: dict[str, Any]) -> Result:
    """Encode the record; answer each question with the case's next answer, or skip it."""
    info = load_info(case)
    answers = case.get("answers", [])
    follow_ups: list[FollowUp] = []
    slowest = 0.0
    lines = [f"- Record ({info.kind}, by {info.contributor}): {info.title}"]
    while True:  # encode() stops asking after two answers, so this ends
        start = time.monotonic()
        result = encoder.encode(info, follow_ups)
        slowest = max(slowest, time.monotonic() - start)
        if result.kind == "draft" and result.draft is not None:
            break
        answer = answers[len(follow_ups)] if len(follow_ups) < len(answers) else SKIPPED
        lines.append(f"- Question {len(follow_ups) + 1}: {result.question} Answer: {answer}")
        follow_ups.append(FollowUp(question=result.question or "", answer=answer))
    draft = result.draft
    lines += [
        f"- Questions asked: {len(follow_ups)}",
        "- Draft:",
        "",
        "  ```json",
        *(f"  {line}" for line in draft.model_dump_json(indent=2).splitlines()),
        "  ```",
    ]
    source = " ".join([info.text, *(f.answer or "" for f in follow_ups)])
    failed = check_draft(case["expect"], draft, len(follow_ups), source, slowest)
    return Result(case=case, seconds=slowest, failed=failed, output="\n".join(lines))


RUNNERS: dict[str, Callable[[dict[str, Any]], Result]] = {
    "decoder": run_decoder,
    "encoder": run_encoder,
}


def load_cases(part: str | None = None) -> list[dict[str, Any]]:
    """Every case, tagged with its part (the case file's name)."""
    cases = []
    for path in sorted(CASES.glob("*.json")):
        if part and path.stem != part:
            continue
        cases += [case | {"part": path.stem} for case in json.loads(path.read_text("utf-8"))]
    return cases


def report(results: list[Result], model: str) -> str:
    commit = subprocess.run(
        ["git", "describe", "--always", "--dirty"], capture_output=True, text=True, cwd=REPO_ROOT
    ).stdout.strip()
    passed = sum(not r.failed for r in results)
    lines = [
        f"# Prompt suite run, {datetime.now():%Y-%m-%d %H:%M}",
        "",
        f"Model: {model}. Code: `{commit}`. Automatic checks: {passed} of {len(results)} "
        "cases pass. Mark each **To judge** line by hand.",
        "",
        "| Case | Part | Automatic checks | Seconds |",
        "|---|---|---|---|",
    ]
    for r in results:
        verdict = "pass" if not r.failed else "FAIL: " + "; ".join(r.failed)
        lines.append(f"| `{r.case['id']}` | {r.case['part']} | {verdict} | {r.seconds:.1f} |")
    for r in results:
        lines += ["", f"## `{r.case['id']}`", "", f"{r.case['about']}.", "", r.output]
        if r.case.get("judge"):
            lines += ["", f"**To judge:** {r.case['judge']} Result: _pass / fail_"]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--part", help="only this part's cases, for example decoder")
    parser.add_argument("--case", help="only the case with this id")
    parser.add_argument("--model", help="model name for the results (default: LLM_MODEL)")
    parser.add_argument("--no-save", action="store_true", help="print, do not save results")
    args = parser.parse_args(argv)

    settings = get_settings()
    if settings.llm_backend == "fake":
        print("The suite needs the real model: set LLM_BACKEND=llama_server.", file=sys.stderr)
        return 2
    cases = [c for c in load_cases(args.part) if not args.case or c["id"] == args.case]
    if not cases:
        print("No case matches.", file=sys.stderr)
        return 2
    results = []
    for case in cases:
        if case["part"] not in RUNNERS:
            print(f"No runner for part {case['part']!r} yet.", file=sys.stderr)
            return 2
        result = RUNNERS[case["part"]](case)
        print(f"{case['id']}: {'pass' if not result.failed else result.failed}")
        results.append(result)

    text = report(results, args.model or settings.llm_model or "unnamed model")
    if args.no_save:
        print(text)
    else:
        RESULTS.mkdir(parents=True, exist_ok=True)
        path = RESULTS / f"{datetime.now():%Y-%m-%d-%H%M}.md"
        path.write_text(text, encoding="utf-8")
        print(f"Saved {path.relative_to(REPO_ROOT)}")
    return 0 if all(not r.failed for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
