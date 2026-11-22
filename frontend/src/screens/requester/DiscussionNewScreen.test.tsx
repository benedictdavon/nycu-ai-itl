import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDiscussion, getMembers, getRecord, listRecords } from "../../api/client";
import { renderApp } from "../../test/renderApp";
import { INFO, MEMBERS, ME, SOURCE } from "./fixtures";

vi.mock("../../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/client")>();
  return {
    ...actual,
    ask: vi.fn(),
    getRecord: vi.fn(),
    listRecords: vi.fn(),
    getMembers: vi.fn(),
    suggestContributor: vi.fn(),
    createDiscussion: vi.fn(),
  };
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("labknow.me", ME);
  vi.mocked(getMembers).mockResolvedValue(MEMBERS);
  vi.mocked(listRecords).mockResolvedValue([]);
});

describe("Save the discussion", () => {
  it("keeps Send disabled until the box is ticked, then sends, goes to /ask and shows a toast", async () => {
    const user = userEvent.setup();
    // The saved record is still a draft, so the Ask screen keeps it under "Your open questions".
    vi.mocked(getRecord).mockResolvedValue({ record: { ...SOURCE, status: "draft" }, info: INFO });
    vi.mocked(createDiscussion).mockResolvedValueOnce({
      info: INFO,
      follow_ups: [],
      result: { kind: "draft", question: null, draft: null },
      record_id: 9,
    });
    renderApp("/discussions/new?q=Why%20did%20the%20cells%20clump&contributor=Alex%20Chen");

    const send = await screen.findByRole("button", { name: "Send to Alex for review" });
    expect(send).toBeDisabled();
    expect(screen.getByText("Tick the box above first")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Alex Chen and I agree this answers the question" }));
    expect(send).toBeEnabled();
    await user.type(screen.getByRole("textbox", { name: "The discussion" }), "Alex: the wash volume was the fix.");
    await user.click(send);

    await waitFor(() =>
      expect(createDiscussion).toHaveBeenCalledWith({
        requester: ME,
        contributor: "Alex Chen",
        question: "Why did the cells clump",
        text: "Alex: the wash volume was the fix.",
      }),
    );
    expect(await screen.findByRole("heading", { name: "What do you need to know?" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sent to Alex for review.");
    expect(screen.getByRole("status")).toHaveTextContent("It stays in Your open questions until Alex confirms it.");
    expect(await screen.findByText("Saved. Waiting for Alex Chen to confirm it.")).toBeInTheDocument();
  });
});
