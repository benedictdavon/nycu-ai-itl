import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { MeProvider } from "../../lib/me";
import InboxScreen from "./InboxScreen";
import { errorResponse, jsonResponse, stubFetch } from "./testing";

function record(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    info_id: id,
    status: "draft",
    confirmed_by: null,
    procedure: `Procedure ${id}`,
    based_on: null,
    contributors: ["Alex Chen"],
    project_tags: [],
    changes: [],
    troubleshooting: null,
    gaps: [],
    ...overrides,
  };
}

function info(id: number, kind: "upload" | "discussion", contributor: string) {
  return {
    id,
    kind,
    contributor,
    title: `Title ${id}`,
    text: "Some text.",
    link: null,
    project_tags: [],
    has_file: false,
  };
}

function renderAt() {
  return render(
    <MeProvider>
      <MemoryRouter initialEntries={["/inbox"]}>
        <Routes>
          <Route path="/inbox" element={<InboxScreen />} />
          <Route path="/review/:recordId" element={<p>Review page</p>} />
          <Route path="/records/:recordId" element={<p>Record page</p>} />
          <Route path="/add" element={<p>Add page</p>} />
        </Routes>
      </MemoryRouter>
    </MeProvider>,
  );
}

describe("To review", () => {
  it("says you are all caught up, with a link to Add a record, when there are no drafts", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) =>
      call.method === "GET" && call.path === "/api/records"
        ? jsonResponse(200, [])
        : errorResponse(404),
    );
    renderAt();

    expect(await screen.findByRole("heading", { name: "You're all caught up" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a record" })).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("heading", { name: "Drafts to check" })).not.toBeInTheDocument();
  });

  it("links a discussion draft to its review, with the From a saved discussion origin", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) => {
      if (call.method === "GET" && call.path === "/api/records") {
        if (call.search.get("status") === "draft") {
          return jsonResponse(200, [record(9)]);
        }
        return jsonResponse(200, []);
      }
      if (call.method === "GET" && call.path === "/api/records/9") {
        return jsonResponse(200, {
          record: record(9),
          info: info(9, "discussion", "Chris Wu"),
        });
      }
      return errorResponse(404);
    });
    renderAt();

    const link = await screen.findByRole("link", { name: /Procedure 9/ });
    expect(link).toHaveAttribute("href", "/review/9");
    expect(within(link).getByText("From a saved discussion")).toBeInTheDocument();
  });

  it("names your own uploads and other people's uploads", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) => {
      if (call.method === "GET" && call.path === "/api/records") {
        if (call.search.get("status") === "draft") {
          return jsonResponse(200, [
            record(1, { gaps: ["How long the plates grew"] }),
            record(2),
          ]);
        }
        return jsonResponse(200, []);
      }
      if (call.method === "GET" && call.path === "/api/records/1") {
        return jsonResponse(200, { record: record(1), info: info(1, "upload", "Alex Chen") });
      }
      if (call.method === "GET" && call.path === "/api/records/2") {
        return jsonResponse(200, { record: record(2), info: info(2, "upload", "Bea Lin") });
      }
      return errorResponse(404);
    });
    renderAt();

    expect(await screen.findByText("Your upload")).toBeInTheDocument();
    expect(screen.getByText("Upload by Bea Lin")).toBeInTheDocument();
    expect(screen.getByText("1 gap")).toBeInTheDocument();
  });

  it("lists only the confirmed records that you confirmed", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubFetch((call) => {
      if (call.method === "GET" && call.path === "/api/records") {
        if (call.search.get("status") === "confirmed") {
          return jsonResponse(200, [
            record(3, { status: "confirmed", confirmed_by: "Alex Chen", procedure: "Mine" }),
            record(4, { status: "confirmed", confirmed_by: "Bea Lin", procedure: "Not mine" }),
          ]);
        }
        return jsonResponse(200, []);
      }
      return errorResponse(404);
    });
    renderAt();

    const heading = await screen.findByRole("heading", { name: "Confirmed by you" });
    const section = heading.closest("section") as HTMLElement;
    expect(within(section).getByRole("link", { name: "Mine" })).toHaveAttribute(
      "href",
      "/records/3",
    );
    expect(screen.queryByText("Not mine")).not.toBeInTheDocument();
  });
});
