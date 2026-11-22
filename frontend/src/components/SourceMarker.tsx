import { Link } from "react-router";
import { cn } from "../lib/utils";

/**
 * The source marker after a claim: a coomassie wash pill that links to the record it came from.
 * The pill is 26px, as in DESIGN.md; an invisible box extends the hit area to 44px.
 */
export function SourceMarker({
  n,
  recordId,
  title,
  className,
}: {
  n: number;
  recordId: number;
  title: string;
  className?: string;
}) {
  return (
    <Link
      to={`/records/${recordId}`}
      aria-label={`Source ${n}: ${title}`}
      className={cn(
        "relative inline-flex h-[1.625rem] min-w-[1.625rem] items-center justify-center rounded-pill bg-coomassie-wash px-1.5 type-label text-coomassie-blue transition-colors duration-quick ease-out hover:bg-selection before:absolute before:-inset-[9px] before:content-['']",
        className,
      )}
    >
      {n}
    </Link>
  );
}

/** The same number as a filled circle, on the matching source card. Decorative. */
export function SourceNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-coomassie-blue type-label text-paper"
    >
      {n}
    </span>
  );
}
