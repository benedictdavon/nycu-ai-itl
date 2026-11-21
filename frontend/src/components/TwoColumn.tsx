import type { ReactNode } from "react";

/**
 * Main content plus a side column (DESIGN.md "Layout"). Main is flex 999 1 560px and the side is
 * flex 1 1 320px, with a 32px gap. Below about 912px the side column wraps under the main column.
 */
export function TwoColumn({ main, side }: { main: ReactNode; side?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="min-w-0 flex-[999_1_560px]">{main}</div>
      {side && <div className="min-w-0 flex-[1_1_320px]">{side}</div>}
    </div>
  );
}
