/** Fences retrieved evidence as data, so third-party text cannot become an instruction. */

import { citationOf } from "../retrieval/types.ts";
import type { FusedHit } from "../retrieval/types.ts";

const FENCE = "─────";

export function wrapContext(hits: FusedHit[]): string {
  if (hits.length === 0) return "(no evidence found)";

  return hits
    .map((hit, i) => {
      const safe = hit.content.replaceAll(FENCE, "");
      return [
        `${FENCE} EVIDENCE ${i + 1} · ${citationOf(hit)} ${FENCE}`,
        safe.trim(),
      ].join("\n");
    })
    .join("\n\n");
}
