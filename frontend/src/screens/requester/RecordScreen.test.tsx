import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMembers, getRecord, listRecords } from "../../api/client";
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

describe("Record view", () => {
  it("shows only 'not confirmed yet' for a draft opened by a non-contributor", async () => {
    vi.mocked(getRecord).mockResolvedValue({ record: { ...SOURCE, status: "draft" }, info: INFO });
    renderApp("/records/1");

    expect(await screen.findByRole("heading", { name: "This record isn't confirmed yet" })).toBeInTheDocument();
    expect(screen.queryByText(SOURCE.procedure)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Check the draft" })).not.toBeInTheDocument();
  });

  it("says there is no file to download for pasted text", async () => {
    vi.mocked(getRecord).mockResolvedValue({ record: SOURCE, info: { ...INFO, has_file: false } });
    renderApp("/records/1");

    expect(await screen.findByRole("heading", { name: SOURCE.procedure })).toBeInTheDocument();
    expect(screen.getByText("Added as pasted text, so there is no file to download.")).toBeInTheDocument();
  });
});
