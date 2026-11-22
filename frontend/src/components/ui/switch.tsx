import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

/**
 * role="switch". The visible track is 28px tall; the invisible `before` box extends the hit area
 * to 44px.
 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-pill bg-field-edge p-1 transition-colors duration-quick ease-out before:absolute before:-inset-2 before:content-[''] data-[state=checked]:bg-coomassie-blue",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 rounded-pill bg-paper shadow-rest transition-transform duration-quick ease-out data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  );
}
