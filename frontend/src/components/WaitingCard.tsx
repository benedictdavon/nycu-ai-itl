import { useEffect, useState } from "react";
import { Card } from "./Card";

export type WaitingCardProps = {
  /** "Drafting your record" or "Finding an answer". */
  title: string;
  note?: string;
};

/**
 * The card shown while the model works: an indeterminate bar and the seconds so far. The seconds
 * line sits outside the status element, so a screen reader hears the title once, not every second.
 */
export function WaitingCard({ title, note }: WaitingCardProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <Card>
      <div role="status">
        <p className="type-title text-bench-ink">{title}</p>
      </div>
      <div aria-hidden="true" className="relative mt-4 h-2 overflow-hidden rounded-pill bg-coomassie-wash">
        <div className="absolute inset-y-0 left-0 w-2/5 rounded-pill bg-coomassie-blue animate-waiting-bar" />
      </div>
      <p className="mt-4 type-body text-bench-ink">
        <span className="font-bold tabular-nums">
          {seconds} {seconds === 1 ? "second" : "seconds"}
        </span>{" "}
        so far. It usually takes under 30.
      </p>
      {note && <p className="mt-2 type-body-small text-ink-muted">{note}</p>}
    </Card>
  );
}
