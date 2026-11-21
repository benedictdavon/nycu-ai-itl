import type { ReactNode } from "react";

export type ErrorCardProps = {
  title: string;
  /** Optional body text. */
  children?: ReactNode;
  /** Optional action, such as a "Try again" button. */
  action?: ReactNode;
};

/** An error panel. It is announced at once because it has role="alert". */
export function ErrorCard({ title, children, action }: ErrorCardProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border-2 border-alert-red bg-paper p-5 sm:px-8 sm:py-7"
    >
      <h2 className="type-title text-alert-ink">{title}</h2>
      {children && <div className="mt-2 type-body text-bench-ink">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
