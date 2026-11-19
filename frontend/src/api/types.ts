// Mirrors backend/app/models.py. Change this file in the same PR as models.py, with the same names,
// fields and literal unions. Python `X | None` is `X | null` here, because pydantic sends null.
// `LabRecord` is the TypeScript name for models.Record: `Record` would shadow the built-in
// `Record<K, V>` type in every file that imports it.

export type Change = {
  what: string;
  reason: string | null;
};

export type Info = {
  id: number;
  kind: "upload" | "discussion";
  contributor: string;
  title: string;
  text: string;
  link: string | null;
  project_tags: string[];
  has_file: boolean;
};

export type RecordDraft = {
  procedure: string;
  based_on: string | null;
  contributors: string[];
  project_tags: string[];
  changes: Change[];
  troubleshooting: string | null;
  gaps: string[];
};

export type LabRecord = RecordDraft & {
  id: number;
  info_id: number;
  status: "draft" | "confirmed";
  confirmed_by: string | null;
};

export type FollowUp = {
  question: string;
  answer: string | null;
};

export type EncoderResult = {
  kind: "question" | "draft";
  question: string | null;
  draft: RecordDraft | null;
};

export type Hit = {
  record: LabRecord;
  score: number;
};

export type Answer = {
  kind: "answered" | "insufficient";
  text: string;
  cited_record_ids: number[];
  contributors: string[];
  uncertainties: string[];
};

export type EncodeState = {
  info: Info;
  follow_ups: FollowUp[];
  result: EncoderResult;
  record_id: number | null;
};

export type FollowUpAnswer = {
  answer: string;
};

export type ConfirmRequest = {
  confirmed_by: string;
};

export type RecordView = {
  record: LabRecord;
  info: Info;
};

export type AskRequest = {
  question: string;
  requester: string;
  hint_mode?: boolean;
};

export type AskResponse = {
  answer: Answer;
  sources: LabRecord[];
};

export type SuggestResponse = {
  contributor: string | null;
};

export type DiscussionCreate = {
  requester: string;
  contributor: string;
  question: string;
  text: string;
  link?: string | null;
};

export type Health = {
  status: "ok";
  llm_backend: "fake" | "ollama";
  llm_model: string;
};
