import type { ReactNode } from "react";

/** The missing-information tag: label tape, 4px corners, 28px tall ("Not recorded", "2 gaps"). */
export function TapeLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-7 items-center rounded-tape bg-label-tape px-2.5 type-label text-tape-ink">
      {children}
    </span>
  );
}
