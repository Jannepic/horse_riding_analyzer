/** Removes headers and footers by frequency and rejoins hyphenated words. */

const CONNECTORS = /^(und|oder|bzw|sowie|beziehungsweise)\b/i;

export const REPEAT_THRESHOLD = 0.3;

export function cleanPage(raw: string): string {
  let text = raw.replace(
    /(\p{Ll})[-‐‑]\s*\n\s*(\p{Ll}+)/gu,
    (m, a: string, b: string) => (CONNECTORS.test(b) ? m : `${a}${b}`),
  );

  text = text.replace(
    /(\p{Ll})[-‐‑] (\p{Ll}+)/gu,
    (m, a: string, b: string) => (CONNECTORS.test(b) ? m : `${a}${b}`),
  );

  return text
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isStructuralNoise(line: string): boolean {
  return (
    /^\d+\s*\|\s*P\s*a\s*g\s*e$/i.test(line) ||
    /^Seite\s+\d+(\s+von\s+\d+)?$/i.test(line) ||
    /^-?\s*\d{1,3}\s*-?$/.test(line) ||
    /^(Abb|Abbildung|Fig|Figure|Tab|Tabelle)\.?\s*\d+[:.]/i.test(line)
  );
}

export function cleanDocument(pages: string[]): string[] {
  const normalise = (l: string) => l.replace(/\s*\d{1,3}\s*$/, "").trim().toLowerCase();

  const counts = new Map<string, number>();
  for (const page of pages) {
    const seen = new Set<string>();
    for (const line of cleanPage(page).split("\n")) {
      const key = normalise(line);
      if (key.length < 4 || seen.has(key)) continue;
      seen.add(key);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const minPages = Math.max(3, Math.ceil(pages.length * REPEAT_THRESHOLD));
  const furniture = new Set(
    [...counts].filter(([, n]) => n >= minPages).map(([key]) => key),
  );

  return pages.map((page) =>
    cleanPage(page)
      .split("\n")
      .filter((line) => !furniture.has(normalise(line)) && !isStructuralNoise(line))
      .join("\n")
      .trim(),
  );
}
