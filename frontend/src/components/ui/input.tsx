import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import { fieldClasses, type FieldTone } from "./field-styles";

export type InputProps = ComponentProps<"input"> & { tone?: FieldTone };

export function Input({ className, tone, type = "text", ...props }: InputProps) {
  return <input type={type} className={cn(fieldClasses(tone, className))} {...props} />;
}
