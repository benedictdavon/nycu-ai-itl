import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useBlocker, useLocation, useNavigate, useParams } from "react-router";
import { ApiError, confirmRecord, errorFields, getInfo, getRecord, updateRecord } from "../../api/client";
import type { FollowUp, Info, LabRecord } from "../../api/types";
import { AddChip } from "../../components/Chip";
import { Card, CardActionBar } from "../../components/Card";
import { ErrorCard } from "../../components/ErrorCard";
import { Field } from "../../components/Field";
import { GapPanel } from "../../components/GapPanel";
import { Page } from "../../components/Page";
import { TapeLabel } from "../../components/TapeLabel";
import { useToast } from "../../components/Toast";
import { TwoColumn } from "../../components/TwoColumn";
import { Button, buttonVariants } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useMe } from "../../lib/me";
import { findNumbers, normaliseNumber, uncheckedNumbers } from "../../lib/numbers";
import {
  countEmptyGaps,
  draftRows,
  draftToSave,
  numberKeys,
  numbersByRow,
  removeNumber,
  sourceTexts,
  toWorking,
  type Working,
} from "./draft";
import { ChangeRow, ContributorsRow, TagsRow, TextRow, type RowNumbers } from "./DraftRows";
import { NumberPanels, NumberText } from "./NumberText";

/** Plain words for the API field names, used in the 422 message. */
const FIELD_LABELS: Record<string, string> = {
  procedure: "Procedure",
  based_on: "Based on",
  contributors: "Contributors",
  project_tags: "Project tags",
  changes: "Changes from the SOP",
  troubleshooting: "What went wrong, and the fix",
  gaps: "Not in your record",
};

/** "1 change" or "2 changes". */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function cameFromAdd(state: unknown): boolean {
  return typeof state === "object" && state !== null && (state as { fromAdd?: unknown }).fromAdd === true;
}

type Loaded = { record: LabRecord; info: Info; followUps: FollowUp[] };

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: Loaded }
  | { status: "denied"; owner: string }
  | { status: "error"; notFound: boolean };

/** A failed save or confirm, shown above the draft. */
type Failure =
  | { kind: "conflict" }
  | { kind: "forbidden" }
  | { kind: "invalid"; fields: string[] }
  | { kind: "save" }
  | { kind: "confirm" };

function failureFrom(err: unknown, step: "save" | "confirm"): Failure {
  if (err instanceof ApiError) {
    if (err.status === 409) return { kind: "conflict" };
    if (err.status === 403) return { kind: "forbidden" };
    if (err.status === 422) return { kind: "invalid", fields: errorFields(err) };
  }
  return { kind: step };
}

/** Where a press was refused: the card's action bar, or the "Before you confirm" panel. */
type Place = "card" | "panel";

/** A row open for editing, with the name the message uses for it. */
type OpenRow = { id: string; label: string };

/** The fields inside an open row, in page order. */
const OPEN_FIELD = "[data-editing] input, [data-editing] textarea, [data-editing] select, [data-editing] button";

/** "Save or cancel your edit to Based on first." or "... edits to Based on and Project tags first." */
function openRowsMessage(rows: OpenRow[]): string {
  const labels = rows.map((row) => row.label);
  const names =
    labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0];
  return `Save or cancel your ${labels.length === 1 ? "edit" : "edits"} to ${names} first.`;
}

