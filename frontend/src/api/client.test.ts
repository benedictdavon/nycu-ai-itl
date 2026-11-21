import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  ask,
  confirmRecord,
  createInfo,
  errorFields,
  getMembers,
  infoFileUrl,
  listRecords,
  suggestContributor,
  updateRecord,
} from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** The URL and init of the Nth fetch call, with the URL parsed so query strings are easy to check. */
function lastCall(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit | undefined];
  return { url: new URL(url, "http://labknow.test"), init: init ?? {} };
}

/** Each call gets a fresh Response, because a response body can only be read once. */
function stubFetch(respond: () => Response) {
  const fetchMock = vi.fn(async () => respond());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createInfo", () => {
  it("posts a text record as multipart form data with no file", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { info: {} }));

    await createInfo({
      contributor: "Alex Chen",
      title: "Transformation of strain X",
      text: "50 ng plasmid",
    });

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/infos");
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("contributor")).toBe("Alex Chen");
    expect(body.get("title")).toBe("Transformation of strain X");
    expect(body.get("text")).toBe("50 ng plasmid");
    expect(body.has("file")).toBe(false);
    expect(body.has("link")).toBe(false);
    expect(body.has("tags")).toBe(false);
  });

  it("posts a file record with the file and no text", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { info: {} }));
    const file = new File(["protocol"], "protocol.md", { type: "text/markdown" });

    await createInfo({ contributor: "Alex Chen", title: "Protocol", file });

    const body = lastCall(fetchMock).init.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toBe("protocol.md");
    expect(body.has("text")).toBe(false);
  });

  it("sends the link and tags when they are given, and leaves out blank ones", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { info: {} }));

    await createInfo({
      contributor: "Alex Chen",
      title: "Protocol",
      text: "steps",
      link: "  https://example.com/x  ",
      tags: "  plasmid, strain X ",
    });
    const filled = lastCall(fetchMock).init.body as FormData;
    expect(filled.get("link")).toBe("https://example.com/x");
    expect(filled.get("tags")).toBe("plasmid, strain X");

    await createInfo({ contributor: "Alex Chen", title: "Protocol", text: "steps", link: " ", tags: "" });
    const blank = lastCall(fetchMock, 1).init.body as FormData;
    expect(blank.has("link")).toBe(false);
    expect(blank.has("tags")).toBe(false);
  });
});

describe("listRecords", () => {
  it("sends the status and contributor as query parameters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, []));

    await listRecords({ status: "draft", contributor: "Alex Chen" });

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/records");
    expect(url.searchParams.get("status")).toBe("draft");
    expect(url.searchParams.get("contributor")).toBe("Alex Chen");
    expect(init.method).toBeUndefined();
  });

  it("sends no query string when there are no filters", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, []));

    await listRecords();

    expect(lastCall(fetchMock).url.search).toBe("");
  });
});

describe("confirmRecord", () => {
  it("posts the confirmer as JSON to the record's confirm route", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { id: 3, status: "confirmed" }));

    await confirmRecord(3, { confirmed_by: "Alex Chen" });

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/records/3/confirm");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ confirmed_by: "Alex Chen" });
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });
});

describe("ask", () => {
  it("posts the question, requester and hint mode as JSON", async () => {
    const fetchMock = stubFetch(
      () => jsonResponse(200, {
        answer: { kind: "answered", text: "", cited_record_ids: [], contributors: [], uncertainties: [] },
        sources: [],
      }),
    );

    await ask({ question: "How much plasmid?", requester: "Bea Lin", hint_mode: true });

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/ask");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      question: "How much plasmid?",
      requester: "Bea Lin",
      hint_mode: true,
    });
  });
});

describe("other endpoints", () => {
  it("updateRecord sends the draft with PUT", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, {}));
    await updateRecord(7, {
      procedure: "Transformation",
      based_on: null,
      contributors: ["Alex Chen"],
      project_tags: [],
      changes: [],
      troubleshooting: null,
      gaps: [],
    });
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/records/7");
    expect(init.method).toBe("PUT");
  });

  it("suggestContributor encodes the question in the query string", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { contributor: null }));
    await suggestContributor("how much plasmid & what temp?");
    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/api/suggest-contributor");
    expect(url.searchParams.get("q")).toBe("how much plasmid & what temp?");
    expect(init.method).toBeUndefined();
  });

  it("getMembers reads the list with GET", async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, ["Alex Chen"]));
    expect(await getMembers()).toEqual(["Alex Chen"]);
    expect(lastCall(fetchMock).url.pathname).toBe("/api/members");
  });

  it("infoFileUrl returns the download path", () => {
    expect(infoFileUrl(12)).toBe("/api/infos/12/file");
  });
});

describe("errors", () => {
  it("throws an ApiError with the status and the parsed detail on a 409", async () => {
    stubFetch(() => jsonResponse(409, { detail: "This record is already confirmed." }));

    const error = await confirmRecord(3, { confirmed_by: "Alex Chen" }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).detail).toBe("This record is already confirmed.");
  });

  it("throws an ApiError with status 0 when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

    const error = await getMembers().catch((err: unknown) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).detail).toBeNull();
  });

  it("uses a null detail when the error body is not JSON", async () => {
    stubFetch(() => new Response("<html>Bad Gateway</html>", { status: 503 }));

    const error = await getMembers().catch((err: unknown) => err);

    expect((error as ApiError).status).toBe(503);
    expect((error as ApiError).detail).toBeNull();
  });

  it("errorFields reads the field names from a 422 detail array", async () => {
    stubFetch(
      () => jsonResponse(422, {
        detail: [
          { type: "string_too_short", loc: ["body", "title"], msg: "String should have at least 1 character" },
          { type: "string_too_short", loc: ["body", "text"], msg: "String should have at least 1 character" },
        ],
      }),
    );

    const error = await createInfo({ contributor: "Alex Chen", title: "", text: "" }).catch(
      (err: unknown) => err,
    );

    expect(errorFields(error)).toEqual(["title", "text"]);
  });

  it("errorFields returns nothing for other errors", () => {
    expect(errorFields(new ApiError(409, "already confirmed"))).toEqual([]);
    expect(errorFields(new ApiError(422, "not a list"))).toEqual([]);
    expect(errorFields(new Error("boom"))).toEqual([]);
  });
});
