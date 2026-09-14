/** Orchestrates both arms across all query variants and fuses the results with language balancing. */

import { embed } from "../embeddings.ts";
import { searchByKeyword } from "./keyword.ts";
import { fuseRRF } from "./rrf.ts";
import { translateQuery, type Translation } from "./queryTranslation.ts";
import type { FusedHit, RankedList } from "./types.ts";
import { searchByVector } from "./vector.ts";

export const PER_ARM = 10;

export const TOP_K = 6;

export type RetrievalOptions = {
  topK?: number;

  vectorOnly?: boolean;

  skipTranslation?: boolean;
};

export type RetrievalResult = {
  hits: FusedHit[];
  translation: Translation;

  arms: { name: string; hits: number }[];
};

function balanceByLanguage(lists: RankedList[]): RankedList[] {
  const sideOf = (name: string) => (name.endsWith(":en") ? "en" : "de");

  const counts = new Map<string, number>();
  for (const list of lists) {
    const side = sideOf(list.name);
    counts.set(side, (counts.get(side) ?? 0) + 1);
  }

  return lists.map((list) => ({
    ...list,
    weight: 1 / (counts.get(sideOf(list.name)) ?? 1),
  }));
}

export async function retrieve(
  query: string,
  options: RetrievalOptions = {},
): Promise<RetrievalResult> {
  const { topK = TOP_K, vectorOnly = false, skipTranslation = false } = options;

  const translation = skipTranslation
    ? { german: [query], english: [], hyde: "" }
    : await translateQuery(query);

  const semantic: { name: string; text: string }[] = [
    { name: "vector:original", text: query },
    ...(translation.german.length
      ? [{ name: "vector:de", text: translation.german.join(", ") }]
      : []),
    ...(translation.english.length
      ? [{ name: "vector:en", text: translation.english.join(", ") }]
      : []),
    ...(translation.hyde ? [{ name: "vector:hyde", text: translation.hyde }] : []),
  ];

  const embeddings = await embed(semantic.map((s) => s.text));

  const vectorLists = await Promise.all(
    semantic.map(async (s, i): Promise<RankedList> => ({
      name: s.name,
      hits: await searchByVector(embeddings[i]!, PER_ARM),
    })),
  );

  let lexicalLists: RankedList[] = [];
  if (!vectorOnly) {
    const lexical = [
      { name: "keyword:de", terms: translation.german, language: "german" as const },
      { name: "keyword:en", terms: translation.english, language: "english" as const },
    ].filter((l) => l.terms.length > 0);

    lexicalLists = await Promise.all(
      lexical.map(async (l): Promise<RankedList> => ({
        name: l.name,
        hits: await searchByKeyword(l.terms.join(" "), l.language, PER_ARM),
      })),
    );
  }

  const lists = balanceByLanguage([...vectorLists, ...lexicalLists]);

  return {
    hits: fuseRRF(lists).slice(0, topK),
    translation,
    arms: lists.map((l) => ({ name: l.name, hits: l.hits.length })),
  };
}
