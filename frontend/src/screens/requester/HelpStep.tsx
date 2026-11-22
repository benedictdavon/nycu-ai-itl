import { useRef, useState } from "react";
import { Link } from "react-router";
import { suggestContributor } from "../../api/client";
import { Avatar } from "../../components/Avatar";
import { Field } from "../../components/Field";
import { Select } from "../../components/Select";
import { TapeLabel } from "../../components/TapeLabel";
import { Button } from "../../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Textarea } from "../../components/ui/textarea";
import { useMembers } from "../../lib/useMembers";
import { linkClass } from "./linkStyles";
import { buildMessage } from "./message";
import { firstName } from "./names";
import { discussionPath } from "./openQuestions";

type Mode = "" | "suggest" | "choose";

export type HelpStepProps = {
  question: string;
  me: string;
  answerText: string;
  uncertainties: string[];
  /** People already asked about this question. They are left out. */
  asked: string[];
  /** The person picked now, if any. */
  person: string | null;
  /** Set after "Not solved", for the line that says who was asked. */
  notSolvedWith: string | null;
  onPick: (name: string) => void;
  onNotSolved: (name: string) => void;
};

/** "Want to ask a person?": suggest someone, or choose, then a message to send. */
export function HelpStep({
  question,
  me,
  answerText,
  uncertainties,
  asked,
  person,
  notSolvedWith,
  onPick,
  onNotSolved,
}: HelpStepProps) {
  const { members } = useMembers();
  const [mode, setMode] = useState<Mode>("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  const choices = members.filter((name) => name !== me && !asked.includes(name));

  async function suggest() {
    try {
      const { contributor } = await suggestContributor(question, [me, ...asked]);
      if (contributor && contributor !== me && !asked.includes(contributor)) {
        setSuggested(contributor);
        setNoMatch(false);
        onPick(contributor);
        return;
      }
    } catch {
      // Any error counts as no close match.
    }
    setSuggested(null);
    setNoMatch(true);
    setMode("choose");
  }

  function choose(value: string) {
    if (value !== "suggest" && value !== "choose") return;
    setMode(value);
    setNoMatch(false);
    if (value === "suggest") void suggest();
  }

  function notSolved(name: string) {
    setMode("");
    setSuggested(null);
    setNoMatch(false);
    onNotSolved(name);
  }

  return (
    <section className="flex flex-col gap-5">
      <h2 className="type-headline text-bench-ink">Want to ask a person?</h2>
      <p className="type-body text-ink-secondary">
        LabKnow won&apos;t contact anyone for you. If you want help, pick how to find someone.
      </p>
      {notSolvedWith && (
        <p className="type-body text-bench-ink">
          You asked {notSolvedWith} and it isn&apos;t solved yet. {firstName(notSolvedWith)} is left out
          below.
        </p>
      )}

      <RadioGroup aria-label="How to find someone" value={mode} onValueChange={choose}>
        <RadioGroupItem value="suggest">Suggest someone</RadioGroupItem>
        <RadioGroupItem value="choose">I&apos;ll choose</RadioGroupItem>
      </RadioGroup>

      {mode === "suggest" && suggested && (
        <div className="flex items-center gap-4 rounded-lg bg-coomassie-wash p-5">
          <Avatar name={suggested} tone="current" size={40} />
          <div className="min-w-0">
            <p className="type-title text-bench-ink">{suggested}</p>
            <p className="type-body-small text-coomassie-ink">
              Their confirmed records are the closest match to your question.
            </p>
          </div>
        </div>
      )}

      {noMatch && (
        <div className="flex flex-col gap-2">
          <div>
            <TapeLabel>No close match</TapeLabel>
          </div>
          <p className="type-title text-bench-ink">No one&apos;s records match this question closely</p>
          <p className="type-body text-ink-secondary">
            Choose someone yourself. The professor often knows who has done an experiment.
          </p>
        </div>
      )}

      {mode === "choose" && (
        <Field label="Who do you want to ask?">
          {(control) => (
            <Select
              {...control}
              value={person ?? ""}
              onChange={(event) => {
                if (event.target.value) onPick(event.target.value);
              }}
            >
              <option value="">Choose a person</option>
              {choices.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {person && (
        <MessageBlock
          key={person}
          person={person}
          question={question}
          answerText={answerText}
          uncertainties={uncertainties}
          onNotSolved={() => notSolved(person)}
        />
      )}
    </section>
  );
}

function MessageBlock({
  person,
  question,
  answerText,
  uncertainties,
  onNotSolved,
}: {
  person: string;
  question: string;
  answerText: string;
  uncertainties: string[];
  onNotSolved: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const message = buildMessage({ person, question, answerText, uncertainties });

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      // No clipboard access: select the text so the person can copy it.
      textRef.current?.select();
      textRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="type-headline text-bench-ink">A message you can send</h3>
      <p className="type-body-small text-ink-muted">
        It says what you asked and what the records already cover, so they don&apos;t start from zero.
      </p>
      <Textarea
        ref={textRef}
        readOnly
        rows={7}
        value={message}
        aria-label="A message you can send"
        className="bg-paper-sunk"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void copy()}>{copied ? "Copied" : "Copy message"}</Button>
      </div>
      <p className="type-body-small text-ink-muted">Send it on LINE, or use it when you ask in person.</p>

      <div className="flex flex-col gap-3 border-t border-hairline pt-6">
        <p className="type-body text-ink-secondary">
          This question stays in Your open questions. Come back when you&apos;ve talked:
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link to={discussionPath(question, person)} className={linkClass}>
            It&apos;s solved: save the answer
          </Link>
          <Button variant="secondary" onClick={onNotSolved}>
            Not solved: ask someone else
          </Button>
        </div>
      </div>
    </div>
  );
}
