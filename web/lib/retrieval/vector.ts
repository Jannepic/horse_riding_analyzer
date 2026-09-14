/** Vector arm: similarity search via pgvector. */

import { corpus } from "./client.ts";
import type { RankedHit } from "./types.ts";

export async function searchByVector(
  embedding: number[],
  limit = 10,
  filter: Record<string, unknown> = {},
): Promise<RankedHit[]> {
  const { data, error } = await corpus.rpc("match_chunks", {
    query_embedding: embedding,
    match_count: limit,
    filter,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  return (data ?? []).map((row: {
    id: number; content: string; metadata: unknown; similarity: number;
  }) => ({
    id: row.id,
    content: row.content,
    metadata: (row.metadata ?? {}) as RankedHit["metadata"],
    score: row.similarity,
  }));
}
