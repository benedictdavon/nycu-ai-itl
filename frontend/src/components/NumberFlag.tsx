import type { ReactNode } from "react";

/** A number with no source, or not in the original record: alert wash and a wavy alert underline. */
export function NumberFlag({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-tape bg-alert-wash px-1 py-px text-alert-ink underline decoration-alert-red decoration-wavy underline-offset-4">
      {children}
    </mark>
  );
}
