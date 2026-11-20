import { firstName } from "./names";

/** Removes the markdown marks that would look odd in a plain message. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|[*_`]/g, "")
    .trim();
}

/**
 * The message a requester sends to the person they chose. The template is fixed (SCREENS.md
 * section 7): the question, what the records say, what they don't say, and a closing question.
 */
export function buildMessage(input: {
  person: string;
  question: string;
  answerText: string;
  uncertainties: string[];
}): string {
  const lines = [
    `Hi ${firstName(input.person)}! I have a question: ${input.question}`,
    "",
    `The records in LabKnow say: ${stripMarkdown(input.answerText)}`,
  ];
  if (input.uncertainties.length > 0) {
    lines.push("", "They don't say:", ...input.uncertainties.map((item) => `- ${item}`));
  }
  lines.push("", "Do you know?");
  return lines.join("\n");
}
