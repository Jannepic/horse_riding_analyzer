/** Lexical arm: Postgres full-text search via ts_rank. */

import { corpus } from "./client.ts";
import { toOrQuery } from "./terms.ts";
import type { RankedHit } from "./types.ts";

export async function searchByKeyword(
  query: string,
  language: "german" | "english",
  limit = 10,
  filter: Record<string, unknown> = {},
): Promise<RankedHit[]> {
  const orQuery = toOrQuery(query);

  if (!orQuery) return [];

  const { data, error } = await corpus.rpc("search_chunks_text", {
    query_text: orQuery,
    lang: language,
    match_count: limit,
    filter,
  });

  if (error) throw new Error(`Keyword search failed: ${error.message}`);

  return (data ?? []).map((row: {
    id: number; content: string; metadata: unknown; rank: number;
  }) => ({
    id: row.id,
    content: row.content,
    metadata: (row.metadata ?? {}) as RankedHit["metadata"],
    score: row.rank,
  }));
}
