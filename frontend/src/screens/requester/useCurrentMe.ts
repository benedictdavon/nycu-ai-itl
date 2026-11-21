import { useMe } from "../../lib/me";

/**
 * The current person's name for the requester screens. RequireMe sends people without a name to
 * /who, so these screens always have one.
 */
export function useCurrentMe(): string {
  const { me } = useMe();
  if (me === null) {
    throw new Error("Requester screens need a current person; RequireMe should prevent this.");
  }
  return me;
}
