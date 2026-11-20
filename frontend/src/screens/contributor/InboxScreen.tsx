import { ChevronRight, FileText, MessagesSquare, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { getRecord, listRecords } from "../../api/client";
import type { Info, LabRecord } from "../../api/types";
import { Card } from "../../components/Card";
import { ErrorCard } from "../../components/ErrorCard";
import { Page } from "../../components/Page";
import { TapeLabel } from "../../components/TapeLabel";
import { Button, buttonVariants } from "../../components/ui/button";
import { useMe } from "../../lib/me";

type DraftItem = { record: LabRecord; info: Info | null };

type LoadState =
  | { status: "loading" }
  | { status: "ready"; drafts: DraftItem[]; confirmed: LabRecord[] }
  | { status: "error" };

/** The origin line of a draft: where it came from. Null when its record could not be loaded. */
function originOf(info: Info | null, me: string): { icon: LucideIcon; text: string } | null {
  if (info === null) return null;
  if (info.kind === "discussion") {
    return { icon: MessagesSquare, text: "From a saved discussion" };
  }
  return {
    icon: FileText,
    text: info.contributor === me ? "Your upload" : `Upload by ${info.contributor}`,
  };
}

/** To review: /inbox. Drafts waiting for this person, and the records they confirmed (SCREENS.md section 5). */
export default function InboxScreen() {
  const { me } = useMe();
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (me === null) return;
    let active = true;
    Promise.all([
      listRecords({ status: "draft", contributor: me }),
      // The confirmed list is extra: if it fails, the section is left out.
      listRecords({ status: "confirmed", contributor: me }).catch((): LabRecord[] => []),
    ]).then(
      async ([drafts, confirmed]) => {
        const items = await Promise.all(
          drafts.map((record) =>
            getRecord(record.id).then(
              (view) => ({ record, info: view.info }),
              () => ({ record, info: null }),
            ),
          ),
        );
        if (active) {
          setLoad({
            status: "ready",
            drafts: items,
            confirmed: confirmed.filter((record) => record.confirmed_by === me),
          });
        }
      },
      () => {
        if (active) setLoad({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [me, attempt]);

  const currentPerson = me ?? "";

  let drafts: ReactNode;
  if (load.status === "loading") {
    drafts = (
      <div aria-busy="true" className="space-y-3">
        {[0, 1].map((row) => (
          <div key={row} aria-hidden="true" className="h-24 rounded-lg border border-hairline bg-bench-grey" />
        ))}
      </div>
    );
  } else if (load.status === "error") {
    drafts = (
      <ErrorCard
        title="Couldn't load your drafts"
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
    );
  } else if (load.drafts.length === 0) {
    drafts = (
      <Card>
        <h2 className="type-title text-bench-ink">You're all caught up</h2>
        <p className="mt-2 type-body text-ink-secondary">
          Questions and drafts show up here when you add a record or when someone saves a discussion
          they had with you.
        </p>
        <div className="mt-5">
          <Link to="/add" className={buttonVariants({ variant: "primary" })}>
            Add a record
          </Link>
        </div>
      </Card>
    );
  } else {
    drafts = (
      <section aria-labelledby="drafts-heading">
        <h2 id="drafts-heading" className="type-headline text-bench-ink">
          Drafts to check
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {load.drafts.map(({ record, info }) => {
            const origin = originOf(info, currentPerson);
            const OriginIcon = origin?.icon;
            const gaps = record.gaps.length;
            return (
              <li key={record.id}>
                <Link
                  to={`/review/${record.id}`}
                  className="block rounded-lg border border-hairline bg-paper p-5 shadow-rest transition-shadow duration-quick ease-out hover:shadow-lift focus-visible:shadow-lift sm:px-6 sm:py-5"
                >
                  {origin && OriginIcon && (
                    <p className="flex items-center gap-2 type-label text-ink-secondary">
                      <OriginIcon aria-hidden="true" className="size-4 shrink-0" />
                      {origin.text}
                    </p>
                  )}
                  <div className="mt-2 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="type-title text-bench-ink">{record.procedure}</p>
                      {gaps > 0 && (
                        <div className="mt-3">
                          <TapeLabel>{gaps === 1 ? "1 gap" : `${gaps} gaps`}</TapeLabel>
                        </div>
                      )}
                    </div>
                    <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-coomassie-blue" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <Page>
      <h1 className="type-display text-bench-ink">To review</h1>
      <p className="mt-3 max-w-[62ch] type-body text-ink-secondary">
        Questions and drafts waiting for you. Labmates can't find a record until you confirm it.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {drafts}

        {load.status === "ready" && load.confirmed.length > 0 && (
          <section aria-labelledby="confirmed-heading">
            <h2 id="confirmed-heading" className="type-headline text-bench-ink">
              Confirmed by you
            </h2>
            <ul className="mt-3 divide-y divide-rule">
              {load.confirmed.map((record) => (
                <li key={record.id}>
                  <Link
                    to={`/records/${record.id}`}
                    className="flex min-h-13 items-center justify-between gap-3 py-3 type-label text-bench-ink transition-colors duration-quick ease-out hover:text-coomassie-blue"
                  >
                    <span className="min-w-0">{record.procedure}</span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-secondary" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}
