import { useNavigate } from "react-router";
import { Avatar } from "../components/Avatar";
import { ErrorCard } from "../components/ErrorCard";
import { Page } from "../components/Page";
import { useMe } from "../lib/me";
import { cn } from "../lib/utils";
import { useMembers } from "../lib/useMembers";
import { Button } from "../components/ui/button";

const SKELETON_ROWS = 5;

/** Who are you: /who. Picking a name saves it and goes to /ask. */
export default function WhoScreen() {
  const navigate = useNavigate();
  const { me, setMe } = useMe();
  const { members, loading, error, retry } = useMembers();

  function pick(name: string) {
    setMe(name);
    navigate("/ask");
  }

  return (
    <Page>
      <div className="max-w-[560px]">
        <h1 className="type-display text-bench-ink">Who are you?</h1>
        <p className="mt-3 type-body text-ink-secondary">
          Pick your name. LabKnow uses it to credit the records you add and to show you drafts to
          check. This prototype has no passwords.
        </p>

        <div className="mt-8">
          {error && (
            <ErrorCard
              title="Couldn't load the member list"
              action={
                <Button variant="secondary" onClick={retry}>
                  Try again
                </Button>
              }
            />
          )}

          {!error && (
            <ul
              aria-busy={loading ? "true" : undefined}
              className="flex flex-col gap-2"
            >
              {loading &&
                Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <li
                    key={index}
                    aria-hidden="true"
                    className="min-h-[60px] rounded-md border border-hairline bg-bench-grey"
                  />
                ))}
              {!loading &&
                members.map((name) => {
                  const isLast = name === me;
                  return (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => pick(name)}
                        className={cn(
                          "flex min-h-[60px] w-full cursor-pointer items-center gap-3.5 rounded-md bg-paper px-4 py-2.5 text-left text-bench-ink shadow-rest transition-[border-color,box-shadow] duration-quick ease-out enabled:hover:shadow-lift",
                          isLast
                            ? "border-2 border-coomassie-blue"
                            : "border border-hairline enabled:hover:border-field-edge",
                        )}
                      >
                        <Avatar name={name} tone={isLast ? "current" : "neutral"} />
                        <span className="type-label">{name}</span>
                        {isLast && (
                          <span className="ml-auto type-body-small text-ink-muted">
                            Last used on this browser
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        <p className="mt-6 type-body-small text-ink-muted">
          You can switch from the top bar at any time. Your name is kept in this browser only.
        </p>
      </div>
    </Page>
  );
}
