import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";

export type CheckboxProps = Omit<ComponentProps<"input">, "type"> & { label: ReactNode };

/** A native checkbox with its label. The whole label row is the 44px target. */
export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3 type-body text-bench-ink",
        className,
      )}
    >
      <input type="checkbox" className="size-5 shrink-0 accent-coomassie-blue" {...props} />
      <span>{label}</span>
    </label>
  );
}
