/** Reciprocal rank fusion: merges several hit lists by rank position alone. */

import type { FusedHit, RankedList } from "./types.ts";

export const RRF_K = 60;

export function fuseRRF(lists: RankedList[], k: number = RRF_K): FusedHit[] {
  const merged = new Map<number, FusedHit>();

  for (const { name, hits, weight = 1 } of lists) {
    hits.forEach((hit, index) => {
      const rank = index + 1;
      const contribution = weight / (k + rank);
      const existing = merged.get(hit.id);

      if (existing) {
        existing.rrfScore += contribution;
        existing.foundBy.push({ list: name, rank, score: hit.score });
        return;
      }

      merged.set(hit.id, {
        id: hit.id,
        content: hit.content,
        metadata: hit.metadata,
        rrfScore: contribution,
        foundBy: [{ list: name, rank, score: hit.score }],
      });
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (b.rrfScore !== a.rrfScore) return b.rrfScore - a.rrfScore;

    return a.id - b.id;
  });
}
