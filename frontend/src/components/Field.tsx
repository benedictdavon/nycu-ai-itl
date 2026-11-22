import { useId, type ReactNode } from "react";
import { cn } from "../lib/utils";
import { Label } from "./ui/label";

/** The attributes a control needs to be wired to its label, hint and error. */
export type FieldControl = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (control: FieldControl) => ReactNode;
};

/**
 * A label above a control, with an optional hint and an error under it. The control is passed in
 * through `children`, which receives the id and aria attributes to put on it.
 */
export function Field({ label, optional, hint, error, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="type-body-small text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="type-body-small text-alert-ink">
          {error}
        </p>
      )}
    </div>
  );
}
