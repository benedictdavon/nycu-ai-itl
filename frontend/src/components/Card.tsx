import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type CardProps = ComponentProps<"div"> & {
  /** Clickable cards lift on hover and focus. */
  interactive?: boolean;
};

/** A paper panel on the bench: 1px hairline, 16px corners, rest shadow, 20px padding below 640px. */
export function Card({ interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-hairline bg-paper p-5 shadow-rest sm:px-8 sm:py-7",
        interactive && "transition-shadow duration-quick ease-out hover:shadow-lift focus-within:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}

/** The action bar at the foot of a card: paper sunk, with a rule above it. */
export function CardActionBar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-mx-5 -mb-5 flex flex-wrap items-center justify-end gap-3 rounded-b-lg border-t border-rule bg-paper-sunk px-5 py-4 sm:-mx-8 sm:-mb-7 sm:px-8",
        className,
      )}
      {...props}
    />
  );
}
