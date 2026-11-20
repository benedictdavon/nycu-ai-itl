import { Upload } from "lucide-react";
import { useId, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, createInfo, errorFields } from "../../api/client";
import { Card } from "../../components/Card";
import { ErrorCard } from "../../components/ErrorCard";
import { Field } from "../../components/Field";
import { Page } from "../../components/Page";
import { TwoColumn } from "../../components/TwoColumn";
import { WaitingCard } from "../../components/WaitingCard";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import { useMe } from "../../lib/me";

type Tab = "paste" | "file";

type FieldErrors = { title?: string; text?: string; file?: string };

type Failure = { kind: "model" } | { kind: "unreadable"; fileName: string } | { kind: "other" };

const TITLE_MISSING = "Add a title.";
const TEXT_MISSING = "Paste the record text, or upload a file instead.";
const FILE_MISSING = "Choose a file, or paste the text instead.";
const TITLE_OR_TEXT_MISSING = "Fill in the title and the record text.";

const STEPS = [
  "LabKnow reads your record and drafts a summary: the procedure, what changed from the SOP and why, and what went wrong.",
  "If something is unclear, it asks you, one question at a time, two at most.",
  "You fix the draft and confirm it. Then labmates can find it when they ask.",
];

/** Add a record: /add. Paste the text or upload a file, then the model drafts it (SCREENS.md section 2). */
export default function AddScreen() {
  const { me } = useMe();
  const navigate = useNavigate();
  const fileErrorId = useId();
  const [title, setTitle] = useState("");
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [pending, setPending] = useState(false);

  function submit() {
    if (me === null || pending) return;

    const problems: FieldErrors = {};
    if (title.trim() === "") problems.title = TITLE_MISSING;
    if (tab === "paste" && text.trim() === "") problems.text = TEXT_MISSING;
    if (tab === "file" && file === null) problems.file = FILE_MISSING;
    setErrors(problems);
    if (problems.title || problems.text || problems.file) return;

    setFailure(null);
    setPending(true);
    const common = { contributor: me, title: title.trim(), link, tags };
    const request =
      tab === "file" && file !== null
        ? createInfo({ ...common, file })
        : createInfo({ ...common, text });

    request.then(
      (state) => {
        if (state.result.kind === "question") {
          navigate(`/add/${state.info.id}`);
        } else if (state.record_id !== null) {
          navigate(`/review/${state.record_id}`, { state: { fromAdd: true } });
        } else {
          setPending(false);
          setFailure({ kind: "other" });
        }
      },
      (err: unknown) => {
        setPending(false);
        if (err instanceof ApiError && err.status === 503) {
          setFailure({ kind: "model" });
        } else if (
          tab === "file" &&
          file !== null &&
          err instanceof ApiError &&
          (err.status === 422 || err.status === 415)
        ) {
          setFailure({ kind: "unreadable", fileName: file.name });
        } else if (tab === "paste" && err instanceof ApiError && err.status === 422) {
          const fields = errorFields(err);
          const mapped: FieldErrors = {};
          if (fields.includes("title")) mapped.title = TITLE_MISSING;
          if (fields.includes("text")) mapped.text = TEXT_MISSING;
          setErrors(Object.keys(mapped).length > 0 ? mapped : { title: TITLE_OR_TEXT_MISSING });
        } else {
          setFailure({ kind: "other" });
        }
      },
    );
  }

  const failureView =
    failure?.kind === "model" ? (
      <ErrorCard
        title="Can't reach the model"
        action={
          <Button variant="secondary" onClick={submit}>
            Try again
          </Button>
        }
      >
        Nothing was drafted. What you typed is still in the form. Try again in a minute. If it keeps
        failing, the model server may be down.
      </ErrorCard>
    ) : failure?.kind === "unreadable" ? (
      <ErrorCard
        title={`No text found in ${failure.fileName}`}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setTab("paste");
              setFailure(null);
            }}
          >
            Paste text instead
          </Button>
        }
      >
        It looks like scanned pages or photos, which LabKnow can't read yet. Paste a short summary as
        text instead.
      </ErrorCard>
    ) : failure?.kind === "other" ? (
      <ErrorCard
        title="Couldn't add the record"
        action={
          <Button variant="secondary" onClick={submit}>
            Try again
          </Button>
        }
      />
    ) : null;

  const main = (
    <>
      {pending && (
        <div className="mb-6">
          <WaitingCard
            title="Drafting your record"
            note="You can leave this page. The draft will wait in To review."
          />
        </div>
      )}
      {failureView && <div className="mb-6">{failureView}</div>}

      <Card>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field label="Title" error={errors.title}>
            {(control) => (
              <Input
                {...control}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            )}
          </Field>

          <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
            <TabsList aria-label="How to add the record">
              <TabsTrigger value="paste">Paste text</TabsTrigger>
              <TabsTrigger value="file">Upload a file</TabsTrigger>
            </TabsList>

            <TabsContent value="paste" className="mt-4">
              <Field
                label="Record text"
                hint="Paste from Benchling, your notes or a chat. Short and messy is fine."
                error={errors.text}
              >
                {(control) => (
                  <Textarea
                    {...control}
                    required
                    rows={6}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                )}
              </Field>
            </TabsContent>

            <TabsContent value="file" className="mt-4">
              <label
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const dropped = event.dataTransfer.files[0];
                  if (dropped) setFile(dropped);
                }}
                className="flex min-h-42 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-field-edge bg-paper-sunk p-6 text-center"
              >
                <Upload aria-hidden="true" className="size-7 text-coomassie-blue" />
                <span className="type-label text-bench-ink">Drop a file here, or choose one</span>
                <span className="type-body-small text-ink-muted">
                  PDF, Word (.docx), text or Markdown, including Benchling exports. Scanned pages and
                  photos can't be read yet.
                </span>
                {file !== null && <span className="type-label text-bench-ink">{file.name}</span>}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="sr-only"
                  aria-describedby={errors.file ? fileErrorId : undefined}
                  aria-invalid={errors.file ? true : undefined}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {errors.file && (
                <p id={fileErrorId} role="alert" className="mt-2 type-body-small text-alert-ink">
                  {errors.file}
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap gap-x-5 gap-y-6">
            <div className="min-w-0 flex-[2_1_280px]">
              <Field label="Link to the original" optional>
                {(control) => (
                  <Input
                    {...control}
                    type="url"
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                  />
                )}
              </Field>
            </div>
            <div className="min-w-0 flex-[1_1_200px]">
              <Field label="Project tags" optional hint="Separate tags with commas">
                {(control) => (
                  <Input
                    {...control}
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-hairline pt-5">
            <Button type="submit" disabled={pending}>
              Draft the record
            </Button>
            <p className="type-body-small text-ink-muted">
              Credited to you, {me}. Nobody else sees it until you confirm.
            </p>
          </div>
        </form>
      </Card>
    </>
  );

  const side = (
    <>
      <h2 className="type-headline text-bench-ink">What happens next</h2>
      <ol className="mt-3 flex flex-col gap-3.5">
        {STEPS.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-pill bg-sage-chip type-label text-bench-ink"
            >
              {index + 1}
            </span>
            <span className="type-body text-bench-ink">{step}</span>
          </li>
        ))}
      </ol>
      <Card className="mt-6">
        <h2 className="type-title text-bench-ink">Your record stays in the lab</h2>
        <p className="mt-2 type-body-small text-ink-secondary">
          It is read by a model the team runs on its own computer, not sent to an outside AI service.
        </p>
      </Card>
    </>
  );

  return (
    <Page>
      <h1 className="type-display text-bench-ink">Add a record</h1>
      <p className="mt-3 max-w-[62ch] type-body text-ink-secondary">
        Share a record of an experiment as it is. LabKnow drafts a summary, may ask you up to two
        questions, and you check the summary before anyone else can find it.
      </p>
      <div className="mt-8">
        <TwoColumn main={main} side={side} />
      </div>
    </Page>
  );
}
