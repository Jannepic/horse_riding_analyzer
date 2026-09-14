/** Splits a document into chunks — by heading or by paragraph. */

export type ChunkStrategy = "heading" | "paragraph";

export type ChunkMetadata = {
  lesson?: string;

  section?: string;

  page: number;

  pageEnd: number;
  source: string;
  strategy: ChunkStrategy;
};

export type RawChunk = {
  content: string;
  language: "german" | "english";
  metadata: ChunkMetadata;
};

export const HEADING = /^[A-ZÄÖÜ][A-ZÄÖÜ0-9 \-/'’()&,.]{2,70}:\s*$/;

const SUB_HEADING = /^([A-Z][A-Za-z’'()\-]*(?:\s+[a-z][A-Za-z’'()\-]*){0,3})\.\s+(?=[A-Z“"])/;
const ROMAN = /^[IVXLC]+$/;

function subHeadingOf(line: string): string | undefined {
  const match = line.match(SUB_HEADING);
  if (!match) return undefined;
  const title = match[1]!;
  if (title.length > 34) return undefined;
  if (ROMAN.test(title)) return undefined;
  if (!title.includes(" ")) return undefined;
  return title;
}

export const MIN_CHARS = 200;

export const MAX_CHARS = 1600;

export const FLOOR_CHARS = 100;

export type DocumentInput = {
  source: string;
  language: "german" | "english";
  strategy: ChunkStrategy;

  pages: string[];
};

type Line = { text: string; page: number };

export function chunkDocument(doc: DocumentInput): RawChunk[] {
  const lines: Line[] = [];
  doc.pages.forEach((page, i) => {
    for (const text of page.split("\n")) {
      if (text.trim()) lines.push({ text, page: i + 1 });
    }
  });

  const sections: Section[] =
    doc.strategy === "heading" ? sectionsByHeading(lines) : [{ lines }];

  const chunks: RawChunk[] = [];
  for (const section of sections) {
    for (const piece of splitSection(section.lines)) {
      const content = section.lesson ? `${section.lesson}\n${piece.text}` : piece.text;
      chunks.push({
        content,
        language: doc.language,
        metadata: {
          lesson: section.lesson,
          section: section.section,
          page: piece.page,
          pageEnd: piece.pageEnd,
          source: doc.source,
          strategy: doc.strategy,
        },
      });
    }
  }
  return chunks.filter((c) => c.content.trim().length >= FLOOR_CHARS);
}

type Section = { lesson?: string; section?: string; lines: Line[] };

function sectionsByHeading(lines: Line[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { lines: [] };

  for (const line of lines) {
    if (HEADING.test(line.text)) {
      if (current.lines.length) sections.push(current);
      current = { lesson: line.text.replace(/:\s*$/, "").trim(), lines: [] };
      continue;
    }
    const sub = subHeadingOf(line.text);
    if (sub) {
      if (current.lines.length) sections.push(current);
      current = { lesson: current.lesson, section: sub, lines: [line] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.lines.length) sections.push(current);
  return sections;
}

type Piece = { text: string; page: number; pageEnd: number };

function splitSection(lines: Line[]): Piece[] {
  const pieces: Piece[] = [];
  let buffer: Line[] = [];
  let length = 0;

  const flush = () => {
    if (!buffer.length) return;
    pieces.push({
      text: buffer.map((l) => l.text).join("\n").trim(),
      page: buffer[0]!.page,
      pageEnd: buffer.at(-1)!.page,
    });
    buffer = [];
    length = 0;
  };

  for (const line of lines) {
    if (length && length + line.text.length + 1 > MAX_CHARS) flush();
    buffer.push(line);
    length += line.text.length + 1;
  }
  flush();

  const merged: Piece[] = [];
  for (const piece of pieces) {
    const prev = merged.at(-1);
    if (
      prev &&
      piece.text.length < MIN_CHARS &&
      prev.text.length + piece.text.length <= MAX_CHARS
    ) {
      merged[merged.length - 1] = {
        text: `${prev.text}\n${piece.text}`,
        page: prev.page,
        pageEnd: piece.pageEnd,
      };
    } else {
      merged.push(piece);
    }
  }
  return merged;
}
