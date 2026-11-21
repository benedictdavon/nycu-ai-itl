import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { RecordDraft } from "../../api/types";
import { ToastProvider } from "../../components/Toast";
import { MeProvider } from "../../lib/me";
import ReviewScreen from "./ReviewScreen";
import { errorResponse, jsonResponse, stubFetch, writes, type Call } from "./testing";

// jsdom has no scrollIntoView. The confirm panel is scrolled into view, so the tests stub it.
const scrollIntoView = vi.fn();
beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

const INFO = {
  id: 1,
  kind: "upload",
  contributor: "Alex Chen",
  title: "Transformation of strain X with plasmid P",
  text: "Transformation of strain X. Second try: used 50 ng plasmid. Normal colonies.",
  link: null,
  project_tags: [],
  has_file: false,
};

function record(overrides: Partial<RecordDraft> & { status?: string } = {}) {
  return {
    id: 7,
    info_id: 1,
    status: "draft",
    confirmed_by: null,
    procedure: "Transformation of strain X",
    based_on: null,
    contributors: ["Alex Chen"],
    project_tags: [],
    changes: [{ what: "Recovery 1 h at 37 °C", reason: null }],
    troubleshooting: null,
    gaps: [],
    ...overrides,
  };
}

type Options = {
  record?: ReturnType<typeof record>;
  followUps?: { question: string; answer: string | null }[];
  confirm?: () => Response;
};

/** Answers the review screen's requests. PUT echoes the body back as the saved record. */
function stubReview(options: Options = {}) {
  const current = options.record ?? record();
  return stubFetch((call: Call) => {
    if (call.method === "GET" && call.path === "/api/records/7") {
      return jsonResponse(200, { record: current, info: INFO });
    }
    if (call.method === "GET" && call.path === "/api/infos/1") {
      return jsonResponse(200, {
        info: INFO,
        follow_ups: options.followUps ?? [],
        result: { kind: "draft", question: null, draft: null },
        record_id: 7,
      });
    }
    if (call.method === "GET" && call.path === "/api/members") {
      return jsonResponse(200, ["Alex Chen", "Bea Lin"]);
    }
    if (call.method === "PUT" && call.path === "/api/records/7") {
      return jsonResponse(200, { ...current, ...(call.body as object) });
    }
    if (call.method === "POST" && call.path === "/api/records/7/confirm") {
      return options.confirm
        ? options.confirm()
        : jsonResponse(200, { ...current, status: "confirmed", confirmed_by: "Alex Chen" });
    }
    return errorResponse(404, "Not found");
  });
}

/** A data router, because the review screen blocks leaving with unsaved edits (useBlocker). */
function renderAt(state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: "/review/:recordId", element: <ReviewScreen /> },
      { path: "/records/:recordId", element: <p>Record page</p> },
      { path: "/inbox", element: <p>Inbox page</p> },
    ],
    { initialEntries: [{ pathname: "/review/7", state }] },
  );
  return render(
    <MeProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </MeProvider>,
  );
}

function flaggedNumbers(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("mark")).map((mark) => mark.textContent ?? "");
}

describe("Check the draft: number check", () => {
  it("flags numbers not in the record, and updates the chip as they are checked", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    const { container } = renderAt();

    expect(await screen.findByRole("heading", { name: "Check the draft" })).toBeInTheDocument();
    expect(screen.getByText("2 numbers not in your record")).toBeInTheDocument();
    expect(flaggedNumbers(container)).toEqual(["1 h", "37 °C"]);

    await user.click(
      within(screen.getByRole("group", { name: 'Check "1 h"' })).getByRole("button", {
        name: "Yes, it's right",
      }),
    );
    expect(screen.getByText("1 number not in your record")).toBeInTheDocument();
    expect(flaggedNumbers(container)).toEqual(["37 °C"]);

    await user.click(
      within(screen.getByRole("group", { name: 'Check "37 °C"' })).getByRole("button", {
        name: "Remove it",
      }),
    );
    expect(screen.getByText("Every number checked")).toBeInTheDocument();
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit change: Recovery 1 h at" })).toBeInTheDocument();
  });

  it("does not flag a number that is in a follow-up answer", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview({
      followUps: [{ question: "Which temperature?", answer: "37 °C" }],
    });
    const { container } = renderAt();

    expect(await screen.findByRole("heading", { name: "Check the draft" })).toBeInTheDocument();
    expect(screen.getByText("1 number not in your record")).toBeInTheDocument();
    expect(flaggedNumbers(container)).toEqual(["1 h"]);
  });
});

