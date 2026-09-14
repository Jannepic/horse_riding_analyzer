/** Builds the evaluation dataset using the real retrieval and answer pipeline. */

import { writeFile } from "node:fs/promises";
import { model } from "../lib/llm.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "../lib/chat/prompt.ts";
import { retrieve } from "../lib/retrieval/retriever.ts";
import { citationOf } from "../lib/retrieval/types.ts";
import { wrapContext } from "../lib/security/wrapContext.ts";
import { TESTSET } from "./testset.ts";

export type EvalRecord = {
  id: string;
  question: string;
  groundTruth: string;
  answerable: boolean;

  contexts: string[];
  citations: string[];
  answer: string;
  translatedTerms: { german: string[]; english: string[] };
  latencyMs: number;
};

const records: EvalRecord[] = [];

for (const testCase of TESTSET) {
  const started = Date.now();
  const { hits, translation } = await retrieve(testCase.question);
  const context = wrapContext(hits);

  const response = await model.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(testCase.question, context) },
  ]);

  records.push({
    id: testCase.id,
    question: testCase.question,
    groundTruth: testCase.groundTruth,
    answerable: testCase.answerable,
    contexts: hits.map((h) => h.content),
    citations: hits.map(citationOf),
    answer: response.text,
    translatedTerms: { german: translation.german, english: translation.english },
    latencyMs: Date.now() - started,
  });

  console.log(`  ${testCase.id.padEnd(28)} ${hits.length} Belege, ${Date.now() - started} ms`);
}

const path = "eval/dataset.json";
await writeFile(path, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`\n${records.length} Datensätze -> ${path}`);
console.log(`Durchschnittliche Latenz: ${Math.round(
  records.reduce((n, r) => n + r.latencyMs, 0) / records.length,
)} ms`);
