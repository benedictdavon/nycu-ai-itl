import { useEffect, useRef, useState, type ReactNode } from "react";
import { AddChip, PersonChip, TagChip } from "../../components/Chip";
import { Field } from "../../components/Field";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/Select";
import { Textarea } from "../../components/ui/textarea";
import { useMembers } from "../../lib/useMembers";
import { cn, reasonParts } from "../../lib/utils";
import { formatTags, parseTags, type WorkingChange } from "./draft";
import { NumberPanels, NumberText } from "./NumberText";

/** The shared number-check props for a row. */
export type RowNumbers = {
  /** Keys of every unchecked number on the page; these get the number flag. */
  flagKeys: ReadonlySet<string>;
  /** The unchecked numbers whose first appearance is in this row. */
  numbers: string[];
  onKeep: (number: string) => void;
  onRemove: (number: string) => void;
};

/** A row label with the "Edit" text button. The button is 44px tall. */
function RowHeader({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h2 className="type-label text-ink-secondary">{label}</h2>
      <Button variant="text" aria-label={`Edit ${label}`} onClick={onEdit} className="-my-2 -mr-3">
        Edit
      </Button>
    </div>
  );
}

function EditActions({ onSave, onCancel, children }: { onSave: () => void; onCancel: () => void; children?: ReactNode }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button variant="secondary" onClick={onSave}>
        Save
      </Button>
      <Button variant="text" onClick={onCancel}>
        Cancel
      </Button>
      {children}
    </div>
  );
}

/** The refusal under an open row's actions, shown when a Save or Confirm press was refused. */
function BlockedNotice({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-2 type-body-small text-alert-ink">{message}</p>;
}

/**
 * Tells the page whether this row is open for editing. The page refuses Save and Confirm while a
 * row is open, so typed text is never dropped. A row that unmounts while open reports closed.
 */
function useReportOpen(open: boolean, onOpenChange: (open: boolean) => void) {
  // The page passes a new callback on every render. Keeping the latest one in a ref means the
  // effect below runs only when `open` changes, not on every render.
  const latest = useRef(onOpenChange);
  useEffect(() => {
    latest.current = onOpenChange;
  });
  useEffect(() => {
    latest.current(open);
    return () => latest.current(false);
  }, [open]);
}

export type TextRowProps = RowNumbers & {
  label: string;
  value: string | null;
  /** Shown in ink-muted when there is no value. */
  emptyText: string;
  multiline?: boolean;
  optional?: boolean;
  /** Shown under the input in edit mode. */
  hint?: string;
  /** The message when Save is pressed with an empty value. Leave it out for optional fields. */
  requiredMessage?: string;
  valueClassName?: string;
  onSave: (value: string) => void;
  onEditingChange: (open: boolean) => void;
  /** Shown under the row's actions while the row is open. */
  blockedMessage?: string;
};

/** A single-value row (procedure, based on, what went wrong): read-only text, or one input to edit. */
export function TextRow({
  label,
  value,
  emptyText,
  multiline = false,
  optional = false,
  hint,
  requiredMessage,
  valueClassName = "type-body",
  onSave,
  onEditingChange,
  blockedMessage,
  flagKeys,
  numbers,
  onKeep,
  onRemove,
}: TextRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  useReportOpen(editing, onEditingChange);

  function startEdit() {
    setText(value ?? "");
    setError(undefined);
    setEditing(true);
  }

  function save() {
    const trimmed = text.trim();
    if (requiredMessage && trimmed === "") {
      setError(requiredMessage);
      return;
    }
    onSave(trimmed);
    setEditing(false);
  }

  function cancel() {
    setError(undefined);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="py-4" data-editing>
        <Field label={label} optional={optional} hint={hint} error={error}>
          {(control) =>
            multiline ? (
              <Textarea {...control} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            ) : (
              <Input {...control} value={text} onChange={(e) => setText(e.target.value)} />
            )
          }
        </Field>
        <EditActions onSave={save} onCancel={cancel} />
        <BlockedNotice message={blockedMessage} />
      </div>
    );
  }

  return (
    <div className="border-t border-hairline py-4 first:border-t-0">
      <RowHeader label={label} onEdit={startEdit} />
      <p className={cn("mt-1 whitespace-pre-wrap text-bench-ink", valueClassName)}>
        {value ? (
          <NumberText text={value} mode="flag" keys={flagKeys} />
        ) : (
          <span className="text-ink-muted">{emptyText}</span>
        )}
      </p>
      <NumberPanels numbers={numbers} onKeep={onKeep} onRemove={onRemove} />
    </div>
  );
}

/** Project tags: chips to read, one comma-separated input to edit. */
export function TagsRow({
  tags,
  onSave,
  onEditingChange,
  blockedMessage,
}: {
  tags: string[];
  onSave: (tags: string[]) => void;
  onEditingChange: (open: boolean) => void;
  blockedMessage?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  useReportOpen(editing, onEditingChange);

  function startEdit() {
    setText(formatTags(tags));
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="py-4" data-editing>
        <Field label="Project tags" hint="Separate tags with commas">
          {(control) => <Input {...control} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
        <EditActions
          onSave={() => {
            onSave(parseTags(text));
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
        <BlockedNotice message={blockedMessage} />
      </div>
    );
  }

  return (
    <div className="border-t border-hairline py-4 first:border-t-0">
      <RowHeader label="Project tags" onEdit={startEdit} />
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => <TagChip key={tag} label={tag} />)
        ) : (
          <span className="type-body text-ink-muted">Not given</span>
        )}
      </div>
    </div>
  );
}

/**
 * The uploader's chip when the uploader is not the current person. It has no remove control. The
 * current person's own chip is the shared PersonChip, locked.
 */
