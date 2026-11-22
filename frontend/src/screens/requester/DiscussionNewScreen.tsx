import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ApiError, createDiscussion, errorFields } from "../../api/client";
import { Card } from "../../components/Card";
import { Checkbox } from "../../components/Checkbox";
import { ErrorCard } from "../../components/ErrorCard";
import { Field } from "../../components/Field";
import { Page } from "../../components/Page";
import { Select } from "../../components/Select";
import { TwoColumn } from "../../components/TwoColumn";
import { useToast } from "../../components/Toast";
import { WaitingCard } from "../../components/WaitingCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useMembers } from "../../lib/useMembers";
import { linkClass } from "./linkStyles";
import { useCurrentMe } from "./useCurrentMe";
import { firstName } from "./names";
import { loadOpenQuestions, markWaiting, saveOpenQuestions } from "./openQuestions";

type FieldErrors = { question?: string; text?: string; contributor?: string };
type Failure = "unreachable" | "failed" | null;

const STEPS = [
  "LabKnow drafts a record from the discussion. It won't ask you any questions.",
  "The draft appears in {who}'s To review list. {who} fixes it, fills any gaps and confirms.",
  "Then it's searchable. The next person who asks the same question gets {who}'s answer.",
];

function fieldErrors(fields: string[]): FieldErrors {
  const errors: FieldErrors = {};
  if (fields.includes("question")) errors.question = "Type at least 3 characters.";
  if (fields.includes("text")) errors.text = "Add the discussion text.";
  if (fields.includes("contributor")) errors.contributor = "Choose who answered it first.";
  return errors;
}

/** Save the discussion: /discussions/new (SCREENS.md section 8). */
export default function DiscussionNewScreen() {
  const me = useCurrentMe();
  const navigate = useNavigate();
  const { show } = useToast();
  const { members } = useMembers();
  const [params] = useSearchParams();
  const checkId = useId();
  const checkHintId = useId();

  const [question, setQuestion] = useState(() => params.get("q") ?? "");
  const [contributor, setContributor] = useState(() => params.get("contributor") ?? "");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);

  const choices = members.filter((name) => name !== me);
  const options = contributor && !choices.includes(contributor) ? [contributor, ...choices] : choices;
  const who = contributor ? firstName(contributor) : "the person";
  const leadName = contributor ? firstName(contributor) : "The person";
  const blocked = !contributor ? "Choose who answered it first" : !agreed ? "Tick the box above first" : null;

  async function submit() {
    const trimmedQuestion = question.trim();
    const trimmedText = text.trim();
    const found: FieldErrors = {};
    if (trimmedQuestion.length < 3) found.question = "Type at least 3 characters.";
    if (trimmedText.length === 0) found.text = "Add the discussion text.";
    if (!contributor) found.contributor = "Choose who answered it first.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    setFailure(null);
    try {
      const trimmedLink = link.trim();
      const state = await createDiscussion({
        requester: me,
        contributor,
        question: trimmedQuestion,
        text: trimmedText,
        ...(trimmedLink ? { link: trimmedLink } : {}),
      });
      saveOpenQuestions(markWaiting(loadOpenQuestions(), me, trimmedQuestion, contributor, state.record_id));
      navigate("/ask");
      show(
        `Sent to ${firstName(contributor)} for review.`,
        `It stays in Your open questions until ${firstName(contributor)} confirms it.`,
      );
    } catch (err) {
      const fields = err instanceof ApiError && err.status === 422 ? errorFields(err) : [];
      if (err instanceof ApiError && err.status === 503) {
        setFailure("unreachable");
      } else if (fields.length > 0) {
        setErrors(fieldErrors(fields));
      } else {
        setFailure("failed");
      }
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  const form = (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Field label="Your question" error={errors.question}>
        {(control) => (
          <Input {...control} value={question} onChange={(event) => setQuestion(event.target.value)} />
        )}
      </Field>

      <Field label="Who answered it" error={errors.contributor}>
        {(control) => (
          <Select {...control} value={contributor} onChange={(event) => setContributor(event.target.value)}>
            {!contributor && <option value="">Choose a person</option>}
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="The discussion"
        hint="Copy it from your chat, or type what you were told in person."
        error={errors.text}
      >
        {(control) => (
          <Textarea {...control} rows={8} value={text} onChange={(event) => setText(event.target.value)} />
        )}
      </Field>

      <Field label="Link" optional>
        {(control) => (
          <Input {...control} type="url" value={link} onChange={(event) => setLink(event.target.value)} />
        )}
      </Field>

      <div className="flex flex-col gap-2">
        <Checkbox
          id={checkId}
          aria-describedby={checkHintId}
          label={`${contributor || "The person"} and I agree this answers the question`}
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <p id={checkHintId} className="type-body-small text-ink-muted">
          Only save discussions that solved the problem. If it didn&apos;t, ask someone else first.
        </p>
      </div>

      {sending && <WaitingCard title="Drafting the record" />}
      {failure === "unreachable" && (
        <ErrorCard
          title="Can't reach the model"
          action={
            <Button variant="secondary" onClick={() => void submit()}>
              Try again
            </Button>
          }
        >
          Nothing was drafted. What you typed is still in the form. Try again in a minute. If it keeps
          failing, the model server may be down.
        </ErrorCard>
      )}
      {failure === "failed" && (
        <ErrorCard
          title="Couldn't send the discussion"
          action={
            <Button variant="secondary" onClick={() => void submit()}>
              Try again
            </Button>
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" disabled={sending || blocked !== null}>
          {contributor ? `Send to ${firstName(contributor)} for review` : "Send for review"}
        </Button>
        {blocked && !sending && <p className="type-body-small text-ink-secondary">{blocked}</p>}
      </div>
    </form>
  );

  const side = (
    <Card>
      <h2 className="type-headline text-bench-ink">What happens next</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-sage-chip type-label text-bench-ink">
              {index + 1}
            </span>
            <p className="type-body text-bench-ink">{step.replaceAll("{who}", who)}</p>
          </li>
        ))}
      </ol>
    </Card>
  );

  return (
    <Page>
      <Link to="/ask" className={linkClass}>
        Back to your question
      </Link>
      <h1 className="mt-6 type-display text-bench-ink">Save what you learned</h1>
      <p className="mt-3 max-w-[66ch] type-body text-ink-secondary">
        Paste the discussion that answered your question. {leadName} gets a draft to check, and once they
        confirm it, anyone who asks the same thing finds the answer here.
      </p>
      <div className="mt-8">
        <TwoColumn main={form} side={side} />
      </div>
    </Page>
  );
}
