import { useCallback, useEffect, useState } from "react";
import { getMembers } from "../api/client";

export type MembersState = {
  members: string[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};

/** Loads the lab member list from GET /api/members. `retry` loads it again. */
export function useMembers(): MembersState {
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getMembers().then(
      (list) => {
        if (!active) return;
        setMembers(list);
        setError(false);
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError(true);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setAttempt((count) => count + 1);
  }, []);

  return { members, loading, error, retry };
}
