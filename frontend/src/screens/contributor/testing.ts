// Test helpers for the contributor screens. Not used by the app.
import { vi } from "vitest";
import { jsonResponse } from "../../test/api";

export { jsonResponse };

/** One request the screen made, so a test can check its method, path, query and body. */
export type Call = {
  method: string;
  path: string;
  search: URLSearchParams;
  body: unknown;
};

/**
 * Replaces fetch with one responder for every request. The responder sees the whole call (path,
 * query string and JSON body), so one test can answer GET /api/records differently for drafts and
 * for confirmed records.
 */
export function stubFetch(respond: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://labknow.test");
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : init?.body;
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname,
      search: url.searchParams,
      body,
    };
    calls.push(call);
    return respond(call);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls };
}

/** A FastAPI-style error body. */
export function errorResponse(status: number, detail: unknown = "error"): Response {
  return jsonResponse(status, { detail });
}

/** The requests made so far, as "METHOD path", without the GET calls. */
export function writes(calls: Call[]): string[] {
  return calls.filter((call) => call.method !== "GET").map((call) => `${call.method} ${call.path}`);
}