describe("Check the draft: confirm", () => {
  it("lists the unchecked numbers, the empty gaps and the no-edit line in Before you confirm", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview({ record: record({ gaps: ["Antibiotic used for selection"] }) });
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));

    expect(screen.getByRole("heading", { name: "Before you confirm" })).toBeInTheDocument();
    expect(screen.getByText("2 numbers aren't checked:")).toBeInTheDocument();
    expect(screen.getByText('"1 h" is not in your record.')).toBeInTheDocument();
    expect(screen.getByText('"37 °C" is not in your record.')).toBeInTheDocument();
    expect(
      screen.getByText("1 gap is empty. Labmates will see it as not recorded."),
    ).toBeInTheDocument();
    expect(screen.getByText(/You can't edit it after\./)).toBeInTheDocument();
  });

  it("uses the plural empty-gaps line when two or more gaps are empty", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview({
      record: record({ gaps: ["Antibiotic used for selection", "How long the plates grew"] }),
    });
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));

    expect(
      screen.getByText("2 gaps are empty. Labmates will see them as not recorded."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/gap is empty/)).not.toBeInTheDocument();
  });

  it("confirms without saving when nothing was edited", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Confirm and publish" }));

    expect(await screen.findByText("Record page")).toBeInTheDocument();
    expect(writes(calls)).toEqual(["POST /api/records/7/confirm"]);
    expect(calls.find((call) => call.method === "POST")?.body).toEqual({
      confirmed_by: "Alex Chen",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Record confirmed");
  });

  it("saves the edit first, then confirms, then goes to the record", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit Procedure" }));
    const procedure = screen.getByRole("textbox", { name: "Procedure" });
    await user.clear(procedure);
    await user.type(procedure, "Transformation of strain X, v2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Confirm and publish" }));

    expect(await screen.findByText("Record page")).toBeInTheDocument();
    expect(writes(calls)).toEqual(["PUT /api/records/7", "POST /api/records/7/confirm"]);
    const saved = calls.find((call) => call.method === "PUT")?.body as RecordDraft;
    expect(saved.procedure).toBe("Transformation of strain X, v2");
    expect(Object.keys(saved).sort()).toEqual(
      ["procedure", "based_on", "contributors", "project_tags", "changes", "troubleshooting", "gaps"].sort(),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Record confirmed");
    expect(screen.getByRole("status")).toHaveTextContent("Labmates can find it when they ask.");
  });

  it("shows the confirmed-by-someone-else card on a 409", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview({ confirm: () => errorResponse(409, "already confirmed") });
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Confirm and publish" }));

    expect(
      await screen.findByRole("heading", { name: "This record was just confirmed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the confirmed record" })).toHaveAttribute(
      "href",
      "/records/7",
    );
  });
});

describe("Check the draft: saving", () => {
  it("moves a filled gap into the changes on Save draft", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview({
      record: record({ gaps: ["Antibiotic used for selection"] }),
    });
    renderAt();

    await user.type(
      await screen.findByRole("textbox", { name: "Antibiotic used for selection" }),
      "Kanamycin",
    );
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Draft saved");
    expect(writes(calls)).toEqual(["PUT /api/records/7"]);
    const saved = calls.find((call) => call.method === "PUT")?.body as RecordDraft;
    expect(saved.gaps).toEqual([]);
    expect(saved.changes).toEqual([
      { what: "Recovery 1 h at 37 °C", reason: null },
      { what: "Antibiotic used for selection: Kanamycin", reason: null },
    ]);
  });
});

describe("Check the draft: access and progress", () => {
  it("shows only the access card to someone who is not a contributor", async () => {
    localStorage.setItem("labknow.me", "Bea Lin");
    stubReview();
    renderAt();

    expect(
      await screen.findByRole("heading", { name: "Only a contributor can confirm this record" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ask Alex Chen to confirm it\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Procedure" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Check the draft" })).not.toBeInTheDocument();
  });

  it("shows the progress when it comes from Add a record", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt({ fromAdd: true });

    const progress = await screen.findByRole("list", { name: "Progress" });
    expect(within(progress).getByText("Record added")).toBeInTheDocument();
    expect(
      within(progress).getByText("Check the draft").closest("li"),
    ).toHaveAttribute("aria-current", "step");
    expect(screen.queryByRole("link", { name: "Back to To review" })).not.toBeInTheDocument();
  });

  it("offers Back to To review when it does not come from Add a record", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    expect(await screen.findByRole("link", { name: "Back to To review" })).toHaveAttribute(
      "href",
      "/inbox",
    );
  });
});

