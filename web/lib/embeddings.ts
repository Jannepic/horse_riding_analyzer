/** Embeds text via OpenRouter; all query variants in a single call. */

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing — see web/.env.local");

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed (${res.status}): ${await res.text()}`);
  }

  const payload = (await res.json()) as {
    data: { index: number; embedding: number[] }[];
  };

  const vectors = [...payload.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);

  if (vectors.length !== texts.length) {
    throw new Error(`Expected ${texts.length} embeddings, received ${vectors.length}`);
  }
  const wrong = vectors.find((v) => v.length !== EMBEDDING_DIMENSIONS);
  if (wrong) {
    throw new Error(
      `Model returned ${wrong.length} dimensions, schema expects ${EMBEDDING_DIMENSIONS}`,
    );
  }
  return vectors;
}
