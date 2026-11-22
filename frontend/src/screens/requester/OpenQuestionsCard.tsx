import { Link } from "react-router";
import { Card } from "../../components/Card";
import { Button } from "../../components/ui/button";
import { discussionPath, type OpenQuestion } from "./openQuestions";
import { linkClass } from "./linkStyles";

/** "Your open questions": questions this person took to a labmate, and saved discussions waiting. */
export function OpenQuestionsCard({
  entries,
  onNotSolved,
}: {
  entries: OpenQuestion[];
  onNotSolved: (entry: OpenQuestion) => void;
}) {
  return (
    <Card>
      <h2 className="type-headline text-bench-ink">Your open questions</h2>
      <ul className="mt-4 flex flex-col gap-5">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-col gap-2 border-t border-hairline pt-5 first:border-t-0 first:pt-0">
            <p className="type-title text-bench-ink">{entry.question}</p>
            {entry.status === "waiting" ? (
              <p className="type-body-small text-ink-secondary">
                Saved. Waiting for {entry.person ?? "the person"} to confirm it.
              </p>
            ) : (
              <>
                <p className="type-body-small text-ink-secondary">You&apos;re asking {entry.person}</p>
                <div className="flex flex-wrap items-center gap-x-5">
                  <Link to={discussionPath(entry.question, entry.person ?? "")} className={linkClass}>
                    Save the answer
                  </Link>
                  <Button variant="text" onClick={() => onNotSolved(entry)}>
                    Not solved
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
