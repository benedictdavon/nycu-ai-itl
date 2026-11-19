import { Plus, X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

/** Project tag: a sage chip with an optional 32px remove button. */
export function TagChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-9 items-center gap-0.5 rounded-pill bg-sage-chip py-0.5 pr-0.5 pl-3 type-label text-bench-ink">
      {label}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-pill text-ink-secondary enabled:hover:bg-rule"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </span>
  );
}

/**
 * A person chip. `locked` is the uploader's own chip: it has no remove control and says so.
 */
export function PersonChip({
  name,
  locked = false,
  onRemove,
}: {
  name: string;
  locked?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex h-9 items-center gap-0.5 rounded-pill bg-coomassie-wash py-0.5 pr-0.5 pl-3 type-label text-bench-ink">
      {name}
      {locked ? (
        <span className="pr-2.5 font-normal text-ink-secondary">(you, always kept)</span>
      ) : (
        onRemove && (
          <button
            type="button"
            aria-label={`Remove ${name}`}
            onClick={onRemove}
            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-pill text-ink-secondary enabled:hover:bg-rule"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        )
      )}
    </span>
  );
}

/** "Add someone", "Add a tag": a paper button with a dashed border and a plus icon. */
export function AddChip({
  label,
  className,
  type = "button",
  ...props
}: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-dashed border-field-edge bg-paper px-3.5 type-label text-bench-ink transition-colors duration-quick ease-out enabled:hover:bg-paper-sunk",
        className,
      )}
      {...props}
    >
      <Plus aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
