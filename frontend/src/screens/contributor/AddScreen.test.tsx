import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { ToastProvider } from "../../components/Toast";
import { MeProvider } from "../../lib/me";
import AddScreen from "./AddScreen";
import { errorResponse, jsonResponse, stubFetch, writes } from "./testing";

const INFO = {
  id: 1,
  kind: "upload",
  contributor: "Alex Chen",
  title: "Transformation of strain X",
  text: "First try: few colonies.",
  link: null,
  project_tags: [],
  has_file: false,
};

const DRAFT_STATE = {
  info: INFO,
  follow_ups: [],
  result: {
    kind: "draft",
    question: null,
    draft: {
      procedure: "Transformation of strain X",
      based_on: null,
      contributors: ["Alex Chen"],
      project_tags: [],
      changes: [],
      troubleshooting: null,
      gaps: [],
    },
  },
  record_id: 7,
};

function renderAt(path = "/add") {
  return render(
    <MeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/add" element={<AddScreen />} />
            <Route path="/add/:infoId" element={<p>Follow-up page</p>} />
            <Route path="/review/:recordId" element={<p>Review page</p>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </MeProvider>,
  );
}

describe("Add a record", () => {
  it("shows Add a title and sends nothing when the title is empty", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubFetch(() => errorResponse(404));
    renderAt();

    await user.type(screen.getByLabelText("Record text"), "First try: few colonies.");
    await user.click(screen.getByRole("button", { name: "Draft the record" }));

    expect(screen.getByText("Add a title.")).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("sends the pasted text and goes to the draft", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubFetch((call) =>
      call.method === "POST" && call.path === "/api/infos"
        ? jsonResponse(200, DRAFT_STATE)
        : errorResponse(404),
    );
    renderAt();

    await user.type(screen.getByLabelText("Title"), "Transformation of strain X");
    await user.type(screen.getByLabelText("Record text"), "First try: few colonies.");
    await user.click(screen.getByRole("button", { name: "Draft the record" }));

    expect(await screen.findByText("Review page")).toBeInTheDocument();
    expect(writes(calls)).toEqual(["POST /api/infos"]);
    const form = calls[0].body as FormData;
    expect(form.get("text")).toBe("First try: few colonies.");
    expect(form.get("title")).toBe("Transformation of strain X");
    expect(form.get("contributor")).toBe("Alex Chen");
    expect(form.get("file")).toBeNull();
  });

  it("puts the file input inside the drop-zone label, visually hidden with sr-only", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch(() => errorResponse(404));
    const { container } = renderAt();

    await user.click(screen.getByRole("tab", { name: "Upload a file" }));

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.closest("label")).not.toBeNull();
    expect(input).toHaveClass("sr-only");
    expect(input).toHaveAttribute("accept", ".pdf,.docx,.txt,.md");
  });

  it("sends the chosen file and names it", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubFetch((call) =>
      call.method === "POST" && call.path === "/api/infos"
        ? jsonResponse(200, DRAFT_STATE)
        : errorResponse(404),
    );
    const { container } = renderAt();
    await user.click(screen.getByRole("tab", { name: "Upload a file" }));
    const file = new File(["First try: few colonies."], "notes.txt", { type: "text/plain" });

    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Title"), "Transformation of strain X");
    await user.click(screen.getByRole("button", { name: "Draft the record" }));

    expect(await screen.findByText("Review page")).toBeInTheDocument();
    const form = calls[0].body as FormData;
    expect(form.get("file")).toBeInstanceOf(File);
    expect(form.get("text")).toBeNull();
  });

  it("shows Can't reach the model on 503 and keeps the typed text", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch(() => errorResponse(503, "model down"));
    renderAt();

    await user.type(screen.getByLabelText("Title"), "Transformation of strain X");
    await user.type(screen.getByLabelText("Record text"), "First try: few colonies.");
    await user.click(screen.getByRole("button", { name: "Draft the record" }));

    expect(
      await screen.findByRole("heading", { name: "Can't reach the model" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Record text")).toHaveValue("First try: few colonies.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("names the file and offers to paste instead when the file has no text", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) =>
      call.method === "POST" && call.path === "/api/infos"
        ? errorResponse(422, "no text")
        : errorResponse(404),
    );
    const { container } = renderAt();
    await user.click(screen.getByRole("tab", { name: "Upload a file" }));
    await user.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      new File(["%PDF"], "plate-photos.pdf", { type: "application/pdf" }),
    );
    await user.type(screen.getByLabelText("Title"), "Plates");
    await user.click(screen.getByRole("button", { name: "Draft the record" }));

    expect(
      await screen.findByRole("heading", { name: "No text found in plate-photos.pdf" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Paste text instead" }));
    expect(screen.getByLabelText("Record text")).toBeInTheDocument();
  });
});
