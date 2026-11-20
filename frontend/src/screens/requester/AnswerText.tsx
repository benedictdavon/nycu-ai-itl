import ReactMarkdown, { type Components } from "react-markdown";
import type { LabRecord } from "../../api/types";
import { NumberFlag } from "../../components/NumberFlag";
import { flagUncheckedNumbers, knownNumbers, uncheckedInText } from "./numberCheck";

const components: Components = {
  mark: ({ children }) => <NumberFlag>{children}</NumberFlag>,
  p: ({ children }) => <p className="mt-3 first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="mt-1">{children}</li>,
};

/** The answer or hint text as markdown (no raw HTML), with unchecked numbers flagged. */
export function AnswerText({ text, records }: { text: string; records: LabRecord[] }) {
  return (
    <div className="max-w-[66ch] type-body text-bench-ink">
      <ReactMarkdown components={components} rehypePlugins={[flagUncheckedNumbers(knownNumbers(records))]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** One flat panel per number that no source record contains (SCREENS.md section 6). */
export function NoSourcePanels({ text, records }: { text: string; records: LabRecord[] }) {
  const numbers = uncheckedInText(text, records);
  if (numbers.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {numbers.map((number) => (
        <div
          key={number}
          className="rounded-md border border-alert-edge bg-alert-wash p-4 type-body text-alert-ink"
        >
          <p>
            <b>{`No source for "${number}".`}</b> None of the records LabKnow found says this. Don&apos;t
            use it without checking.
          </p>
        </div>
      ))}
    </div>
  );
}
