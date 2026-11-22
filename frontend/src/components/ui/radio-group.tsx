import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/**
 * role="radiogroup". Nothing is selected unless `value` names an item, so pass `value=""` or leave
 * `value` out to start with no choice (DESIGN.md "Radio choice").
 */
export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-pill border-2 border-coomassie-blue bg-paper px-5 type-label text-bench-ink transition-colors duration-quick ease-out enabled:hover:bg-coomassie-wash data-[state=checked]:bg-coomassie-blue data-[state=checked]:text-paper",
        className,
      )}
      {...props}
    />
  );
}
