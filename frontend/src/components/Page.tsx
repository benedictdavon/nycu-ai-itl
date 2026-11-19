import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/** The page container: 1160px max, centred, 16px side padding on phones and 24px above 640px. */
export function Page({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-page px-4 py-8 sm:px-6 sm:py-10", className)}
      {...props}
    />
  );
}
