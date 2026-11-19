// One function per endpoint in docs/cp2/api.md. Paths are relative, so the Vite dev proxy and the
// FastAPI server both serve them.
import type {
  AskRequest,
  AskResponse,
  ConfirmRequest,
  DiscussionCreate,
  EncodeState,
  FollowUpAnswer,
  Health,
  LabRecord,
  RecordDraft,
  RecordView,
  SuggestResponse,
} from "./types";

/** A failed request. `status` is 0 when the network failed before any response. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function readDetail(response: Response): Promise<unknown> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "detail" in body) {
      return body.detail;
    }
    return null;
  } catch {
    return null;
  }
}

/** One request, with the error handling every endpoint shares. */
async function send<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError(0, null);
  }
  if (!response.ok) {
    throw new ApiError(response.status, await readDetail(response));
  }
  return (await response.json()) as T;
}

function get<T>(path: string): Promise<T> {
  return send<T>(path);
}

function sendJson<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<T> {
  return send<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * The field names in a FastAPI 422 `detail` array (`[{loc: [..., "field"], msg}]`), so a screen can
 * show its own message under each field. Returns [] for any other error.
 */
export function errorFields(err: unknown): string[] {
  if (!(err instanceof ApiError) || err.status !== 422 || !Array.isArray(err.detail)) {
    return [];
  }
  const fields: string[] = [];
  for (const item of err.detail as unknown[]) {
    if (typeof item !== "object" || item === null || !("loc" in item)) continue;
    const loc = (item as { loc: unknown }).loc;
    if (!Array.isArray(loc)) continue;
    const named = loc.filter((part): part is string => typeof part === "string");
    const field = named[named.length - 1];
    if (field !== undefined && !fields.includes(field)) {
      fields.push(field);
    }
  }
  return fields;
}

export function getHealth(): Promise<Health> {
  return get<Health>("/api/health");
}

export function getMembers(): Promise<string[]> {
  return get<string[]>("/api/members");
}

type CreateInfoBase = {
  contributor: string;
  title: string;
  link?: string;
  tags?: string;
};

/** Send exactly one of `text` or `file`. */
export type CreateInfoInput =
  | (CreateInfoBase & { text: string; file?: undefined })
  | (CreateInfoBase & { file: File; text?: undefined });

export function createInfo(input: CreateInfoInput): Promise<EncodeState> {
  const form = new FormData();
  form.append("contributor", input.contributor);
  form.append("title", input.title);
  if (input.file !== undefined) {
    form.append("file", input.file);
  } else {
    form.append("text", input.text);
  }
  if (input.link?.trim()) {
    form.append("link", input.link.trim());
  }
  if (input.tags?.trim()) {
    form.append("tags", input.tags.trim());
  }
  return send<EncodeState>("/api/infos", { method: "POST", body: form });
}

export function getInfo(id: number): Promise<EncodeState> {
  return get<EncodeState>(`/api/infos/${id}`);
}

export function answerFollowUp(id: number, body: FollowUpAnswer): Promise<EncodeState> {
  return sendJson<EncodeState>(`/api/infos/${id}/follow-ups`, "POST", body);
}

/** The URL of the original file, for a download link. */
export function infoFileUrl(id: number): string {
  return `/api/infos/${id}/file`;
}

export function listRecords(
  filter: { status?: "draft" | "confirmed"; contributor?: string } = {},
): Promise<LabRecord[]> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.contributor) params.set("contributor", filter.contributor);
  const query = params.toString();
  return get<LabRecord[]>(`/api/records${query ? `?${query}` : ""}`);
}

export function getRecord(id: number): Promise<RecordView> {
  return get<RecordView>(`/api/records/${id}`);
}

export function updateRecord(id: number, draft: RecordDraft): Promise<LabRecord> {
  return sendJson<LabRecord>(`/api/records/${id}`, "PUT", draft);
}

export function confirmRecord(id: number, body: ConfirmRequest): Promise<LabRecord> {
  return sendJson<LabRecord>(`/api/records/${id}/confirm`, "POST", body);
}

export function ask(body: AskRequest): Promise<AskResponse> {
  return sendJson<AskResponse>("/api/ask", "POST", body);
}

export function suggestContributor(q: string): Promise<SuggestResponse> {
  const params = new URLSearchParams({ q });
  return get<SuggestResponse>(`/api/suggest-contributor?${params.toString()}`);
}

export function createDiscussion(body: DiscussionCreate): Promise<EncodeState> {
  return sendJson<EncodeState>("/api/discussions", "POST", body);
}
