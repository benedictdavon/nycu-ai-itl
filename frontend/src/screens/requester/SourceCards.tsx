import { Link } from "react-router";
import type { Info, LabRecord } from "../../api/types";
import { Avatar } from "../../components/Avatar";
import { Card } from "../../components/Card";
import { SourceNumber } from "../../components/SourceMarker";
import { linkClass } from "./linkStyles";

/** The original record info of each source, by record id. Null when it could not be loaded. */
export type SourceInfos = Record<number, Info | null | undefined>;

/**
 * The side column of the answer: one card per source. `linked` is false in hints mode, where the
 * cards have no links.
 */
export function SourceCards({
  records,
  infos,
  linked,
}: {
  records: LabRecord[];
  infos: SourceInfos;
  linked: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="type-headline text-bench-ink">Sources</h2>
      {records.map((record, index) => {
        const info = infos[record.id];
        return (
          <Card key={record.id}>
            <div className="flex items-start gap-3">
              <SourceNumber n={index + 1} />
              <div className="min-w-0 flex-1">
                <p className="type-title text-bench-ink">{record.procedure}</p>
                <ul className="mt-2 flex flex-wrap gap-3">
                  {record.contributors.map((name) => (
                    <li key={name} className="inline-flex items-center gap-2 type-label text-bench-ink">
                      <Avatar name={name} size={32} />
                      {name}
                    </li>
                  ))}
                </ul>
                {record.confirmed_by && (
                  <p className="mt-2 type-body-small text-coomassie-blue">Confirmed by {record.confirmed_by}</p>
                )}
                {record.project_tags.length > 0 && (
                  <ul aria-label="Project tags" className="mt-3 type-body-small text-ink-secondary">
                    {record.project_tags.map((tag, index) => (
                      <li key={tag} className="inline">
                        {index > 0 && <span aria-hidden="true"> · </span>}
                        {/* A single-word tag such as "pET-28a" must not break at its hyphen, while a
                            multi-word tag wraps at its spaces like normal text. */}
                        <span className={tag.includes(" ") ? undefined : "inline-block max-w-full"}>
                          {tag}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {linked ? (
                  <div className="mt-2 flex flex-wrap gap-x-5">
                    <Link to={`/records/${record.id}`} className={linkClass}>
                      Open record
                    </Link>
                    {info?.link && (
                      <a href={info.link} className={linkClass}>
                        Original
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 type-body-small text-ink-muted">
                    Links to the record appear with the full answer.
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
