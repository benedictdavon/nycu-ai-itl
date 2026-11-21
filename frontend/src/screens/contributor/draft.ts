// Pure helpers for Check the draft (SCREENS.md section 4): the local working copy, the gap mapping
// and the number check. No React here, so each rule can be tested on its own.

import type { Change, FollowUp, Info, RecordDraft } from "../../api/types";
import { findNumbers, normaliseNumber, uncheckedNumbers } from "../../lib/numbers";

/** A change with a React key. The key is never sent to the API. */
export type WorkingChange = Change & { key: number };

/** The local copy of a draft while it is being checked. Nothing here is sent until Save or Confirm. */
export type Working = {
  procedure: string;
  based_on: string | null;
  contributors: string[];
  project_tags: string[];
  changes: WorkingChange[];
  troubleshooting: string | null;
  gaps: string[];
  /** One answer per entry in `gaps`; "" when the gap is still empty. */
  gapAnswers: string[];
  /** The next React key to hand out to a change. */
  nextKey: number;
  /** True once anything changed since the last save, gap answers included. */
  edited: boolean;
};

/** Copies a saved draft into a working copy. `nextKey` is where the change keys start. */
export function toWorking(draft: RecordDraft, nextKey: number): Working {
  return {
    procedure: draft.procedure,
    based_on: draft.based_on,
    contributors: [...draft.contributors],
    project_tags: [...draft.project_tags],
    changes: draft.changes.map((change, index) => ({
      key: nextKey + index,
      what: change.what,
      reason: change.reason,
    })),
    troubleshooting: draft.troubleshooting,
    gaps: [...draft.gaps],
    gapAnswers: draft.gaps.map(() => ""),
    nextKey: nextKey + draft.changes.length,
    edited: false,
  };
}

/** The RecordDraft fields of a working copy, with gap answers not applied yet. */
export function toDraft(working: Working): RecordDraft {
  return {
    procedure: working.procedure,
    based_on: working.based_on,
    contributors: working.contributors,
    project_tags: working.project_tags,
    changes: working.changes.map(({ what, reason }) => ({ what, reason })),
    troubleshooting: working.troubleshooting,
    gaps: working.gaps,
  };
}

/**
 * The draft to save or confirm. RecordDraft has no field for a gap that was filled in, so a gap
 * with an answer moves to `changes` as "{gap}: {answer}" with no reason. An empty gap stays in
 * `gaps`, and is shown to labmates as not recorded.
 */
export function buildDraft(draft: RecordDraft, gapAnswers: string[]): RecordDraft {
  const gaps: string[] = [];
  const changes = [...draft.changes];
  draft.gaps.forEach((gap, index) => {
    const answer = (gapAnswers[index] ?? "").trim();
    if (answer) {
      changes.push({ what: `${gap}: ${answer}`, reason: null });
    } else {
      gaps.push(gap);
    }
  });
  return {
    procedure: draft.procedure,
    based_on: draft.based_on,
    contributors: draft.contributors,
    project_tags: draft.project_tags,
    changes,
    troubleshooting: draft.troubleshooting,
    gaps,
  };
}

/** The body for PUT /api/records/{id}, from the working copy. */
export function draftToSave(working: Working): RecordDraft {
  return buildDraft(toDraft(working), working.gapAnswers);
}

/** Every row of the draft, in the order the page shows them, with the text each row holds. */
export type DraftRow = { id: string; texts: string[] };

export function draftRows(working: Working): DraftRow[] {
  return [
    { id: "procedure", texts: [working.procedure] },
    { id: "based_on", texts: [working.based_on ?? ""] },
    ...working.changes.map((change) => ({
      id: `change-${change.key}`,
      texts: [change.what, change.reason ?? ""],
    })),
    { id: "troubleshooting", texts: [working.troubleshooting ?? ""] },
    ...working.gaps.map((_, index) => ({
      id: `gap-${index}`,
      texts: [working.gapAnswers[index] ?? ""],
    })),
  ];
}

/**
 * What a draft number may be checked against: the original record, the follow-up answers, and the
 * numbers the contributor has marked "Yes, it's right" in this session.
 */
export function sourceTexts(info: Info, followUps: FollowUp[], kept: string[]): string[] {
  const answers = followUps.flatMap((followUp) => (followUp.answer ? [followUp.answer] : []));
  return [info.text, ...answers, ...kept];
}

/**
 * The unchecked numbers of each row, keyed by row id. A number that appears in several rows is
 * listed only under the first row where it appears.
 */
export function numbersByRow(rows: DraftRow[], sources: string[]): Map<string, string[]> {
  const shown = new Set<string>();
  const byRow = new Map<string, string[]>();
  for (const row of rows) {
    const fresh = uncheckedNumbers(row.texts, sources).filter(
      (number) => !shown.has(normaliseNumber(number)),
    );
    for (const number of fresh) {
      shown.add(normaliseNumber(number));
    }
    byRow.set(row.id, fresh);
  }
  return byRow;
}

/** The normalised keys of every number in the rows, for highlighting the original record. */
export function numberKeys(rows: DraftRow[]): Set<string> {
  return new Set(
    rows.flatMap((row) => row.texts.flatMap((text) => findNumbers(text).map((m) => normaliseNumber(m.text)))),
  );
}

/**
 * Deletes every occurrence of one number from the draft's text fields. Spaces doubled by the
 * removal are collapsed, and a field left empty becomes null where the API allows null.
 */
export function removeNumber(working: Working, numberText: string): Working {
  const key = normaliseNumber(numberText);

  function strip(text: string): string {
    const matches = findNumbers(text).filter((match) => normaliseNumber(match.text) === key);
    if (matches.length === 0) return text;
    let result = text;
    for (const match of [...matches].reverse()) {
      result = result.slice(0, match.start) + result.slice(match.end);
    }
    return result.replace(/ {2,}/g, " ").trim();
  }

  function stripOptional(text: string | null): string | null {
    if (text === null) return null;
    const result = strip(text);
    return result === "" ? null : result;
  }

  return {
    ...working,
    procedure: strip(working.procedure),
    based_on: stripOptional(working.based_on),
    changes: working.changes.map((change) => ({
      ...change,
      what: strip(change.what),
      reason: stripOptional(change.reason),
    })),
    troubleshooting: stripOptional(working.troubleshooting),
    gapAnswers: working.gapAnswers.map((answer) => strip(answer)),
    edited: true,
  };
}

/** Project tags typed as "a, b,  c" become ["a", "b", "c"]. Empty entries are dropped. */
export function parseTags(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag !== "");
}

/** The tags as the comma-separated text shown in the edit input. */
export function formatTags(tags: string[]): string {
  return tags.join(", ");
}

/** The number of gaps with no answer yet. */
export function countEmptyGaps(working: Working): number {
  return working.gaps.filter((_, index) => (working.gapAnswers[index] ?? "").trim() === "").length;
}