describe("Check the draft: an open edit blocks Save and Confirm", () => {
  it("refuses Save draft while a row is open, names the row and focuses its input", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit Based on" }));
    await user.type(screen.getByRole("textbox", { name: /Based on/ }), "Kit A");
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Save or cancel your edit to Based on first.");
    expect(writes(calls)).toEqual([]);
    expect(screen.getByRole("textbox", { name: /Based on/ })).toHaveFocus();
  });

  it("refuses Confirm record while a row is open: the panel does not open", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit Based on" }));
    await user.type(screen.getByRole("textbox", { name: /Based on/ }), "Kit A");
    await user.click(screen.getByRole("button", { name: "Confirm record" }));

    expect(screen.queryByRole("heading", { name: "Before you confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Save or cancel your edit to Based on first.");
    expect(writes(calls)).toEqual([]);
    expect(screen.getByRole("textbox", { name: /Based on/ })).toHaveFocus();
  });

  it("refuses Confirm and publish for a row opened after the panel was shown, with the message in the panel", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Edit Based on" }));
    await user.click(screen.getByRole("button", { name: "Confirm and publish" }));

    expect(writes(calls)).toEqual([]);
    const panel = screen.getByRole("region", { name: "Before you confirm" });
    expect(within(panel).getByRole("alert")).toHaveTextContent(
      "Save or cancel your edit to Based on first.",
    );
  });

  it("a newly added change blocks Save draft until it is cancelled", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Add a change" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Save or cancel your edit to a new change first.",
    );
    expect(writes(calls)).toEqual([]);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Draft saved");
    expect(writes(calls)).toEqual(["PUT /api/records/7"]);
  });

  it("names an open existing change by its text in the message", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit change: Recovery 1 h at 37 °C" }));
    await user.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Save or cancel your edit to the change "Recovery 1 h at 37 °C" first.',
    );
    expect(writes(calls)).toEqual([]);
  });
});

describe("Check the draft: the confirm panel", () => {
  it("scrolls the panel into view and focuses its heading when it opens", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));

    expect(screen.getByRole("heading", { name: "Before you confirm" })).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("Escape closes the panel and focuses Confirm record", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("heading", { name: "Before you confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm record" })).toHaveFocus();
  });

  it("Go back and check closes the panel and focuses Confirm record", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Go back and check" }));

    expect(screen.queryByRole("heading", { name: "Before you confirm" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm record" })).toHaveFocus();
  });
});

describe("Check the draft: leaving with unsaved edits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("confirms and opens the record without a leave prompt", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit Procedure" }));
    await user.type(screen.getByRole("textbox", { name: "Procedure" }), ", v2");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Confirm record" }));
    await user.click(screen.getByRole("button", { name: "Confirm and publish" }));

    expect(await screen.findByText("Record page")).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks before an in-app link leaves with unsaved edits, and stays when declined", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    stubReview();
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Edit Procedure" }));
    await user.type(screen.getByRole("textbox", { name: "Procedure" }), ", v2");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("link", { name: "Back to To review" }));

    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith(
        "You have unsaved changes to this draft. Leave without saving them?",
      ),
    );
    expect(screen.getByRole("heading", { name: "Check the draft" })).toBeInTheDocument();
    expect(screen.queryByText("Inbox page")).not.toBeInTheDocument();
  });

  it("prevents the reload or close prompt only while there are unsaved edits", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();
    await screen.findByRole("heading", { name: "Check the draft" });

    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    await user.click(screen.getByRole("button", { name: "Edit Procedure" }));
    await user.type(screen.getByRole("textbox", { name: "Procedure" }), ", v2");

    const dirty = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe("Check the draft: layout", () => {
  it("shows the highlight legend only when a number in the record is used by the draft", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    const { unmount } = renderAt();

    expect(await screen.findByRole("heading", { name: "Your original record" })).toBeInTheDocument();
    expect(screen.queryByText("Highlighted: parts the draft uses.")).not.toBeInTheDocument();
    unmount();

    // "50 ng" is in the record, so a draft that uses it highlights it.
    stubReview({ record: record({ changes: [{ what: "Used 50 ng plasmid", reason: null }] }) });
    renderAt();

    expect(await screen.findByText("Highlighted: parts the draft uses.")).toBeInTheDocument();
  });

  it("links the lead to the original record heading", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    const link = await screen.findByRole("link", { name: "your original record" });
    expect(link).toHaveAttribute("href", "#original-record");
    expect(screen.getByRole("heading", { name: "Your original record" })).toHaveAttribute(
      "id",
      "original-record",
    );
  });

  it("puts each draft field label at the same level, under the page heading", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubReview();
    renderAt();

    expect(await screen.findByRole("heading", { level: 1, name: "Check the draft" })).toBeInTheDocument();
    for (const label of ["Procedure", "Based on", "Contributors", "Project tags", "Changes from the SOP"]) {
      expect(screen.getByRole("heading", { level: 2, name: label })).toBeInTheDocument();
    }
  });
});
