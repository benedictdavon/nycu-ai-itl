import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { MeProvider } from "../../lib/me";
import FollowUpScreen from "./FollowUpScreen";
import { errorResponse, jsonResponse, stubFetch, writes } from "./testing";

const INFO = {
  id: 1,
  kind: "upload",
  contributor: "Alex Chen",
  title: "Transformation of strain X",
  text: "First try: few colonies. Second try: used 50 ng plasmid.",
  link: "https://example.com/benchling/transformation-strain-x",
  project_tags: [],
  has_file: false,
};

function questionState(followUps: { question: string; answer: string | null }[], question: string) {
  return {
    info: INFO,
    follow_ups: followUps,
    result: { kind: "question", question, draft: null },
    record_id: null,
  };
}

function renderAt() {
  return render(
    <MeProvider>
      <MemoryRouter initialEntries={["/add/1"]}>
        <Routes>
          <Route path="/add/:infoId" element={<FollowUpScreen />} />
          <Route path="/review/:recordId" element={<p>Review page</p>} />
          <Route path="/inbox" element={<p>Inbox page</p>} />
        </Routes>
      </MemoryRouter>
    </MeProvider>,
  );
}

describe("Follow-up question", () => {
  it("shows the question and the progress for the first question", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) =>
      call.method === "GET" && call.path === "/api/infos/1"
        ? jsonResponse(200, questionState([], "Did you change the recovery step?"))
        : errorResponse(404),
    );
    renderAt();

    expect(
      await screen.findByRole("heading", { name: "Did you change the recovery step?" }),
    ).toBeInTheDocument();
    const progress = screen.getByRole("list", { name: "Progress" });
    expect(within(progress).getByText("Question 1 of at most 2")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("link", { name: "Open in Benchling" })).toBeInTheDocument();
  });

  it("sends I don't know when the question is skipped, and then shows the next question", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubFetch((call) => {
      if (call.method === "GET" && call.path === "/api/infos/1") {
        return jsonResponse(200, questionState([], "Did you change the recovery step?"));
      }
      if (call.method === "POST" && call.path === "/api/infos/1/follow-ups") {
        return jsonResponse(
          200,
          questionState(
            [{ question: "Did you change the recovery step?", answer: "I don't know" }],
            "Which elution buffer did you use?",
          ),
        );
      }
      return errorResponse(404);
    });
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Skip this question" }));

    expect(
      await screen.findByRole("heading", { name: "Which elution buffer did you use?" }),
    ).toBeInTheDocument();
    expect(writes(calls)).toEqual(["POST /api/infos/1/follow-ups"]);
    expect(calls[1].body).toEqual({ answer: "I don't know" });
    expect(
      within(screen.getByRole("list", { name: "Progress" })).getByText("Question 2 of at most 2"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });

  it("asks for an answer instead of sending an empty one", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    const { calls } = stubFetch((call) =>
      call.method === "GET" && call.path === "/api/infos/1"
        ? jsonResponse(200, questionState([], "Did you change the recovery step?"))
        : errorResponse(404),
    );
    renderAt();

    await user.click(await screen.findByRole("button", { name: "Send answer" }));

    expect(screen.getByText("Type an answer, or skip the question.")).toBeInTheDocument();
    expect(writes(calls)).toEqual([]);
  });

  it("shows a 422 from the server as the answer's field message, and keeps the input", async () => {
    const user = userEvent.setup();
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) => {
      if (call.method === "GET" && call.path === "/api/infos/1") {
        return jsonResponse(200, questionState([], "Did you change the recovery step?"));
      }
      if (call.method === "POST" && call.path === "/api/infos/1/follow-ups") {
        return errorResponse(422, [{ loc: ["body", "answer"], msg: "too short" }]);
      }
      return errorResponse(404);
    });
    renderAt();

    await user.type(await screen.findByLabelText("Your answer"), "No");
    await user.click(screen.getByRole("button", { name: "Send answer" }));

    const message = await screen.findByText("Type an answer, or skip the question.");
    expect(message).toHaveAttribute("role", "alert");
    expect(screen.queryByText("Couldn't send your answer")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your answer")).toHaveValue("No");
  });

  it("shows Couldn't load this question with a way back to To review", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch(() => errorResponse(404));
    renderAt();

    expect(
      await screen.findByRole("heading", { name: "Couldn't load this question" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to To review" })).toHaveAttribute(
      "href",
      "/inbox",
    );
  });
});