function UploaderChip({ name }: { name: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-0.5 rounded-pill bg-coomassie-wash py-0.5 pr-3 pl-3 type-label text-bench-ink">
      {name}
      <span className="font-normal text-ink-secondary">(uploader, always kept)</span>
    </span>
  );
}

/**
 * Contributors: person chips to read. To edit, the other chips get remove buttons and "Add someone"
 * reveals a select of members not yet listed. The uploader stays in the list.
 */
export function ContributorsRow({
  contributors,
  uploader,
  me,
  onSave,
  onEditingChange,
  blockedMessage,
}: {
  contributors: string[];
  uploader: string;
  me: string | null;
  onSave: (contributors: string[]) => void;
  onEditingChange: (open: boolean) => void;
  blockedMessage?: string;
}) {
  const { members, error: membersError } = useMembers();
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  useReportOpen(editing, onEditingChange);

  function startEdit() {
    setList(contributors.includes(uploader) ? [...contributors] : [uploader, ...contributors]);
    setAdding(false);
    setEditing(true);
  }

  function uploaderChip() {
    return uploader === me ? (
      <PersonChip name={uploader} locked />
    ) : (
      <UploaderChip name={uploader} />
    );
  }

  if (editing) {
    const candidates = members.filter((member) => !list.includes(member));
    return (
      <div className="py-4" data-editing>
        <h2 className="type-label text-ink-secondary">Contributors</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {list.map((name) =>
            name === uploader ? (
              <span key={name}>{uploaderChip()}</span>
            ) : (
              <PersonChip
                key={name}
                name={name}
                onRemove={() => setList((current) => current.filter((item) => item !== name))}
              />
            ),
          )}
          {adding ? (
            <Select
              aria-label="Add someone"
              defaultValue=""
              onChange={(event) => {
                const chosen = event.target.value;
                if (chosen) setList((current) => [...current, chosen]);
                setAdding(false);
              }}
            >
              <option value="">Choose a person</option>
              {candidates.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </Select>
          ) : (
            <AddChip label="Add someone" onClick={() => setAdding(true)} />
          )}
        </div>
        {membersError && (
          <p className="mt-2 type-body-small text-alert-ink">Couldn't load the member list.</p>
        )}
        <EditActions onSave={() => { onSave(list); setEditing(false); }} onCancel={() => setEditing(false)} />
        <BlockedNotice message={blockedMessage} />
      </div>
    );
  }

  return (
    <div className="border-t border-hairline py-4 first:border-t-0">
      <RowHeader label="Contributors" onEdit={startEdit} />
      <div className="mt-2 flex flex-wrap gap-2">
        {contributors.map((name) =>
          name === uploader ? (
            <span key={name}>{uploaderChip()}</span>
          ) : (
            <PersonChip key={name} name={name} />
          ),
        )}
      </div>
    </div>
  );
}

/** One change from the SOP: read-only with the flagged numbers, or two inputs to edit. */
export function ChangeRow({
  change,
  startEditing,
  onSave,
  onRemoveChange,
  onEditingChange,
  blockedMessage,
  flagKeys,
  numbers,
  onKeep,
  onRemove,
}: RowNumbers & {
  change: WorkingChange;
  /** True for a change that was just added, which opens for editing. */
  startEditing: boolean;
  onSave: (what: string, reason: string | null) => void;
  onRemoveChange: () => void;
  onEditingChange: (open: boolean) => void;
  blockedMessage?: string;
}) {
  const [editing, setEditing] = useState(startEditing);
  // A change added in this session and never saved: Cancel removes it, as it has no earlier state.
  const [isNew, setIsNew] = useState(startEditing);
  const [what, setWhat] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  useReportOpen(editing, onEditingChange);

  function startEdit() {
    setWhat(change.what);
    setReason(change.reason ?? "");
    setError(undefined);
    setEditing(true);
  }

  function save() {
    const trimmed = what.trim();
    if (trimmed === "") {
      setError("Describe the change, or remove it.");
      return;
    }
    onSave(trimmed, reason.trim() === "" ? null : reason.trim());
    setIsNew(false);
    setEditing(false);
  }

  function cancel() {
    if (isNew) {
      onRemoveChange();
      return;
    }
    setError(undefined);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="border-t border-hairline py-4 first:border-t-0" data-editing>
        <Field label="What changed" error={error}>
          {(control) => <Input {...control} value={what} onChange={(e) => setWhat(e.target.value)} />}
        </Field>
        <div className="mt-4">
          <Field label="Why" optional>
            {(control) => <Input {...control} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        </div>
        <EditActions onSave={save} onCancel={cancel}>
          <Button variant="destructive-text" className="sm:ml-auto" onClick={onRemoveChange}>
            Remove this change
          </Button>
        </EditActions>
        <BlockedNotice message={blockedMessage} />
      </div>
    );
  }

  return (
    <div className="border-t border-hairline py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 type-body font-bold text-bench-ink">
          <NumberText text={change.what} mode="flag" keys={flagKeys} />
        </p>
        <Button variant="text" aria-label={`Edit change: ${change.what}`} onClick={startEdit} className="-my-2 -mr-3">
          Edit
        </Button>
      </div>
      <p className="mt-1 type-body-small text-ink-secondary">
        {change.reason ? (
          <>
            {reasonParts(change.reason).lead}
            <NumberText text={reasonParts(change.reason).text} mode="flag" keys={flagKeys} />
          </>
        ) : (
          <>
            No reason given.{" "}
            <Button variant="text" className="min-h-11 px-2" onClick={startEdit}>
              Add one
            </Button>
          </>
        )}
      </p>
      <NumberPanels numbers={numbers} onKeep={onKeep} onRemove={onRemove} />
    </div>
  );
}
