import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { fieldClasses, type FieldTone } from "./field-styles";

export type TextareaProps = ComponentProps<"textarea"> & { tone?: FieldTone };

export function Textarea({ className, tone, ...props }: TextareaProps) {
  return <textarea className={cn(fieldClasses(tone, cn("resize-y", className)))} {...props} />;
}
