import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ApiError, answerFollowUp, getInfo } from "../../api/client";
import type { EncodeState } from "../../api/types";
import { Card } from "../../components/Card";
import { ErrorCard } from "../../components/ErrorCard";
import { Field } from "../../components/Field";
import { Page } from "../../components/Page";
import { TwoColumn } from "../../components/TwoColumn";
import { WaitingCard } from "../../components/WaitingCard";
import { Button, buttonVariants } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";

/** Sent when the contributor skips a question (SCREENS.md section 3, fallback for item 4). */
const SKIP_ANSWER = "I don't know";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; state: EncodeState }
  | { status: "error" };

type SendFailure = { kind: "model" } | { kind: "other" };

/** Follow-up question: /add/:infoId. One question at a time, at most two (SCREENS.md section 3). */
export default function FollowUpScreen() {
  const { infoId } = useParams();
  const id = Number(infoId);
  const navigate = useNavigate();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [answer, setAnswer] = useState("");
  const [answerError, setAnswerError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<SendFailure | null>(null);
  // The answer that was last sent, so "Try again" sends the same thing (the skip is not typed).
  const [lastSent, setLastSent] = useState("");

  useEffect(() => {
    let active = true;
    getInfo(id).then(
      (state) => {
        if (!active) return;
        if (state.result.kind === "draft" && state.record_id !== null) {
          navigate(`/review/${state.record_id}`, { replace: true, state: { fromAdd: true } });
          return;
        }
        setLoad({ status: "ready", state });
      },
      () => {
        if (active) setLoad({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [id, navigate]);

  function send(value: string) {
    if (pending) return;
    setAnswerError(undefined);
    setFailure(null);
    setPending(true);
    setLastSent(value);
    answerFollowUp(id, { answer: value }).then(
      (state) => {
        if (state.result.kind === "draft" && state.record_id !== null) {
          navigate(`/review/${state.record_id}`, { state: { fromAdd: true } });
          return;
        }
        setLoad({ status: "ready", state });
        setAnswer("");
        setPending(false);
      },
      (err: unknown) => {
        setPending(false);
        if (err instanceof ApiError && err.status === 422) {
          // The server rejected the answer: show the field message, with the input kept.
          setAnswerError("Type an answer, or skip the question.");
          return;
        }
        setFailure(err instanceof ApiError && err.status === 503 ? { kind: "model" } : { kind: "other" });
      },
    );
  }

  if (load.status === "loading") {
    return (
      <Page>
        <Card aria-busy="true" className="space-y-4">
          {[0, 1].map((row) => (
            <div key={row} aria-hidden="true" className="h-5 w-2/3 rounded-md bg-bench-grey" />
          ))}
        </Card>
      </Page>
    );
  }

  if (load.status === "error") {
    return (
      <Page>
        <ErrorCard
          title="Couldn't load this question"
          action={
            <Link to="/inbox" className={buttonVariants({ variant: "secondary" })}>
              Go to To review
            </Link>
          }
        />
      </Page>
    );
  }

  const { state } = load;
  const answered = state.follow_ups.filter((followUp) => followUp.answer !== null).length;
  const step = answered + 1;
  const { info } = state;

  const failureView =
    failure?.kind === "model" ? (
      <ErrorCard
        title="Can't reach the model"
        action={
          <Button variant="secondary" onClick={() => send(lastSent)}>
            Try again
          </Button>
        }
      >
        What you typed is still in the form. Try again in a minute. If it keeps failing, the model
        server may be down.
      </ErrorCard>
    ) : failure?.kind === "other" ? (
      <ErrorCard
        title="Couldn't send your answer"
        action={
          <Button variant="secondary" onClick={() => send(lastSent)}>
            Try again
          </Button>
        }
      />
    ) : null;

  const main = (
    <>
      {pending && (
        <div className="mb-6">
          <WaitingCard title="Drafting your record" />
        </div>
      )}
      {failureView && <div className="mb-6">{failureView}</div>}

      <section
        aria-labelledby="follow-up-question"
        className="rounded-lg border border-hairline bg-paper p-5 shadow-rest sm:px-8 sm:py-8"
      >
        <p className="type-body-small text-ink-muted">LabKnow has a question about your record</p>
        <h1 id="follow-up-question" className="mt-2 max-w-[28ch] type-display text-bench-ink">
          {state.result.question}
        </h1>

        <form
          noValidate
          className="mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (answer.trim() === "") {
              setAnswerError("Type an answer, or skip the question.");
              return;
            }
            send(answer.trim());
          }}
        >
          <Field
            label="Your answer"
            hint="Don't know? Skip it. It becomes a gap you can fill in on the next screen. You can also leave and come back: the question waits in To review."
            error={answerError}
          >
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
              />
            )}
          </Field>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={pending}>
              Send answer
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => send(SKIP_ANSWER)}
            >
              Skip this question
            </Button>
          </div>
        </form>
      </section>
    </>
  );

  const side = (
    <>
      <h2 className="type-headline text-bench-ink">Your record</h2>
      <Card className="mt-3">
        <p className="type-title text-bench-ink">{info.title}</p>
        <p className="mt-2 whitespace-pre-wrap type-body-small text-ink-secondary">{info.text}</p>
        {info.link && (
          <p className="mt-3">
            <a
              href={info.link}
              className="inline-flex min-h-11 items-center type-label text-coomassie-blue underline-offset-4 hover:underline"
            >
              Open in Benchling
            </a>
          </p>
        )}
      </Card>
    </>
  );

  return (
    <Page>
      <ol
        aria-label="Progress"
        className="flex flex-wrap items-center gap-x-7 gap-y-2 type-body-small text-ink-secondary"
      >
        <li className="inline-flex items-center gap-2">
          <Check aria-hidden="true" className="size-5 text-coomassie-blue" />
          Record added
        </li>
        <li aria-current="step" className="inline-flex items-center gap-2 font-bold text-coomassie-blue">
          <span aria-hidden="true" className="size-2.5 rounded-pill bg-coomassie-blue" />
          Question {step} of at most 2
        </li>
        <li className="inline-flex items-center gap-2 text-ink-muted">
          <span aria-hidden="true" className="size-2.5 rounded-pill border-2 border-field-edge" />
          Check the draft
        </li>
      </ol>
      <div className="mt-7">
        <TwoColumn main={main} side={side} />
      </div>
    </Page>
  );
}
