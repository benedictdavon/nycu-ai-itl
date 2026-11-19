import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { jsonResponse, stubApi } from "../test/api";
import { renderApp } from "../test/renderApp";

const MEMBERS = ["Alex Chen", "Bea Lin", "Chris Wu", "Dana Huang", "Prof. Evan Lee"];

describe("WhoScreen", () => {
  it("shows skeleton rows while loading, then the five names as buttons", async () => {
    stubApi({
      "/api/members": () => jsonResponse(200, MEMBERS),
      "/api/records": () => jsonResponse(200, []),
    });

    renderApp("/who");

    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
    expect(await screen.findByRole("button", { name: "Alex Chen" })).toBeInTheDocument();
    expect(screen.getByRole("list")).not.toHaveAttribute("aria-busy");
    const buttons = within(screen.getByRole("list")).getAllByRole("button");
    expect(buttons).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Prof. Evan Lee" })).toBeInTheDocument();
  });

  it("marks the last-used name with a visible note", async () => {
    localStorage.setItem("labknow.me", "Bea Lin");
    stubApi({
      "/api/members": () => jsonResponse(200, MEMBERS),
      "/api/records": () => jsonResponse(200, []),
    });

    renderApp("/who");

    const bea = await screen.findByRole("button", { name: /Bea Lin/ });
    expect(bea).toHaveTextContent("Last used on this browser");
    expect(screen.getByRole("button", { name: /Alex Chen/ })).not.toHaveTextContent(
      "Last used on this browser",
    );
  });

  it("saves the picked name and goes to /ask", async () => {
    const user = userEvent.setup();
    stubApi({
      "/api/members": () => jsonResponse(200, MEMBERS),
      "/api/records": () => jsonResponse(200, []),
    });
    renderApp("/who");

    await user.click(await screen.findByRole("button", { name: "Dana Huang" }));

    await waitFor(() => expect(localStorage.getItem("labknow.me")).toBe("Dana Huang"));
    expect(await screen.findByRole("heading", { name: "Ask" })).toBeInTheDocument();
  });

  it("shows an error card when the list fails to load, and Try again loads it", async () => {
    const user = userEvent.setup();
    let failing = true;
    stubApi({
      "/api/members": () => (failing ? jsonResponse(500, { detail: "boom" }) : jsonResponse(200, MEMBERS)),
      "/api/records": () => jsonResponse(200, []),
    });
    renderApp("/who");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load the member list");
    expect(alert).not.toHaveTextContent("boom");

    failing = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("button", { name: "Alex Chen" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
