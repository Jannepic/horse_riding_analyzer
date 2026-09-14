/** Tool: searches the riding doctrine and reports its hits to the sources panel. */

import { tool } from "langchain";
import { z } from "zod";
import { retrieve } from "../retrieval/retriever.ts";
import { wrapContext } from "../security/wrapContext.ts";
import type { FusedHit } from "../retrieval/types.ts";

export function createRetrieveDoctrineTool(collector: FusedHit[]) {
  return tool(
    async ({ question }) => {
      const { hits, translation } = await retrieve(question);
      collector.push(...hits);
      return JSON.stringify({
        searchedFor: { german: translation.german, english: translation.english },
        context: wrapContext(hits),
      });
    },
    {
      name: "retrieve_doctrine",
      description:
        "Searches the riding doctrine (FEI Judging Manual, DOKR training framework, " +
        "German FN examiner leaflet) for evidence on a question. Use this tool for " +
        "EVERY technical statement about riding, gaits, movements, training or fault " +
        "patterns — even when you believe you know the answer. Without evidence you " +
        "must not answer a technical question.",
      schema: z.object({
        question: z.string().min(3)
          .describe("Die fachliche Frage, in eigenen Worten formuliert"),
      }),
    },
  );
}