/** Check the draft: /review/:recordId. Loads the draft, then shows it for checking. */
export default function ReviewScreen() {
  const { recordId } = useParams();
  const id = Number(recordId);
  const { me } = useMe();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    getRecord(id).then(
      async ({ record, info }) => {
        if (me === null || !record.contributors.includes(me)) {
          if (active) setLoad({ status: "denied", owner: record.contributors[0] ?? "" });
          return;
        }
        if (record.status === "confirmed") {
          navigate(`/records/${record.id}`, { replace: true });
          return;
        }
        // A failed follow-up lookup means "no answers yet", so the draft still shows.
        const followUps = await getInfo(info.id).then(
          (state) => state.follow_ups,
          () => [],
        );
        if (active) setLoad({ status: "ready", data: { record, info, followUps } });
      },
      (err: unknown) => {
        if (active) {
          setLoad({ status: "error", notFound: err instanceof ApiError && err.status === 404 });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [id, me, navigate, attempt]);

  if (load.status === "loading") {
    return (
      <Page>
        <Card aria-busy="true" className="space-y-4">
          {[0, 1, 2].map((row) => (
            <div key={row} aria-hidden="true" className="h-5 w-2/3 rounded-md bg-bench-grey" />
          ))}
        </Card>
      </Page>
    );
  }

  if (load.status === "denied") {
    return (
      <Page>
        <ErrorCard title="Only a contributor can confirm this record">
          You're not listed as a contributor. Ask {load.owner} to confirm it.
        </ErrorCard>
      </Page>
    );
  }

  if (load.status === "error") {
    return (
      <Page>
        {load.notFound ? (
          <ErrorCard
            title="Couldn't find this draft"
            action={
              <Link to="/inbox" className={buttonVariants({ variant: "secondary" })}>
                Go to To review
              </Link>
            }
          />
        ) : (
          <ErrorCard
            title="Couldn't load this draft"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setLoad({ status: "loading" });
                  setAttempt((current) => current + 1);
                }}
              >
                Try again
              </Button>
            }
          />
        )}
      </Page>
    );
  }

  return <DraftReview key={load.data.record.id} {...load.data} />;
}

