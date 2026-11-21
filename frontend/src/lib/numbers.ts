/**
 * Client-side number check (SCREENS.md section 4). It finds numbers with units in a draft or an
 * answer, so the screens can flag any number that is not in the original record. The lists below
 * are deliberately short; they cover the units the lab uses.
 */

export type NumberMatch = { text: string; start: number; end: number };

// µ is the micro sign and μ is the Greek mu. Both are written as escapes so they are not
// confused on screen.
const MASS = ["ng", "µg", "μg", "ug", "mg", "kg", "g"];
const VOLUME = [
  "µL",
  "µl",
  "μL",
  "μl",
  "uL",
  "ul",
  "mL",
  "ml",
  "L",
  "l",
];
const MOLAR = ["nM", "µM", "μM", "uM", "mM", "M"];
const TIME = [
  "seconds",
  "second",
  "secs",
  "sec",
  "s",
  "minutes",
  "minute",
  "mins",
  "min",
  "hours",
  "hour",
  "hrs",
  "hr",
  "h",
  "days",
  "day",
];
const OTHER = ["rpm", "bp", "kDa", "kb", "V", "U", "%"];

// Longest first, so "hours" is tried before "hour" and "h".
const WORD_UNITS = [...MASS, ...VOLUME, ...MOLAR, ...TIME, ...OTHER].sort(
  (a, b) => b.length - a.length,
);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const UNIT_PATTERN = [
  ...WORD_UNITS.map(escapeRegExp),
  "[°º]\\s?[Cc]", // 37 °C, 37 ° C, 37 ºC
  "[x×]\\s?g", // 10 x g, 10 ×g
].join("|");

// A number that is not part of a longer word or number, then either a unit (with optional space)
// or x / × directly after it (for example "2x"). The unit must end at a word boundary.
const NUMBER_WITH_UNIT = new RegExp(
  `(?<![\\w.])(\\d+(?:\\.\\d+)?)(?:\\s*(?:${UNIT_PATTERN})(?!\\w)|[x×](?!\\w))`,
  "g",
);

export function findNumbers(text: string): NumberMatch[] {
  return [...text.matchAll(NUMBER_WITH_UNIT)].map((match) => {
    const start = match.index ?? 0;
    return { text: match[0], start, end: start + match[0].length };
  });
}

const UNIT_ALIASES = new Map<string, string>([
  ["hour", "h"],
  ["hours", "h"],
  ["hr", "h"],
  ["hrs", "h"],
  ["minute", "min"],
  ["minutes", "min"],
  ["mins", "min"],
  ["second", "s"],
  ["seconds", "s"],
  ["sec", "s"],
  ["secs", "s"],
]);

/** A comparable form of a number with unit: "1 hour" and "1 h" give the same result. */
export function normaliseNumber(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/×/g, "x")
    .replace(/º/g, "°")
    .replace(/[μu](?=[lgm])/g, "µ");
  const parts = /^(\d+(?:\.\d+)?)(.*)$/.exec(cleaned);
  if (!parts) return cleaned;
  const [, amount, unit] = parts;
  return amount + (UNIT_ALIASES.get(unit) ?? unit);
}

/**
 * The numbers found in `fields` that do not appear in `sources`. Each number is listed once, in
 * order of first appearance, in its original spelling.
 */
export function uncheckedNumbers(fields: string[], sources: string[]): string[] {
  const known = new Set(
    sources.flatMap((source) => findNumbers(source).map((match) => normaliseNumber(match.text))),
  );
  const seen = new Set<string>();
  const unchecked: string[] = [];
  for (const field of fields) {
    for (const match of findNumbers(field)) {
      const key = normaliseNumber(match.text);
      if (known.has(key) || seen.has(key)) continue;
      seen.add(key);
      unchecked.push(match.text);
    }
  }
  return unchecked;
}
