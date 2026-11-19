import { cn } from "../lib/utils";

const TITLES = new Set(["prof", "dr", "mr", "ms", "mrs"]);

/**
 * Initials for a name: the first letters of the first two words, skipping a title such as "Prof."
 * when a name is left after it. "Prof. Evan Lee" gives "EL"; "Alex Chen" gives "AC".
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const withoutTitle = words.filter((word) => !TITLES.has(word.replace(/\.$/, "").toLowerCase()));
  const used = withoutTitle.length > 0 ? withoutTitle : words;
  return used
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export type AvatarProps = {
  name: string;
  /** `current` is the coomassie wash used for the current person; `neutral` is the sage chip. */
  tone?: "current" | "neutral";
  size?: 32 | 40;
};

/** A circle with initials. It is decorative: the name is shown next to it. */
export function Avatar({ name, tone = "neutral", size = 40 }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill text-[0.875rem] font-bold",
        size === 32 ? "size-8" : "size-10",
        tone === "current" ? "bg-coomassie-wash text-coomassie-blue" : "bg-sage-chip text-bench-ink",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
