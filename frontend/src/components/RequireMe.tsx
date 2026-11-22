import { Navigate, Outlet } from "react-router";
import { useMe } from "../lib/me";

/** Sends people to /who until a name is picked. Wraps every route except /who. */
export function RequireMe() {
  const { me } = useMe();
  if (me === null) {
    return <Navigate to="/who" replace />;
  }
  return <Outlet />;
}
