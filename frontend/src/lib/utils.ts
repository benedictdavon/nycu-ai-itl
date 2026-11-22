import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn's class helper: joins classes and resolves Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * A change's reason, split so it reads as one sentence after "Because ". The model sometimes
 * starts the reason with "because" (no "Because because") or gives a purpose ("to reduce …"),
 * which is shown on its own, capitalised.
 */
export function reasonParts(reason: string): { lead: string; text: string } {
  const text = reason.trim();
  const because = /^because\s+/i.exec(text);
  if (because) return { lead: "Because ", text: text.slice(because[0].length) };
  if (/^(to|so|in order to)\s/i.test(text)) {
    return { lead: "", text: text.charAt(0).toUpperCase() + text.slice(1) };
  }
  return { lead: "Because ", text };
}
