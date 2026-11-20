import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, ask, getMembers, getRecord, listRecords, suggestContributor } from "../../api/client";
import { renderApp } from "../../test/renderApp";
import { answered, INFO, insufficient, MEMBERS, ME, SOURCE } from "./fixtures";

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

const QUESTION = "How do I transform strain X?";

async function askQuestion(user: ReturnType<typeof userEvent.setup>, text = QUESTION) {
  await user.type(screen.getByLabelText("What do you need to know?"), text);
  await user.click(screen.getByRole("button", { name: "Ask" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("labknow.me", ME);
  vi.mocked(getMembers).mockResolvedValue(MEMBERS);
  vi.mocked(listRecords).mockResolvedValue([]);
  vi.mocked(getRecord).mockResolvedValue({ record: SOURCE, info: INFO });
});

describe("Ask: server validation", () => {
  it("shows a 422 from the server as the question's field message, and keeps the input", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockRejectedValueOnce(
      new ApiError(422, [{ loc: ["body", "question"], msg: "too short" }]),
    );
    renderApp("/ask");

    await askQuestion(user);

    const message = await screen.findByText("Type at least 3 characters.");
    expect(message).toHaveAttribute("role", "alert");
    expect(screen.queryByText("Couldn't get an answer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("What do you need to know?")).toHaveValue(QUESTION);
  });
});

describe("Ask: hints", () => {
  it("asks in hint mode, then shows the full answer with a link to the source", async () => {
    const user = userEvent.setup();
    vi.mocked(ask)
      .mockResolvedValueOnce(answered("Hint: start from the SOP and check the wash step."))
      .mockResolvedValueOnce(answered("Full: see **Transformation of strain X with plasmid P**."));
    renderApp("/ask");

    await user.click(screen.getByRole("switch", { name: "Hints first" }));
    await askQuestion(user);

    expect(await screen.findByRole("heading", { name: "Hints" })).toBeInTheDocument();
    expect(ask).toHaveBeenLastCalledWith({ question: QUESTION, requester: ME, hint_mode: true });
    expect(screen.queryByRole("link", { name: /^Source 1:/ })).not.toBeInTheDocument();
    expect(screen.getByText("Links to the record appear with the full answer.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show the full answer" }));

    expect(await screen.findByRole("heading", { name: "Answer" })).toBeInTheDocument();
    expect(ask).toHaveBeenLastCalledWith({ question: QUESTION, requester: ME, hint_mode: false });
    const marker = screen.getByRole("link", { name: "Source 1: Transformation of strain X with plasmid P" });
    expect(marker).toHaveAttribute("href", "/records/1");
  });
});

describe("Ask: not enough in the records", () => {
  it("starts with nothing chosen in the help step", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockResolvedValueOnce(insufficient());
    renderApp("/ask");

    await askQuestion(user);

    const group = await screen.findByRole("radiogroup", { name: "How to find someone" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("shows 'No close match' and switches to 'I'll choose' when no one is suggested", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockResolvedValueOnce(insufficient());
    vi.mocked(suggestContributor).mockResolvedValueOnce({ contributor: null });
    renderApp("/ask");
    await askQuestion(user);

    await user.click(await screen.findByRole("radio", { name: "Suggest someone" }));

    expect(await screen.findByText("No close match")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "I'll choose" })).toHaveAttribute("aria-checked", "true");
  });

  it("suggests a person, then 'Not solved' leaves them out of the choices", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockResolvedValueOnce(insufficient());
    vi.mocked(suggestContributor).mockResolvedValueOnce({ contributor: "Alex Chen" });
    renderApp("/ask");
    await askQuestion(user);

    await user.click(await screen.findByRole("radio", { name: "Suggest someone" }));

    expect(
      await screen.findByText("Their confirmed records are the closest match to your question."),
    ).toBeInTheDocument();
    const message = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "A message you can send" });
    expect(message.value).toContain("Hi Alex! I have a question: How do I transform strain X?");

    await user.click(screen.getByRole("button", { name: "Not solved: ask someone else" }));

    expect(
      screen.getByText("You asked Alex Chen and it isn't solved yet. Alex is left out below."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "I'll choose" }));
    const select = screen.getByRole("combobox", { name: "Who do you want to ask?" });
    expect(within(select).queryByRole("option", { name: "Alex Chen" })).not.toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Bea Lin" })).toBeInTheDocument();
  });

  it("records the person picked under 'Your open questions' as asking", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockResolvedValueOnce(insufficient());
    renderApp("/ask");
    await askQuestion(user);

    await user.click(await screen.findByRole("radio", { name: "I'll choose" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Who do you want to ask?" }), "Bea Lin");

    expect(await screen.findByText("You're asking Bea Lin")).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem("labknow.openQuestions") ?? "[]") as {
      requester: string;
      question: string;
      status: string;
      person: string;
    }[];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      requester: ME,
      question: QUESTION,
      status: "asking",
      person: "Bea Lin",
    });
  });
});

describe("Ask: number flags", () => {
  it("flags a number that no source contains and leaves out one that is in a source", async () => {
    const user = userEvent.setup();
    vi.mocked(ask).mockResolvedValueOnce(answered("Use 1 mL of SOC and 50 ng plasmid."));
    renderApp("/ask");

    await askQuestion(user);

    expect(await screen.findByText("1 mL", { selector: "mark" })).toBeInTheDocument();
    expect(screen.queryByText("50 ng", { selector: "mark" })).not.toBeInTheDocument();
    expect(screen.getByText('No source for "1 mL".')).toBeInTheDocument();
    expect(screen.queryByText('No source for "50 ng".')).not.toBeInTheDocument();
  });
});
