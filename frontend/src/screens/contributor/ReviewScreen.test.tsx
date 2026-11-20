import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import type { RecordDraft } from "../../api/types";
import { ToastProvider } from "../../components/Toast";
import { MeProvider } from "../../lib/me";
import ReviewScreen from "./ReviewScreen";
import { errorResponse, jsonResponse, stubFetch, writes, type Call } from "./testing";

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

function renderAt(state?: unknown) {
  return render(
    <MeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[{ pathname: "/review/7", state }]}>
          <Routes>
            <Route path="/review/:recordId" element={<ReviewScreen />} />
            <Route path="/records/:recordId" element={<p>Record page</p>} />
            <Route path="/inbox" element={<p>Inbox page</p>} />
          </Routes>
        </MemoryRouter>
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
