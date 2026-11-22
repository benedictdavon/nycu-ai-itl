import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { listRecords } from "../api/client";
import { useMe } from "../lib/me";
import { cn } from "../lib/utils";
import { Avatar } from "./Avatar";
import { ToastProvider } from "./Toast";

type NavItem = {
  to: string;
  label: string;
  isActive: (path: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/ask", label: "Ask", isActive: (path) => path === "/ask" },
  {
    to: "/add",
    label: "Add a record",
    isActive: (path) => path === "/add" || path.startsWith("/add/"),
  },
  {
    to: "/inbox",
    label: "To review",
    isActive: (path) => path === "/inbox" || path.startsWith("/review/"),
  },
];

/** The number of drafts waiting for this person. Hidden on error. */
function useDraftCount(me: string | null, path: string, enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || me === null) return;
    let active = true;
    listRecords({ status: "draft", contributor: me }).then(
      (drafts) => {
        if (active) setCount(drafts.length);
      },
      () => {
        if (active) setCount(0);
      },
    );
    return () => {
      active = false;
    };
  }, [me, path, enabled]);

  return count;
}

/**
 * The header, the page in `<main>`, and the toast provider. The header shows only the wordmark on
 * /who, as on the Start board.
 */
export function Shell() {
  const { me } = useMe();
  const { pathname } = useLocation();
  const showNav = pathname !== "/who" && me !== null;
  const draftCount = useDraftCount(me, pathname, showNav);

  return (
    <ToastProvider>
      <header className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
          <Link
            to="/ask"
            className="mr-auto inline-flex min-h-11 items-center font-display text-[1.375rem] font-bold tracking-[-0.01em] text-bench-ink sm:mr-0"
          >
            LabKnow
          </Link>

          {showNav && me !== null && (
            <>
              <nav
                aria-label="Main"
                className="order-last grid w-full grid-cols-3 gap-1 sm:order-none sm:flex sm:w-auto sm:grid-cols-none"
              >
                {NAV_ITEMS.map((item) => {
                  const active = item.isActive(pathname);
                  const isReview = item.to === "/inbox";
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-center type-label transition-colors duration-quick ease-out sm:px-3.5",
                        active
                          ? "bg-coomassie-wash text-coomassie-blue"
                          : "text-bench-ink hover:bg-sage-chip",
                      )}
                    >
                      {item.label}
                      {isReview && draftCount > 0 && (
                        <span className="inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-pill bg-label-tape px-1.5 type-label text-tape-ink">
                          {draftCount}
                          <span className="sr-only">
                            {draftCount === 1 ? " draft to check" : " drafts to check"}
                          </span>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <Link
                to="/who"
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md px-2 type-label text-bench-ink transition-colors duration-quick ease-out hover:bg-sage-chip"
              >
                <Avatar name={me} tone="current" size={32} />
                <span className="sr-only sm:not-sr-only">{me}</span>
                <span className="type-body-small text-ink-muted">Switch</span>
              </Link>
            </>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </ToastProvider>
  );
}
