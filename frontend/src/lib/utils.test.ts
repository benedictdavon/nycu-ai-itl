import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps the type role, the text colour and the background together", () => {
    const classes = cn("type-label text-paper", "bg-coomassie-blue").split(" ");
    expect(classes).toEqual(expect.arrayContaining(["type-label", "text-paper", "bg-coomassie-blue"]));
  });

  it("keeps the rest and hover shadows together", () => {
    const classes = cn("shadow-rest", "hover:shadow-lift").split(" ");
    expect(classes).toEqual(expect.arrayContaining(["shadow-rest", "hover:shadow-lift"]));
  });

  it("still resolves a real conflict in favour of the last class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
