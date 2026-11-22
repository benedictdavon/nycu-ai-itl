import type { ReactNode } from "react";
import { cn } from "../lib/utils";

/**
 * Main content plus a side column (DESIGN.md "Layout"). Main is flex 999 1 560px and the side is
 * flex 1 1 320px, with a 32px gap. Below about 912px the side column wraps under the main column.
 * `stickySide` keeps the side column in view while the main column scrolls, on desktop only. It
 * sticks the flex item itself, since a wrapper inside it would not stick.
 */
export function TwoColumn({
  main,
  side,
  stickySide = false,
}: {
  main: ReactNode;
  side?: ReactNode;
  stickySide?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-8">
      <div className="min-w-0 flex-[999_1_560px]">{main}</div>
      {side && (
        <div className={cn("min-w-0 flex-[1_1_320px]", stickySide && "lg:sticky lg:top-6")}>{side}</div>
      )}
    </div>
  );
}
