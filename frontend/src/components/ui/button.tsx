import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md type-label transition-colors duration-quick ease-out disabled:cursor-not-allowed disabled:bg-rule disabled:text-ink-secondary",
  {
    variants: {
      variant: {
        primary:
          "min-h-12 bg-coomassie-blue px-[22px] text-paper enabled:hover:bg-coomassie-deep",
        secondary:
          "min-h-12 border border-field-edge bg-paper px-5 text-bench-ink enabled:hover:bg-paper-sunk",
        text: "min-h-11 bg-transparent px-3 text-coomassie-blue enabled:hover:bg-paper-sunk",
        "destructive-text":
          "min-h-11 bg-transparent px-3 text-alert-ink enabled:hover:bg-alert-wash",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

/** A real button. It is `type="button"` unless a form asks for another type. */
export function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
