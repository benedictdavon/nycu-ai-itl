import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const { show } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        show("Sent to Alex for review", "It stays in Your open questions until Alex confirms it.")
      }
    >
      Send
    </button>
  );
}

describe("Toast", () => {
  it("renders the message inside role=status when shown", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Send" }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Sent to Alex for review");
    expect(status).toHaveTextContent("It stays in Your open questions until Alex confirms it.");
  });

  it("can be dismissed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(screen.getByRole("status")).not.toHaveTextContent("Sent to Alex for review");
  });
});
