import { describe, expect, it } from "vitest";
import type { RecordDraft } from "../../api/types";
import {
  buildDraft,
  countEmptyGaps,
  draftRows,
  draftToSave,
  numbersByRow,
  parseTags,
  removeNumber,
  toWorking,
} from "./draft";

const DRAFT: RecordDraft = {
  procedure: "Transformation of strain X",
  based_on: null,
  contributors: ["Alex Chen"],
  project_tags: [],
  changes: [{ what: "Recovery 1 h at 37 °C", reason: null }],
  troubleshooting: null,
  gaps: ["Antibiotic and plate used for selection", "How long the plates grew"],
};

describe("buildDraft", () => {
  it("moves a gap with an answer to changes as '{gap}: {answer}'", () => {
    const built = buildDraft(DRAFT, ["Kanamycin, 50 µg/mL", ""]);

    expect(built.changes).toEqual([
      { what: "Recovery 1 h at 37 °C", reason: null },
      { what: "Antibiotic and plate used for selection: Kanamycin, 50 µg/mL", reason: null },
    ]);
  });

  it("keeps an empty gap in gaps", () => {
    const built = buildDraft(DRAFT, ["Kanamycin", ""]);

    expect(built.gaps).toEqual(["How long the plates grew"]);
  });

  it("treats a whitespace-only answer as empty", () => {
    const built = buildDraft(DRAFT, ["   ", "  "]);

    expect(built.gaps).toEqual(DRAFT.gaps);
    expect(built.changes).toEqual(DRAFT.changes);
  });

  it("returns only the RecordDraft fields", () => {
    const built = buildDraft(DRAFT, ["", ""]);

    expect(Object.keys(built).sort()).toEqual(
      [
        "procedure",
        "based_on",
        "contributors",
        "project_tags",
        "changes",
        "troubleshooting",
        "gaps",
      ].sort(),
    );
  });
});

describe("working copy", () => {
  it("gives each change a key and tells the save body apart from the keys", () => {
    const working = toWorking(DRAFT, 10);

    expect(working.changes).toEqual([{ key: 10, what: "Recovery 1 h at 37 °C", reason: null }]);
    expect(working.nextKey).toBe(11);
    expect(draftToSave(working).changes).toEqual(DRAFT.changes);
    expect(countEmptyGaps(working)).toBe(2);
  });

  it("removes one number from every text field and collapses the spaces it leaves", () => {
    const working = toWorking(DRAFT, 1);

    const next = removeNumber(working, "37 °C");

    expect(next.changes[0].what).toBe("Recovery 1 h at");
    expect(next.edited).toBe(true);
  });

  it("does not match a number inside a longer number", () => {
    const working = toWorking({ ...DRAFT, changes: [{ what: "Spun 11 h", reason: null }] }, 1);

    expect(removeNumber(working, "1 h").changes[0].what).toBe("Spun 11 h");
  });

  it("groups unchecked numbers under the first row where they appear", () => {
    const working = toWorking(
      { ...DRAFT, changes: [{ what: "Spin 1 h", reason: "1 h" }] },
      1,
    );
    const byRow = numbersByRow(draftRows(working), ["50 ng"]);

    expect(byRow.get("change-1")).toEqual(["1 h"]);
  });
});

describe("parseTags", () => {
  it("splits on commas and drops empty entries", () => {
    expect(parseTags(" Project X, , plasmids ,")).toEqual(["Project X", "plasmids"]);
  });
});
