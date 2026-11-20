import type { AskResponse } from "../../api/types";

/**
 * "Your open questions" for this browser (SCREENS.md section 6). CP2 keeps them in localStorage;
 * the server does not store them yet (Needs from other parts, #9).
 */
export const OPEN_QUESTIONS_KEY = "labknow.openQuestions";

export type OpenQuestion = {
  id: string;
  requester: string;
  question: string;
  /** The answer the question was asked with. Null for a discussion saved without one. */
  response: AskResponse | null;
  /** People already asked, in order. */
  asked: string[];
  /** The person being asked now. Null after "Not solved" until another person is picked. */
  person: string | null;
  status: "asking" | "waiting";
  /** Set once a discussion has been saved for the question. */
  recordId: number | null;
};

function isOpenQuestion(value: unknown): value is OpenQuestion {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<OpenQuestion>;
  return typeof entry.id === "string" && typeof entry.requester === "string" && typeof entry.question === "string";
}

export function loadOpenQuestions(): OpenQuestion[] {
  try {
    const raw = window.localStorage.getItem(OPEN_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isOpenQuestion) : [];
  } catch {
    return [];
  }
}

export function saveOpenQuestions(list: OpenQuestion[]): void {
  try {
    window.localStorage.setItem(OPEN_QUESTIONS_KEY, JSON.stringify(list));
  } catch {
    // The list still shows for this visit; it is just not kept.
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function findQuestion(list: OpenQuestion[], requester: string, question: string): OpenQuestion | undefined {
  const wanted = question.trim();
  return list.find((entry) => entry.requester === requester && entry.question.trim() === wanted);
}

/** Asks `person` about the question, adding the question to the list if it is new. */
export function startAsking(
  list: OpenQuestion[],
  requester: string,
  question: string,
  response: AskResponse,
  person: string,
): OpenQuestion[] {
  const existing = findQuestion(list, requester, question);
  if (!existing) {
    return [
      ...list,
      {
        id: newId(),
        requester,
        question: question.trim(),
        response,
        asked: [],
        person,
        status: "asking",
        recordId: null,
      },
    ];
  }
  return list.map((entry) =>
    entry === existing
      ? { ...entry, person, status: "asking", recordId: null, response: entry.response ?? response }
      : entry,
  );
}

/** A discussion was sent to `person` for the question: it waits for them to confirm it. */
export function markWaiting(
  list: OpenQuestion[],
  requester: string,
  question: string,
  person: string,
  recordId: number | null,
): OpenQuestion[] {
  const existing = findQuestion(list, requester, question);
  if (!existing) {
    return [
      ...list,
      {
        id: newId(),
        requester,
        question: question.trim(),
        response: null,
        asked: [person],
        person,
        status: "waiting",
        recordId,
      },
    ];
  }
  return list.map((entry) =>
    entry === existing
      ? { ...entry, person, status: "waiting", recordId, asked: entry.asked.includes(person) ? entry.asked : [...entry.asked, person] }
      : entry,
  );
}

/** "Not solved": `person` is added to the asked list and left out until another person is picked. */
export function markNotSolved(list: OpenQuestion[], id: string, person: string): OpenQuestion[] {
  return list.map((entry) =>
    entry.id === id
      ? { ...entry, person: null, asked: entry.asked.includes(person) ? entry.asked : [...entry.asked, person] }
      : entry,
  );
}

export function removeQuestion(list: OpenQuestion[], id: string): OpenQuestion[] {
  return list.filter((entry) => entry.id !== id);
}

/** The link to save a discussion, prefilled with the question and the person. */
export function discussionPath(question: string, person: string): string {
  return `/discussions/new?${new URLSearchParams({ q: question, contributor: person }).toString()}`;
}
