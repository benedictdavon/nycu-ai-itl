import { describe, expect, it } from "vitest";
import { buildMessage, stripMarkdown } from "./message";

describe("buildMessage", () => {
  it("follows the template, with the uncertainties as a list", () => {
    const message = buildMessage({
      person: "Alex Chen",
      question: "Why did the cells clump?",
      answerText: "The cells clumped with the **SOP** wash volume.",
      uncertainties: ["The plasmid amount.", "The plate."],
    });
    expect(message).toBe(
      [
        "Hi Alex! I have a question: Why did the cells clump?",
        "",
        "The records in LabKnow say: The cells clumped with the SOP wash volume.",
        "",
        "They don't say:",
        "- The plasmid amount.",
        "- The plate.",
        "",
        "Do you know?",
      ].join("\n"),
    );
  });

  it("leaves out the uncertainty part when there are none", () => {
    const message = buildMessage({ person: "Prof. Evan Lee", question: "Q?", answerText: "A.", uncertainties: [] });
    expect(message).toBe(
      ["Hi Evan! I have a question: Q?", "", "The records in LabKnow say: A.", "", "Do you know?"].join("\n"),
    );
  });

  it("strips markdown marks", () => {
    expect(stripMarkdown("# Title\n_em_ and `code`")).toBe("Title\nem and code");
  });
});
