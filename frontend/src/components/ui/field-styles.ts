import { cn } from "../../lib/utils";

/** `gap` is the tape-edge border used for inputs inside a gap panel (DESIGN.md "In a gap panel"). */
export type FieldTone = "default" | "gap";

/** Shared look of input, textarea and select (DESIGN.md "Inputs / Fields"). */
export function fieldClasses(tone: FieldTone = "default", className?: string): string {
  return cn(
    "w-full min-h-[2.875rem] rounded-md border bg-paper px-3 py-2.5 type-body text-bench-ink placeholder:text-ink-muted",
    "aria-invalid:border-alert-red",
    tone === "gap" ? "border-tape-edge" : "border-field-edge",
    className,
  );
}
