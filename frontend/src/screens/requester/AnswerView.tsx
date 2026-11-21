import type { ReactNode } from "react";
import { Link } from "react-router";
import type { AskResponse } from "../../api/types";
import { Card } from "../../components/Card";
import { GapPanel } from "../../components/GapPanel";
import { SourceMarker } from "../../components/SourceMarker";
import { TapeLabel } from "../../components/TapeLabel";
import { Button, buttonVariants } from "../../components/ui/button";
import { AnswerText, NoSourcePanels } from "./AnswerText";
import { joinNames } from "./names";

export type AnswerViewProps = {
  question: string;
  hintMode: boolean;
  response: AskResponse;
  /** True when listRecords for confirmed records came back empty (first use). */
  noConfirmed: boolean;
  helpOpen: boolean;
  onToggleHelp: () => void;
  onShowFull: () => void;
  /** A request is running: disable the controls that send another one. */
  busy: boolean;
  helpStep: ReactNode;
};

/**
 * One answer: the full answer (Answer), the hints (Hints), or the "not enough" layout. Each is a
 * card; the help step is a card of its own below it. On "not enough" the help step always shows.
 */
export function AnswerView({
  question,
  hintMode,
  response,
  noConfirmed,
  helpOpen,
  onToggleHelp,
  onShowFull,
  busy,
  helpStep,
}: AnswerViewProps) {
  const { answer, sources } = response;
  const countLabel = `${sources.length} confirmed ${sources.length === 1 ? "record" : "records"}`;
  const from = `From ${countLabel} by ${joinNames(answer.contributors)}`;

  const markers =
    sources.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {sources.map((record, index) => (
          <SourceMarker key={record.id} n={index + 1} recordId={record.id} title={record.procedure} />
        ))}
      </div>
    ) : null;

  if (answer.kind === "insufficient") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-6">
          <div className="rounded-lg bg-tape-wash p-5">
            <TapeLabel>Not enough in the records</TapeLabel>
            <h2 className="mt-3 type-headline text-tape-ink">{`The records don't answer "${question}"`}</h2>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="type-headline text-bench-ink">What the records do say</h2>
            <AnswerText text={answer.text} records={sources} />
            {!hintMode && markers}
            <NoSourcePanels text={answer.text} records={sources} />
          </section>

          {answer.uncertainties.length > 0 && (
            <GapPanel label="Not recorded" heading="What's uncertain">
              <ul className="list-disc pl-5 type-body">
                {answer.uncertainties.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </GapPanel>
          )}

          {noConfirmed && (
            <div>
              <Link to="/add" className={buttonVariants({ variant: "secondary" })}>
                Add a record
              </Link>
            </div>
          )}
        </Card>

        <Card>{helpStep}</Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="type-headline text-bench-ink">{hintMode ? "Hints" : "Answer"}</h2>
          <p className="type-body-small text-ink-secondary">
            {hintMode ? from : `${from}. Each fact links to the record it came from.`}
          </p>
          <AnswerText text={answer.text} records={sources} />
          {!hintMode && markers}
          <NoSourcePanels text={answer.text} records={sources} />
        </section>

        {answer.uncertainties.length > 0 && (
          <GapPanel label="Not recorded" heading="What the records don't say">
            <ul className="list-disc pl-5 type-body">
              {answer.uncertainties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </GapPanel>
        )}

        {hintMode && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="secondary" onClick={onShowFull} disabled={busy}>
              Show the full answer
            </Button>
            <p className="type-body-small text-ink-muted">Asks again, up to 30 seconds</p>
          </div>
        )}

        <div>
          <Button variant="text" aria-expanded={helpOpen} onClick={onToggleHelp}>
            Still stuck? Ask a person
          </Button>
        </div>
      </Card>

      {helpOpen && <Card>{helpStep}</Card>}
    </div>
  );
}
