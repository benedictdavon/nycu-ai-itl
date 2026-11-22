import { vi } from "vitest";

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Handler = () => Response | Promise<Response>;

/**
 * Replaces fetch with one handler per path, for example `{"/api/members": () => jsonResponse(...)}`.
 * A path with no handler gets a 404, so a missing stub shows up as an error rather than a hang.
 */
export function stubApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const { pathname } = new URL(String(input), "http://labknow.test");
    const handler = handlers[pathname];
    if (!handler) return jsonResponse(404, { detail: `No test stub for ${pathname}` });
    return handler();
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
