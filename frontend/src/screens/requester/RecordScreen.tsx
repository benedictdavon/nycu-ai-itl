import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, getRecord, infoFileUrl } from "../../api/client";
import type { RecordView } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/Card";
import { TagChip } from "../../components/Chip";
import { ErrorCard } from "../../components/ErrorCard";
import { GapPanel } from "../../components/GapPanel";
import { Page } from "../../components/Page";
import { TwoColumn } from "../../components/TwoColumn";
import { Button } from "../../components/ui/button";
import { linkClass } from "./linkStyles";
import { useCurrentMe } from "./useCurrentMe";
import { firstName } from "./names";

type Load = { key: string; view?: RecordView; error?: unknown };

/** Record view: /records/:recordId (SCREENS.md section 9). */
export default function RecordScreen() {
  const { recordId } = useParams();
  const me = useCurrentMe();
  const id = Number(recordId);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load | null>(null);
  const key = `${recordId}:${attempt}`;

  useEffect(() => {
    if (!Number.isInteger(id)) return;
    let active = true;
    getRecord(id).then(
      (view) => {
        if (active) setLoad({ key, view });
      },
      (error: unknown) => {
        if (active) setLoad({ key, error });
      },
    );
    return () => {
      active = false;
    };
  }, [id, key]);

  if (!Number.isInteger(id)) {
    return (
      <Page>
        <ErrorCard title="Couldn't find this record">
          <Link to="/ask" className={linkClass}>
            Go to Ask
          </Link>
        </ErrorCard>
      </Page>
    );
  }

  if (load === null || load.key !== key) {
    return (
      <Page>
        <p aria-busy="true" className="type-body text-ink-muted">
          Loading the record.
        </p>
      </Page>
    );
  }

  if (load.error !== undefined) {
    if (load.error instanceof ApiError && load.error.status === 404) {
      return (
        <Page>
          <ErrorCard title="Couldn't find this record">
            <Link to="/ask" className={linkClass}>
              Go to Ask
            </Link>
          </ErrorCard>
        </Page>
      );
    }
    return (
      <Page>
        <ErrorCard
          title="Couldn't load this record"
          action={
            <Button variant="secondary" onClick={() => setAttempt((count) => count + 1)}>
              Try again
            </Button>
          }
        />
      </Page>
    );
  }

  const view = load.view;
  if (!view) return null;
  const { record, info } = view;

  if (record.status === "draft") {
    return (
      <Page>
        <h1 className="type-display text-bench-ink">This record isn&apos;t confirmed yet</h1>
        {record.contributors.includes(me) && (
          <div className="mt-6">
            <Link to={`/review/${record.id}`} className={linkClass}>
              Check the draft
            </Link>
          </div>
        )}
      </Page>
    );
  }

  const main = (
    <div className="flex flex-col gap-8">
      <div>
        {record.confirmed_by && (
          <p className="type-body-small text-coomassie-blue">Confirmed by {record.confirmed_by}</p>
        )}
        <h1 className="mt-2 type-display text-bench-ink">{record.procedure}</h1>
        {record.based_on && <p className="mt-3 type-body text-ink-secondary">Based on {record.based_on}</p>}
      </div>

      {record.changes.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="type-headline text-bench-ink">Changed from the SOP</h2>
          <ul className="flex flex-col gap-4">
            {record.changes.map((change, index) => (
              <li key={`${index}-${change.what}`} className="flex flex-col gap-1">
                <p className="type-body text-bench-ink">
                  <b>{change.what}</b>
                </p>
                <p className="type-body-small text-ink-secondary">
                  {change.reason ? `Because ${change.reason}` : "No reason recorded."}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {record.troubleshooting !== null && (
        <section className="flex flex-col gap-3">
          <h2 className="type-headline text-bench-ink">What went wrong, and the fix</h2>
          <p className="type-body text-bench-ink whitespace-pre-line">{record.troubleshooting}</p>
        </section>
      )}

      {record.gaps.length > 0 && (
        <GapPanel heading={`Ask ${firstName(record.contributors[0] ?? "")} if you need these`}>
          <ul className="list-disc pl-5 type-body">
            {record.gaps.map((gap, index) => (
              <li key={`${index}-${gap}`}>{gap}</li>
            ))}
          </ul>
        </GapPanel>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="type-headline text-bench-ink">Contributors</h2>
        <ul className="flex flex-wrap gap-3">
          {record.contributors.map((name) => (
            <li key={name} className="inline-flex items-center gap-2 type-label text-bench-ink">
              <Avatar name={name} size={32} />
              {name}
            </li>
          ))}
        </ul>
      </section>

      {record.project_tags.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="type-headline text-bench-ink">Project</h2>
          <div className="flex flex-wrap gap-2">
            {record.project_tags.map((tag) => (
              <TagChip key={tag} label={tag} />
            ))}
          </div>
        </section>
      )}
    </div>
  );

  const side = (
    <Card>
      <h2 className="type-headline text-bench-ink">Original record</h2>
      <p className="mt-2 type-body-small text-ink-secondary">Added by {info.contributor}</p>
      <p className="mt-4 type-body text-bench-ink whitespace-pre-line">{info.text}</p>
      <div className="mt-5 flex flex-col gap-2">
        {info.link && (
          <a href={info.link} className={linkClass}>
            Open in Benchling
          </a>
        )}
        {info.has_file ? (
          <a href={infoFileUrl(info.id)} download className={linkClass}>
            Download the original file
          </a>
        ) : (
          <p className="type-body-small text-ink-muted">
            Added as pasted text, so there is no file to download.
          </p>
        )}
      </div>
    </Card>
  );

  return (
    <Page>
      <TwoColumn main={main} side={side} />
    </Page>
  );
}
