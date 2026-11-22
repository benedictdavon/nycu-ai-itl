import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup", () => {
  it("renders with nothing selected when no value is given", () => {
    render(
      <RadioGroup aria-label="Want to ask a person?">
        <RadioGroupItem value="suggest">Suggest someone</RadioGroupItem>
        <RadioGroupItem value="choose">I&apos;ll choose</RadioGroupItem>
      </RadioGroup>,
    );

    expect(screen.getByRole("radiogroup", { name: "Want to ask a person?" })).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    for (const radio of radios) {
      expect(radio).toHaveAttribute("aria-checked", "false");
    }
  });

  it("selects the item named by value", () => {
    render(
      <RadioGroup aria-label="Want to ask a person?" value="choose">
        <RadioGroupItem value="suggest">Suggest someone</RadioGroupItem>
        <RadioGroupItem value="choose">I&apos;ll choose</RadioGroupItem>
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "I'll choose" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Suggest someone" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