/** The checking screen for one loaded draft. It keeps the local working copy and the confirm flow. */
function DraftReview({ record, info, followUps }: Loaded) {
  const { me } = useMe();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fromAdd = cameFromAdd(location.state);
  const confirmHeadingId = useId();

  const [working, setWorking] = useState<Working>(() => toWorking(record, 1));
  // Numbers the contributor marked "Yes, it's right" in this session.
  const [kept, setKept] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  // The rows open for editing, and the press that was refused because of them.
  const [rowEdits, setRowEdits] = useState<{ open: OpenRow[]; blocked: Place | null }>({
    open: [],
    blocked: null,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The Confirm record button that opened the panel. Escape and "Go back" return focus to it.
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  // Set just before a confirmed record opens, so the leave check below lets that one move through.
  const leavingRef = useRef(false);
  // Unsaved: a row is open, or an edit was applied but not saved with Save draft.
  const unsaved = working.edited || rowEdits.open.length > 0;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      unsaved && currentLocation.pathname !== nextLocation.pathname && !leavingRef.current,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved changes to this draft. Leave without saving them?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!unsaved) return;
    // Reload, close the tab or type another address: the browser asks before it leaves.
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  useEffect(() => {
    if (!confirming) return;
    // Bring the whole panel into view, then focus its heading. The focus does not scroll again.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    panelRef.current?.scrollIntoView?.({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [confirming]);

  /** A row reports when it opens or closes. When the last open row closes, the message goes too. */
  function setRowOpen(id: string, label: string, open: boolean) {
    setRowEdits((current) => {
      const isOpen = current.open.some((row) => row.id === id);
      if (isOpen === open) return current;
      const next = open
        ? [...current.open, { id, label }]
        : current.open.filter((row) => row.id !== id);
      return { open: next, blocked: next.length === 0 ? null : current.blocked };
    });
  }

  /**
   * Refuses a press while a row is open. The message appears by that press, and focus moves to the
   * open row so its edit can be saved or cancelled. Returns true when the press was refused.
   */
  function blockedByOpenRow(place: Place): boolean {
    if (rowEdits.open.length === 0) return false;
    setRowEdits((current) => ({ ...current, blocked: place }));
    cardRef.current?.querySelector<HTMLElement>(OPEN_FIELD)?.focus();
    return true;
  }

  function closePanel() {
    setConfirming(false);
    confirmButtonRef.current?.focus();
  }

  const rows = draftRows(working);
  const sources = sourceTexts(info, followUps, kept);
  const unchecked = uncheckedNumbers(
    rows.flatMap((row) => row.texts),
    sources,
  );
  const flagKeys = new Set(unchecked.map(normaliseNumber));
  const numbersInRow = numbersByRow(rows, sources);
  const highlightKeys = numberKeys(rows);
  // Same rule as NumberText's highlight mode: a number in the record that the draft also uses.
  const anyHighlighted = findNumbers(info.text).some((match) =>
    highlightKeys.has(normaliseNumber(match.text)),
  );
  const answered = followUps.filter((followUp) => followUp.answer !== null);
  const emptyGaps = countEmptyGaps(working);

  function numberProps(rowId: string): RowNumbers {
    return {
      flagKeys,
      numbers: numbersInRow.get(rowId) ?? [],
      onKeep: (number) => setKept((current) => [...current, number]),
      onRemove: (number) => setWorking((current) => removeNumber(current, number)),
    };
  }

  function edit(change: (current: Working) => Working) {
    setWorking((current) => ({ ...change(current), edited: true }));
  }

  async function saveDraft() {
    setBusy(true);
    setFailure(null);
    try {
      const saved = await updateRecord(record.id, draftToSave(working));
      setWorking(toWorking(saved, working.nextKey));
      show("Draft saved");
    } catch (err) {
      setFailure(failureFrom(err, "save"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndPublish() {
    if (me === null) return;
    // A row may have been opened after the panel was shown, so check again.
    if (blockedByOpenRow("panel")) return;
    setBusy(true);
    setFailure(null);
    let step: "save" | "confirm" = "confirm";
    try {
      if (working.edited) {
        step = "save";
        await updateRecord(record.id, draftToSave(working));
        step = "confirm";
      }
      await confirmRecord(record.id, { confirmed_by: me });
    } catch (err) {
      setBusy(false);
      setFailure(failureFrom(err, step));
      return;
    }
    leavingRef.current = true;
    navigate(`/records/${record.id}`);
    show("Record confirmed", "Labmates can find it when they ask.");
  }

  const failureView = failure && (
    <FailureView failure={failure} recordId={record.id} owner={record.contributors[0] ?? ""} />
  );

  const progress = fromAdd ? (
    <ol
      aria-label="Progress"
      className="flex flex-wrap items-center gap-x-7 gap-y-2 type-body-small text-ink-secondary"
    >
      <li className="inline-flex items-center gap-2">
        <Check aria-hidden="true" className="size-5 text-coomassie-blue" />
        Record added
      </li>
      {answered.length > 0 && (
        <li>{count(answered.length, "question answered", "questions answered")}</li>
      )}
      <li aria-current="step" className="inline-flex items-center gap-2 font-bold text-coomassie-blue">
        <span aria-hidden="true" className="size-2.5 rounded-pill bg-coomassie-blue" />
        Check the draft
      </li>
    </ol>
  ) : (
    <Link to="/inbox" className="inline-flex min-h-11 items-center type-label text-coomassie-blue">
      Back to To review
    </Link>
  );

  const main = (
    <>
      {failureView}
      <Card ref={cardRef}>
        <TextRow
          label="Procedure"
          value={working.procedure}
          emptyText=""
          requiredMessage="Add the procedure name."
          valueClassName="type-title text-bench-ink"
          onSave={(value) => edit((current) => ({ ...current, procedure: value }))}
          onEditingChange={(open) => setRowOpen("procedure", "Procedure", open)}
          {...numberProps("procedure")}
        />
        <TextRow
          label="Based on"
          optional
          value={working.based_on}
          emptyText="Not given"
          onSave={(value) => edit((current) => ({ ...current, based_on: value || null }))}
          onEditingChange={(open) => setRowOpen("based_on", "Based on", open)}
          {...numberProps("based_on")}
        />
        <ContributorsRow
          contributors={working.contributors}
          uploader={info.contributor}
          me={me}
          onSave={(list) => edit((current) => ({ ...current, contributors: list }))}
          onEditingChange={(open) => setRowOpen("contributors", "Contributors", open)}
        />
        <TagsRow
          tags={working.project_tags}
          onSave={(tags) => edit((current) => ({ ...current, project_tags: tags }))}
          onEditingChange={(open) => setRowOpen("tags", "Project tags", open)}
        />

        <section className="border-t border-hairline py-4">
          <h2 className="type-label text-ink-secondary">Changes from the SOP</h2>
          <div className="mt-2">
            {working.changes.map((change) => (
              <ChangeRow
                key={change.key}
                change={change}
                startEditing={change.what === ""}
                onSave={(what, reason) =>
                  edit((current) => ({
                    ...current,
                    changes: current.changes.map((item) =>
                      item.key === change.key ? { ...item, what, reason } : item,
                    ),
                  }))
                }
                onRemoveChange={() =>
                  edit((current) => ({
                    ...current,
                    changes: current.changes.filter((item) => item.key !== change.key),
                  }))
                }
                onEditingChange={(open) =>
                  setRowOpen(
                    `change-${change.key}`,
                    // Named by its text as it stood when the row opened. A just-added change has none.
                    change.what ? `the change "${change.what}"` : "a new change",
                    open,
                  )
                }
                {...numberProps(`change-${change.key}`)}
              />
            ))}
          </div>
          <div className="mt-4">
            <AddChip
              label="Add a change"
              onClick={() =>
                edit((current) => ({
                  ...current,
                  changes: [...current.changes, { key: current.nextKey, what: "", reason: null }],
                  nextKey: current.nextKey + 1,
                }))
              }
            />
          </div>
        </section>

        <TextRow
          label="What went wrong, and the fix"
          optional
          multiline
          value={working.troubleshooting}
          emptyText="Nothing recorded"
          onSave={(value) => edit((current) => ({ ...current, troubleshooting: value || null }))}
          onEditingChange={(open) => setRowOpen("troubleshooting", "What went wrong, and the fix", open)}
          {...numberProps("troubleshooting")}
        />

        {working.gaps.length > 0 && (
          <div className="mt-6">
            <GapPanel
              label={count(working.gaps.length, "gap", "gaps")}
              heading="Not in your record"
            >
              <p className="type-body-small text-tape-text">
                Fill in what you know. Anything left empty is shown to labmates as not recorded.
              </p>
              <div className="mt-4 flex flex-col gap-4">
                {working.gaps.map((gap, index) => {
                  const gapNumbers = numberProps(`gap-${index}`);
                  return (
                  <div key={index}>
                    <Field label={gap}>
                      {(control) => (
                        <Input
                          {...control}
                          tone="gap"
                          placeholder="Leave empty if you don't know"
                          value={working.gapAnswers[index] ?? ""}
                          onChange={(event) =>
                            edit((current) => ({
                              ...current,
                              gapAnswers: current.gapAnswers.map((answer, position) =>
                                position === index ? event.target.value : answer,
                              ),
                            }))
                          }
                        />
                      )}
                    </Field>
                    <NumberPanels
                      numbers={gapNumbers.numbers}
                      onKeep={gapNumbers.onKeep}
                      onRemove={gapNumbers.onRemove}
                    />
                  </div>
                  );
                })}
              </div>
            </GapPanel>
          </div>
        )}

        <CardActionBar>
          <Button
            variant="secondary"
            onClick={() => {
              if (!blockedByOpenRow("card")) void saveDraft();
            }}
            disabled={busy}
          >
            Save draft
          </Button>
          <Button
            variant={confirming ? "secondary" : "primary"}
            onClick={(event) => {
              if (blockedByOpenRow("card")) return;
              confirmButtonRef.current = event.currentTarget;
              setConfirming(true);
            }}
            disabled={busy}
          >
            <Check aria-hidden="true" className="size-5" />
            Confirm record
          </Button>
          {rowEdits.blocked === "card" && (
            <p role="alert" className="w-full text-right type-body-small text-alert-ink">
              {openRowsMessage(rowEdits.open)}
            </p>
          )}
        </CardActionBar>
      </Card>

      {confirming && (
        <section
          ref={panelRef}
          aria-labelledby={confirmHeadingId}
          onKeyDown={(event) => {
            if (event.key === "Escape") closePanel();
          }}
          className="scroll-mt-6 scroll-mb-6 mt-6 rounded-lg bg-coomassie-wash p-5 text-coomassie-ink sm:px-8 sm:py-6"
        >
          <h2
            ref={headingRef}
            id={confirmHeadingId}
            tabIndex={-1}
            className="type-title w-fit rounded-md focus:outline-[3px] focus:outline-offset-2 focus:outline-coomassie-blue"
          >
            Before you confirm
          </h2>
          <ul className="mt-3 flex flex-col gap-2 type-body">
            {unchecked.length > 0 && (
              <li>
                <p>
                  {unchecked.length === 1
                    ? "1 number isn't checked:"
                    : `${unchecked.length} numbers aren't checked:`}
                </p>
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-6">
                  {unchecked.map((number) => (
                    <li key={number}>"{number}" is not in your record.</li>
                  ))}
                </ul>
              </li>
            )}
            {emptyGaps > 0 && (
              <li>
                {emptyGaps === 1
                  ? "1 gap is empty. Labmates will see it as not recorded."
                  : `${emptyGaps} gaps are empty. Labmates will see them as not recorded.`}
              </li>
            )}
            <li>
              Labmates can find this record as soon as you confirm. You can't edit it after.
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void confirmAndPublish()} disabled={busy}>
              Confirm and publish
            </Button>
            <Button variant="secondary" onClick={closePanel} disabled={busy}>
              Go back and check
            </Button>
          </div>
          {rowEdits.blocked === "panel" && (
            <p role="alert" className="mt-3 type-body text-alert-ink">
              {openRowsMessage(rowEdits.open)}
            </p>
          )}
        </section>
      )}
    </>
  );

  const side = (
    <>
      <h2 id="original-record" className="scroll-mt-6 type-headline text-bench-ink">
        Your original record
      </h2>
      <Card className="mt-3">
        {/* On a long record, the text scrolls inside the card on desktop, so the sticky card stays short. */}
        <p className="whitespace-pre-wrap type-body text-bench-ink lg:max-h-[50vh] lg:overflow-y-auto">
          <NumberText text={info.text} mode="highlight" keys={highlightKeys} />
        </p>
        {anyHighlighted && (
          <p className="mt-3 type-body-small text-ink-muted">Highlighted: parts the draft uses.</p>
        )}
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
      {answered.length > 0 && (
        <>
          <h2 className="mt-8 type-title text-bench-ink">Your answers</h2>
          <Card className="mt-3">
            <ul className="flex flex-col gap-4">
              {answered.map((followUp, index) => (
                <li key={index}>
                  <p className="type-label text-bench-ink">{followUp.question}</p>
                  <p className="mt-1 type-body-small text-ink-secondary">{followUp.answer}</p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );

  return (
    <Page>
      {progress}
      <h1 className="mt-6 type-display text-bench-ink">Check the draft</h1>
      <p className="mt-3 max-w-[66ch] type-body text-ink-secondary">
        Read it against{" "}
        <a href="#original-record" className="text-coomassie-blue underline underline-offset-4">
          your original record
        </a>
        . LabKnow has marked what to look at first.
      </p>

      <ul aria-label="What LabKnow found" className="mt-6 flex flex-wrap items-center gap-2">
        <li className="inline-flex min-h-9 items-center rounded-pill bg-sage-chip px-3 type-label text-bench-ink">
          {count(working.changes.length, "change", "changes")} from the SOP
        </li>
        {working.gaps.length > 0 && (
          <li>
            <TapeLabel>{count(working.gaps.length, "gap", "gaps")}</TapeLabel>
          </li>
        )}
        {unchecked.length > 0 ? (
          <li className="inline-flex min-h-9 items-center rounded-pill bg-alert-wash px-3 type-label text-alert-ink">
            {count(unchecked.length, "number not in your record", "numbers not in your record")}
          </li>
        ) : (
          <li className="inline-flex min-h-9 items-center rounded-pill bg-coomassie-wash px-3 type-label text-coomassie-blue">
            Every number checked
          </li>
        )}
      </ul>

      <div className="mt-8">
        <TwoColumn main={main} side={side} stickySide />
      </div>
    </Page>
  );
}

function FailureView({
  failure,
  recordId,
  owner,
}: {
  failure: Failure;
  recordId: number;
  owner: string;
}): ReactNode {
  switch (failure.kind) {
    case "conflict":
      return (
        <ErrorCard
          title="This record was just confirmed"
          action={
            <Link to={`/records/${recordId}`} className={buttonVariants({ variant: "secondary" })}>
              Open the confirmed record
            </Link>
          }
        >
          Someone else confirmed it while you were checking it, so your changes weren't saved.
        </ErrorCard>
      );
    case "forbidden":
      return (
        <ErrorCard title="Only a contributor can confirm this record">
          You're not listed as a contributor. Ask {owner} to confirm it.
        </ErrorCard>
      );
    case "invalid":
      return (
        <ErrorCard title="Some fields need fixing">
          {failure.fields.length > 0 &&
            failure.fields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}
        </ErrorCard>
      );
    case "save":
      return <ErrorCard title="Couldn't save the draft" />;
    case "confirm":
      return <ErrorCard title="Couldn't confirm the record" />;
  }
}
