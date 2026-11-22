import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/** The current person, kept in this browser only (SCREENS.md Global). */
export type MeValue = {
  me: string | null;
  setMe: (name: string) => void;
};

const STORAGE_KEY = "labknow.me";

const MeContext = createContext<MeValue | null>(null);

// Storage can be missing, blocked or full (private windows, cleared site data). The app still
// works without it: the name is then only kept for this page visit.
function readStoredMe(): string | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && stored.trim() ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredMe(name: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Keep going: the in-memory value below still updates the screen.
  }
}

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMeState] = useState<string | null>(readStoredMe);

  const setMe = useCallback((name: string) => {
    writeStoredMe(name);
    setMeState(name);
  }, []);

  const value = useMemo(() => ({ me, setMe }), [me, setMe]);
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeValue {
  const value = useContext(MeContext);
  if (value === null) {
    throw new Error("useMe must be used inside MeProvider");
  }
  return value;
}
