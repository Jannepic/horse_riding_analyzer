/** Shared types of the retrieval layer and the citation format. */

export type ChunkMetadata = {
  lesson?: string;

  section?: string;
  page?: number;
  pageEnd?: number;
  source?: string;
  strategy?: "heading" | "paragraph";
};

export type Chunk = {
  id: number;
  content: string;
  metadata: ChunkMetadata;
};

export type RankedHit = Chunk & { score: number };

export type RankedList = {
  name: string;
  hits: RankedHit[];

  weight?: number;
};

export type FusedHit = Chunk & {
  rrfScore: number;
  foundBy: { list: string; rank: number; score: number }[];
};

export function citationOf(chunk: Chunk): string {
  const { lesson, section, page, pageEnd, source } = chunk.metadata;
  const where = lesson
    ? `${lesson}${section ? ` → ${section}` : ""}`
    : (source ?? "unbekannte Quelle");
  if (!page) return where;
  const pages = pageEnd && pageEnd !== page ? `S. ${page}–${pageEnd}` : `S. ${page}`;
  return `${where} (${pages})`;
}
