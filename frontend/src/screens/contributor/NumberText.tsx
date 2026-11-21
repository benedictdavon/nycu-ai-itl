import type { ReactNode } from "react";
import { NumberFlag } from "../../components/NumberFlag";
import { Button } from "../../components/ui/button";
import { findNumbers, normaliseNumber } from "../../lib/numbers";

/**
 * Text with some of its numbers marked. In "flag" mode a number whose key is in `keys` gets the
 * number flag (the draft is not in the original record). In "highlight" mode it gets a coomassie
 * mark (the original record uses it in the draft).
 */
export function NumberText({
  text,
  mode,
  keys,
}: {
  text: string;
  mode: "flag" | "highlight";
  keys: ReadonlySet<string>;
}) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of findNumbers(text)) {
    if (!keys.has(normaliseNumber(match.text))) continue;
    if (match.start > cursor) {
      parts.push(text.slice(cursor, match.start));
    }
    parts.push(
      mode === "flag" ? (
        <NumberFlag key={match.start}>{match.text}</NumberFlag>
      ) : (
        <mark
          key={match.start}
          className="rounded-tape bg-coomassie-wash px-1 py-px text-coomassie-ink"
        >
          {match.text}
        </mark>
      ),
    );
    cursor = match.end;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return <>{parts}</>;
}

/** The check panel for each unchecked number that first appears in its row (flat, alert colours). */
export function NumberPanels({
  numbers,
  onKeep,
  onRemove,
}: {
  numbers: string[];
  onKeep: (number: string) => void;
  onRemove: (number: string) => void;
}) {
  if (numbers.length === 0) return null;
  return (
    <>
      {numbers.map((number) => (
        <div
          key={number}
          role="group"
          aria-label={`Check "${number}"`}
          className="mt-3 rounded-md border border-alert-edge bg-alert-wash p-4"
        >
          <p className="type-body-small text-bench-ink">
            <strong className="font-bold">"{number}"</strong> isn't in your record or your answers.
            LabKnow may have added it from the usual protocol. Is it right?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onKeep(number)}>
              Yes, it's right
            </Button>
            <Button variant="destructive-text" onClick={() => onRemove(number)}>
              Remove it
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}
