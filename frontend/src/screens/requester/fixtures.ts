import type { AskResponse, Info, LabRecord } from "../../api/types";

export const ME = "Chris Wu";

export const MEMBERS = ["Alex Chen", "Bea Lin", "Chris Wu", "Dana Huang", "Prof. Evan Lee"];

export const SOURCE: LabRecord = {
  id: 1,
  info_id: 1,
  status: "confirmed",
  confirmed_by: "Alex Chen",
  procedure: "Transformation of strain X with plasmid P",
  based_on: 'Drive SOP "Transformation v2"',
  contributors: ["Alex Chen"],
  project_tags: ["Project X"],
  changes: [
    {
      what: "Wash volume doubled",
      reason: "The cells clumped with the SOP wash volume. Used 50 ng plasmid.",
    },
  ],
  troubleshooting: null,
  gaps: ["Antibiotic and plate used for selection"],
};

export const INFO: Info = {
  id: 1,
  kind: "upload",
  contributor: "Alex Chen",
  title: "Transformation of strain X",
  text: "Original text of the record.",
  link: null,
  project_tags: [],
  has_file: false,
};

export function answered(text: string, records: LabRecord[] = [SOURCE]): AskResponse {
  return {
    answer: {
      kind: "answered",
      text,
      cited_record_ids: records.map((record) => record.id),
      contributors: ["Alex Chen"],
      uncertainties: [],
    },
    sources: records,
  };
}

export function insufficient(): AskResponse {
  return {
    answer: {
      kind: "insufficient",
      text: "I could not find a confirmed record about this.",
      cited_record_ids: [],
      contributors: [],
      uncertainties: ["No confirmed record matches the question."],
    },
    sources: [],
  };
}
