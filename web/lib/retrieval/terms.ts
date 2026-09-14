/** Builds an OR-joined search query from free text. Pure logic, no I/O. */

const MIN_TERM_LENGTH = 3;

const MAX_TERMS = 20;

const RESERVED = new Set(["or", "and", "not"]);

export function toOrQuery(text: string): string {
  const terms = [
    ...new Set(
      text
        .split(/[^\p{L}\p{N}]+/u)
        .map((t) => t.trim())
        .filter((t) => t.length >= MIN_TERM_LENGTH && !RESERVED.has(t.toLowerCase())),
    ),
  ].slice(0, MAX_TERMS);

  return terms.join(" or ");
}
