import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { jsonResponse, stubApi } from "./test/api";
import { renderApp } from "./test/renderApp";

const MEMBERS = ["Alex Chen", "Bea Lin"];

describe("routing", () => {
  it("sends a visitor with no stored name from /ask to /who", async () => {
    stubApi({
      "/api/members": () => jsonResponse(200, MEMBERS),
      "/api/records": () => jsonResponse(200, []),
    });

    renderApp("/ask");

    expect(await screen.findByRole("heading", { name: "Who are you?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ask" })).not.toBeInTheDocument();
  });

  it("shows a route for a stored name", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, []) });

    renderApp("/add");

    expect(await screen.findByRole("heading", { name: "Add a record" })).toBeInTheDocument();
  });

  it("sends an unknown path to /ask", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, []) });

    renderApp("/no-such-page");

    expect(await screen.findByRole("heading", { name: "What do you need to know?" })).toBeInTheDocument();
  });
});
