import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonChip, TagChip } from "./Chip";

describe("TagChip", () => {
  it("uses symmetric padding when there is no remove button", () => {
    render(<TagChip label="Plasmid" />);

    const chip = screen.getByText("Plasmid");
    expect(chip).toHaveClass("px-3");
    expect(chip).not.toHaveClass("pl-3");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reserves room on the right for the remove button when there is one", () => {
    render(<TagChip label="Plasmid" onRemove={vi.fn()} />);

    const chip = screen.getByText("Plasmid");
    expect(chip).toHaveClass("pl-3", "pr-0.5");
    expect(chip).not.toHaveClass("px-3");
    expect(screen.getByRole("button", { name: "Remove Plasmid" })).toBeInTheDocument();
  });

});

describe("PersonChip", () => {
  it("uses symmetric padding when it is neither locked nor removable", () => {
    render(<PersonChip name="Alex Chen" />);

    const chip = screen.getByText("Alex Chen");
    expect(chip).toHaveClass("px-3");
    expect(chip).not.toHaveClass("pl-3");
  });
});
