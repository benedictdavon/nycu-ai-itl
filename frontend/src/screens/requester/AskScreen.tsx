import { useEffect, useId, useState, type FormEvent } from "react";
import { ApiError, ask, getRecord, listRecords } from "../../api/client";
import type { AskResponse, LabRecord } from "../../api/types";
import { ErrorCard } from "../../components/ErrorCard";
import { Page } from "../../components/Page";
import { TwoColumn } from "../../components/TwoColumn";
import { WaitingCard } from "../../components/WaitingCard";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import { AnswerView } from "./AnswerView";
import { HelpStep } from "./HelpStep";
import { OpenQuestionsCard } from "./OpenQuestionsCard";
import { useCurrentMe } from "./useCurrentMe";
import { SourceCards, type SourceInfos } from "./SourceCards";
import {
  findQuestion,
  loadOpenQuestions,
  markNotSolved,
  removeQuestion,
  saveOpenQuestions,
  startAsking,
  type OpenQuestion,
} from "./openQuestions";

type Phase = "idle" | "waiting" | "unreachable" | "failed" | "done";

/** The answer on screen, and the question and mode it was asked with. */
type Shown = { question: string; hintMode: boolean; response: AskResponse };

/** Ask: /ask (SCREENS.md sections 6 and 7). */
export default function AskScreen() {
  const me = useCurrentMe();
  const questionId = useId();
  const questionErrorId = useId();
  const switchId = useId();
  const switchHintId = useId();

  const [entries, setEntries] = useState<OpenQuestion[]>(loadOpenQuestions);
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [hintsFirst, setHintsFirst] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [last, setLast] = useState<{ question: string; hintMode: boolean } | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [infos, setInfos] = useState<SourceInfos>({});
  const [noConfirmed, setNoConfirmed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notSolvedWith, setNotSolvedWith] = useState<string | null>(null);

  // Saved discussions that a confirmed record now answers leave "Your open questions".
  useEffect(() => {
    let active = true;
    const waiting = loadOpenQuestions().filter(
      (entry) => entry.requester === me && entry.status === "waiting" && entry.recordId !== null,
    );
    for (const entry of waiting) {
      if (entry.recordId === null) continue;
      getRecord(entry.recordId).then(
        ({ record }) => {
          if (!active || record.status !== "confirmed") return;
          const next = removeQuestion(loadOpenQuestions(), entry.id);
          saveOpenQuestions(next);
          setEntries(next);
        },
        () => {
          // The record is not reachable now; keep the entry and try again next visit.
        },
      );
    }
    return () => {
      active = false;
    };
  }, [me]);

  function commit(next: OpenQuestion[]) {
    saveOpenQuestions(next);
    setEntries(next);
  }

  function fetchInfos(records: LabRecord[]) {
    for (const record of records) {
      getRecord(record.id).then(
        ({ info }) => setInfos((previous) => ({ ...previous, [record.id]: info })),
        () => setInfos((previous) => ({ ...previous, [record.id]: null })),
      );
    }
  }

  function showResult(text: string, hintMode: boolean, response: AskResponse) {
    setShown({ question: text, hintMode, response });
    setPhase("done");
    setInfos({});
    setNoConfirmed(false);
    if (!hintMode && response.answer.kind === "answered") {
      fetchInfos(response.sources);
    }
    if (response.answer.kind === "insufficient") {
      listRecords({ status: "confirmed" }).then(
        (confirmed) => setNoConfirmed(confirmed.length === 0),
        () => setNoConfirmed(false),
      );
    }
  }

  async function send(text: string, hintMode: boolean) {
    setLast({ question: text, hintMode });
    setPhase("waiting");
    setShown(null);
    setHelpOpen(false);
    setNotSolvedWith(null);
    try {
      const response = await ask({ question: text, requester: me, hint_mode: hintMode });
      showResult(text, hintMode, response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        // The server rejected the question: show the field message, with the input kept.
        setPhase("idle");
        setQuestionError("Type at least 3 characters.");
        return;
      }
      setPhase(err instanceof ApiError && err.status === 503 ? "unreachable" : "failed");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 3) {
      setQuestionError("Type at least 3 characters.");
      return;
    }
    setQuestionError(null);
    void send(text, hintsFirst);
  }

  function retry() {
    if (last) void send(last.question, last.hintMode);
  }

  function showFull() {
    if (shown) void send(shown.question, false);
  }

  const entry = shown ? findQuestion(entries, me, shown.question) : undefined;
  const asked = entry?.asked ?? [];
  const person = entry?.person ?? null;
  const visible = entries.filter(
    (item) => item.requester === me && (item.status === "waiting" || item.person !== null),
  );

  function pick(name: string) {
    if (!shown) return;
    commit(startAsking(entries, me, shown.question, shown.response, name));
  }

  function notSolved(name: string) {
    if (!entry) return;
    commit(markNotSolved(entries, entry.id, name));
    setNotSolvedWith(name);
  }

  // "Not solved" on a card shows the stored answer again, with the help step open.
  function notSolvedFromCard(card: OpenQuestion) {
    if (!card.response || !card.person) return;
    const name = card.person;
    commit(markNotSolved(entries, card.id, name));
    setQuestion(card.question);
    showResult(card.question, false, card.response);
    setHelpOpen(true);
    setNotSolvedWith(name);
  }

  const sourcesSide =
    shown && shown.response.answer.kind === "answered" && shown.response.sources.length > 0 ? (
      <SourceCards records={shown.response.sources} infos={infos} linked={!shown.hintMode} />
    ) : undefined;

  const main = (
    <div className="flex flex-col gap-8">
      {visible.length > 0 && <OpenQuestionsCard entries={visible} onNotSolved={notSolvedFromCard} />}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="type-display text-bench-ink">
            <label htmlFor={questionId}>What do you need to know?</label>
          </h1>
          <p className="type-body text-ink-secondary">
            Ask in your own words. Answers come only from records your labmates have confirmed.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Textarea
            id={questionId}
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-invalid={questionError ? true : undefined}
            aria-describedby={questionError ? questionErrorId : undefined}
          />
          {questionError && (
            <p id={questionErrorId} role="alert" className="type-body-small text-alert-ink">
              {questionError}
            </p>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={switchId}>Hints first</Label>
            <p id={switchHintId} className="type-body-small text-ink-muted">
              Get pointers to work it out yourself. You can ask for the full answer after.
            </p>
          </div>
          <Switch
            id={switchId}
            checked={hintsFirst}
            onCheckedChange={setHintsFirst}
            aria-describedby={switchHintId}
          />
        </div>

        <div>
          <Button type="submit" disabled={phase === "waiting"}>
            Ask
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="flex flex-col gap-6">
        {phase === "waiting" && <WaitingCard title="Finding an answer" />}
        {phase === "unreachable" && (
          <ErrorCard
            title="Can't reach the model"
            action={
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            }
          >
            What you typed is still in the form. Try again in a minute. If it keeps failing, the model
            server may be down.
          </ErrorCard>
        )}
        {phase === "failed" && (
          <ErrorCard
            title="Couldn't get an answer"
            action={
              <Button variant="secondary" onClick={retry}>
                Try again
              </Button>
            }
          />
        )}
        {shown && (
          <AnswerView
            question={shown.question}
            hintMode={shown.hintMode}
            response={shown.response}
            noConfirmed={noConfirmed}
            helpOpen={helpOpen}
            onToggleHelp={() => setHelpOpen((open) => !open)}
            onShowFull={showFull}
            busy={phase === "waiting"}
            helpStep={
              <HelpStep
                question={shown.question}
                me={me}
                answerText={shown.response.answer.text}
                uncertainties={shown.response.answer.uncertainties}
                asked={asked}
                person={person}
                notSolvedWith={notSolvedWith}
                onPick={pick}
                onNotSolved={notSolved}
              />
            }
          />
        )}
      </div>
    </div>
  );

  return (
    <Page>
      <TwoColumn main={main} side={sourcesSide} />
    </Page>
  );
}
