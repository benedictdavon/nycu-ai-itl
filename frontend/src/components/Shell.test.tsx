import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { jsonResponse, stubApi } from "../test/api";
import { renderApp } from "../test/renderApp";

const DRAFT = {
  id: 1,
  info_id: 1,
  status: "draft",
  confirmed_by: null,
  procedure: "Transformation",
  based_on: null,
  contributors: ["Alex Chen"],
  project_tags: [],
  changes: [],
  troubleshooting: null,
  gaps: [],
};

describe("Shell", () => {
  it("marks the current nav item with aria-current", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, []) });

    renderApp("/add");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Add a record" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Ask" })).not.toHaveAttribute("aria-current");
    expect(within(nav).getByRole("link", { name: /To review/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps To review active on a review page", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, []) });

    renderApp("/review/1");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: /To review/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows the number of drafts to check on To review", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, [DRAFT, { ...DRAFT, id: 2 }]) });

    renderApp("/ask");

    const link = await within(await screen.findByRole("navigation", { name: "Main" })).findByRole(
      "link",
      { name: /To review/ },
    );
    expect(await within(link).findByText("2", { exact: false })).toBeInTheDocument();
    expect(link).toHaveTextContent("2 drafts to check");
  });

  it("hides the count when there are no drafts", async () => {
    localStorage.setItem("labknow.me", "Alex Chen");
    stubApi({ "/api/records": () => jsonResponse(200, []) });

    renderApp("/ask");

    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "To review" })).toBeInTheDocument();
    expect(within(nav).queryByText(/to check/)).not.toBeInTheDocument();
  });
});
