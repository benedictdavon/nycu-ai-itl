const TITLE_WORD = /^(prof|dr|mr|ms|mrs)\.?$/i;

/** The first name, skipping a title: "Prof. Evan Lee" gives "Evan". */
export function firstName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const rest = words.filter((word) => !TITLE_WORD.test(word));
  return rest[0] ?? words[0] ?? name;
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
