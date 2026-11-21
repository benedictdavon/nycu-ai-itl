import { useId, type ReactNode } from "react";
import { TapeLabel } from "./TapeLabel";

export type GapPanelProps = {
  /** The tape label. */
  label?: string;
  /** A short heading, such as "What the records don't say". */
  heading: string;
  children?: ReactNode;
};

/** Everything missing, the same way on every screen: tape wash, flat, opened by a tape label. */
export function GapPanel({ label = "Not recorded", heading, children }: GapPanelProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-lg bg-tape-wash p-5 text-tape-text">
      <div className="flex flex-wrap items-center gap-2.5">
        <TapeLabel>{label}</TapeLabel>
        <h2 id={headingId} className="type-title text-tape-ink">
          {heading}
        </h2>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
