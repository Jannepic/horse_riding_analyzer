/** Translates a rider's question into German and English technical terms plus a hypothetical answer. */

import { z } from "zod";
import { model } from "../llm.ts";

const Translation = z.object({
  german: z
    .array(z.string())
    .describe("German technical dressage terms for this question, 2-6 items"),
  english: z
    .array(z.string())
    .describe("English FEI terminology for the same thing, 2-6 items"),
  hyde: z
    .string()
    .describe("One or two sentences answering the question in the style of a riding manual"),
});

export type Translation = z.infer<typeof Translation>;

const SYSTEM = `You translate a rider's everyday question about dressage into the
technical vocabulary a search over a riding-doctrine corpus can find. You do not
answer the question.

Rules:
- "german": German technical terms that actually occur in the doctrine.
  Examples: Takt, Losgelassenheit, Anlehnung, Schwung, Geraderichtung,
  Versammlung, Durchlässigkeit, Hufschlagfolge, Kreuzgalopp, Viertakt,
  Tragkraft, Hankenbeugung, Schulterherein, Traversale.
- "english": the English FEI terminology for the same matter. This is MANDATORY
  even when the question is in German — parts of the corpus are English and
  would otherwise never be found. Examples: rhythm, suppleness, contact,
  impulsion, straightness, collection, four-beat canter, irregular strides,
  self-carriage.
- No catch-all words such as "Dressur", "Pferd", "Reiter", "riding" — they
  appear in almost every paragraph and cannot discriminate between chunks.
- "hyde": a short, technically phrased answer as a textbook would state it. It
  may be wrong; it only serves as a search pattern.`;

function fallback(query: string): Translation {
  return { german: [query], english: [], hyde: query };
}

export async function translateQuery(query: string): Promise<Translation> {
  try {
    const structured = model.withStructuredOutput(Translation, { name: "translation" });
    const result = await structured.invoke([
      { role: "system", content: SYSTEM },
      { role: "user", content: query },
    ]);

    if (!result.german.length && !result.english.length) return fallback(query);
    return result;
  } catch (error) {
    console.error("[queryTranslation] falling back to the raw query:", error);
    return fallback(query);
  }
}
