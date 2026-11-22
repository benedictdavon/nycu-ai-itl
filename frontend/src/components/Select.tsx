import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { fieldClasses, type FieldTone } from "./ui/field-styles";

export type SelectProps = ComponentProps<"select"> & { tone?: FieldTone };

/** A native select, styled like Input. */
export function Select({ className, tone, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={fieldClasses(tone, cn("cursor-pointer appearance-none pr-10", className))}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-secondary"
      />
    </div>
  );
}
