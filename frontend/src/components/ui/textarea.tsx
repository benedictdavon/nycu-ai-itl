import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { fieldClasses, type FieldTone } from "./field-styles";

export type TextareaProps = ComponentProps<"textarea"> & { tone?: FieldTone };

export function Textarea({ className, tone, ...props }: TextareaProps) {
  // Grows with its text where the browser supports field-sizing, from about three lines up to
  // max-h-80, then scrolls. resize-y still lets browsers without it be resized by hand.
  return (
    <textarea
      className={cn(
        fieldClasses(tone, cn("field-sizing-content min-h-[6.25rem] max-h-80 resize-y", className)),
      )}
      {...props}
    />
  );
}
