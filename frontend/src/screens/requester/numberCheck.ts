import type { LabRecord } from "../../api/types";
import { findNumbers, normaliseNumber, uncheckedNumbers } from "../../lib/numbers";

/**
 * The text of the records an answer can draw on: procedure, based on, each change and the
 * troubleshooting. Gaps and tags are left out (SCREENS.md section 6).
 */
export function sourceTexts(records: LabRecord[]): string[] {
  return records
    .flatMap((record) => [
      record.procedure,
      record.based_on ?? "",
      ...record.changes.flatMap((change) => [change.what, change.reason ?? ""]),
      record.troubleshooting ?? "",
    ])
    .filter((text) => text.length > 0);
}

/** The normalised numbers that appear in the source records. */
export function knownNumbers(records: LabRecord[]): Set<string> {
  return new Set(
    sourceTexts(records).flatMap((text) => findNumbers(text).map((match) => normaliseNumber(match.text))),
  );
}

/** The numbers in `text` that no source record contains, in order of first appearance. */
export function uncheckedInText(text: string, records: LabRecord[]): string[] {
  return uncheckedNumbers([text], sourceTexts(records));
}

// The subset of the hast tree this plugin reads and writes.
type HastNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function splitText(value: string, known: Set<string>): HastNode[] {
  const nodes: HastNode[] = [];
  let cursor = 0;
  for (const match of findNumbers(value)) {
    if (known.has(normaliseNumber(match.text))) continue;
    if (match.start > cursor) {
      nodes.push({ type: "text", value: value.slice(cursor, match.start) });
    }
    nodes.push({ type: "element", tagName: "mark", properties: {}, children: [{ type: "text", value: match.text }] });
    cursor = match.end;
  }
  if (nodes.length === 0) return [{ type: "text", value }];
  if (cursor < value.length) {
    nodes.push({ type: "text", value: value.slice(cursor) });
  }
  return nodes;
}

/**
 * A rehype plugin: wraps every number in the rendered answer that no source contains in a `mark`
 * element. The answer components render `mark` as NumberFlag.
 */
export function flagUncheckedNumbers(known: Set<string>) {
  const visit = (node: HastNode): void => {
    if (!node.children) return;
    node.children = node.children.flatMap((child) => {
      if (child.type === "text" && child.value !== undefined) {
        return splitText(child.value, known);
      }
      visit(child);
      return [child];
    });
  };
  // A unified plugin is an attacher: it returns the transformer that receives the tree.
  return () => (tree: HastNode) => {
    visit(tree);
  };
}
