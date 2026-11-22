import { describe, expect, it } from "vitest";
import { findNumbers, normaliseNumber, uncheckedNumbers } from "./numbers";

const found = (text: string) => findNumbers(text).map((match) => match.text);

describe("findNumbers", () => {
  it.each([
    ["Add 50 ng of plasmid", "50 ng"],
    ["Incubate for 1 h", "1 h"],
    ["Grow at 37 °C", "37 °C"],
    ["Dilute 2x in buffer", "2x"],
  ])("finds the number with unit in %s", (text, expected) => {
    expect(found(text)).toEqual([expected]);
  });

  it.each(["37 ° C", "37 ºC", "37°C", "37 C", "37C"])("accepts the temperature spelling %s", (spelling) => {
    expect(found(`Hold at ${spelling} overnight`)).toEqual([spelling]);
  });

  it.each([
    "10 µL",
    "10 μL",
    "10 uL",
    "5 mL",
    "5 ml",
    "2 L",
    "3 nM",
    "2 µM",
    "5 mM",
    "1 M",
    "50 ng",
    "3 µg",
    "4 mg",
    "1 kg",
    "9 g",
    "10 x g",
    "10 ×g",
    "500 rpm",
    "5 %",
    "3 V",
    "100 bp",
    "2 kb",
    "1.5 kDa",
    "4 U",
    "30 seconds",
    "2 sec",
    "3 days",
    "15 min",
    "2 hrs",
  ])("recognises the unit in %s", (value) => {
    expect(found(`Use ${value} here`)).toEqual([value]);
  });

  it("records where each match starts and ends", () => {
    expect(findNumbers("Add 50 ng now")).toEqual([{ text: "50 ng", start: 4, end: 9 }]);
  });

  it("requires the unit to end at a word boundary", () => {
    expect(found("Wait 5 mint")).toEqual([]);
    expect(found("Wait 5 min")).toEqual(["5 min"]);
  });

  it("does not match a plain number with no unit", () => {
    expect(found("step 3 of the protocol")).toEqual([]);
    expect(found("Run 3 times")).toEqual([]);
  });
});

describe("normaliseNumber", () => {
  it("treats hour and h as the same unit", () => {
    expect(normaliseNumber("1 hour")).toBe(normaliseNumber("1 h"));
    expect(normaliseNumber("2 hrs")).toBe(normaliseNumber("2 h"));
  });

  it("ignores spaces and case", () => {
    expect(normaliseNumber("50ng")).toBe(normaliseNumber("50 ng"));
    expect(normaliseNumber("1 mL")).toBe(normaliseNumber("1 ml"));
  });

  it("maps the micro and mu variants to one spelling", () => {
    expect(normaliseNumber("10 μL")).toBe(normaliseNumber("10 µL"));
    expect(normaliseNumber("10 uL")).toBe(normaliseNumber("10 µL"));
  });

  it("maps the degree and multiplication variants", () => {
    expect(normaliseNumber("37 ºC")).toBe(normaliseNumber("37 °C"));
    expect(normaliseNumber("62 C")).toBe(normaliseNumber("62°C"));
    expect(normaliseNumber("2 ×")).toBe(normaliseNumber("2x"));
  });

  it("maps minute and second aliases", () => {
    expect(normaliseNumber("5 mins")).toBe(normaliseNumber("5 min"));
    expect(normaliseNumber("2 seconds")).toBe(normaliseNumber("2 s"));
    expect(normaliseNumber("2 sec")).toBe(normaliseNumber("2 s"));
  });
});

describe("uncheckedNumbers", () => {
  it("returns the numbers in the draft that the record and answers do not contain", () => {
    const draftFields = ["Use 50 ng of plasmid", "Incubate 1 h at 37 °C"];
    const sources = ["Transformation: 50 ng plasmid, then 1 hour at 30 °C"];
    expect(uncheckedNumbers(draftFields, sources)).toEqual(["37 °C"]);
  });

  it("lists each unchecked number once, in order of first appearance, as written", () => {
    expect(uncheckedNumbers(["2 mL, then 5 min, then 2 mL"], ["nothing here"])).toEqual([
      "2 mL",
      "5 min",
    ]);
  });

  it("returns nothing when every number is in a source", () => {
    expect(uncheckedNumbers(["1 hour"], ["Wait 1 h"])).toEqual([]);
  });

  it("matches a temperature written without the degree sign in the source", () => {
    expect(uncheckedNumbers(["Anneal at 62°C"], ["Changed annealing to 62 C"])).toEqual([]);
  });
});
