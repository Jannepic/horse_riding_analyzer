/** The four RAG metrics, implemented here: faithfulness, answer relevancy, context precision, context recall — plus refusal correctness. */

import { z } from "zod";
import { createModel } from "../lib/llm.ts";
import { embed } from "../lib/embeddings.ts";

const judge = createModel({ maxTokens: 6000, temperature: 0 });

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! ** 2;
    nb += b[i]! ** 2;
  }
  return dot / Math.sqrt(na * nb);
}

const Statements = z.object({
  statements: z.array(z.string()).max(12).describe("Atomic, self-contained statements, at most 12"),
});

const Verdicts = z.object({
  verdicts: z.array(
    z.object({
      statement: z.string(),
      supported: z.boolean(),
      reason: z.string().max(160).describe("kurz, maximal ein Satz"),
    }),
  ),
});

export async function faithfulness(answer: string, contexts: string[]) {
  const decomposer = judge.withStructuredOutput(Statements, { name: "statements" });
  const { statements } = await decomposer.invoke([
    {
      role: "system",
      content:
        "Break the text into atomic statements. Each statement must stand on its " +
        "own — resolve pronouns. Leave out meta sentences such as 'Here is the " +
        "answer' and bare citations.",
    },
    { role: "user", content: answer },
  ]);

  if (statements.length === 0) return { score: 1, statements: 0, supported: 0, detail: [] };

  const verifier = judge.withStructuredOutput(Verdicts, { name: "verdicts" });
  const { verdicts } = await verifier.invoke([
    {
      role: "system",
      content:
        "For each statement, judge whether it can be derived from the CONTEXT. " +
        "supported=true only when the context backs it. Your own world knowledge " +
        "does NOT count — the question is whether the context carries it.",
    },
    {
      role: "user",
      content: `CONTEXT:\n${contexts.join("\n---\n")}\n\nSTATEMENTS:\n${statements
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n")}`,
    },
  ]);

  const supported = verdicts.filter((v) => v.supported).length;
  return {
    score: verdicts.length ? supported / verdicts.length : 1,
    statements: verdicts.length,
    supported,
    detail: verdicts.filter((v) => !v.supported).map((v) => `${v.statement} — ${v.reason}`),
  };
}

const GeneratedQuestions = z.object({
  questions: z.array(z.string()).describe("Questions this answer would answer"),
  noncommittal: z.boolean().describe("true when the answer evades instead of answering"),
});

export async function answerRelevancy(question: string, answer: string, n = 3) {
  const generator = judge.withStructuredOutput(GeneratedQuestions, { name: "questions" });
  const { questions, noncommittal } = await generator.invoke([
    {
      role: "system",
      content:
        `Formulate exactly ${n} questions that the given answer would answer. ` +
        "Set noncommittal=true when the answer evades ('I find nothing on that', " +
        "'I cannot say') instead of answering substantively.",
    },
    { role: "user", content: answer },
  ]);

  if (noncommittal || questions.length === 0) {
    return { score: 0, noncommittal, generated: questions };
  }

  const vectors = await embed([question, ...questions]);
  const original = vectors[0]!;
  const sims = vectors.slice(1).map((v) => cosine(original, v));
  return {
    score: sims.reduce((a, b) => a + b, 0) / sims.length,
    noncommittal,
    generated: questions,
  };
}

const Usefulness = z.object({
  useful: z.array(z.boolean()).describe("Per context: does it help reach the reference answer?"),
});

export async function contextPrecision(groundTruth: string, contexts: string[]) {
  if (contexts.length === 0) return { score: 0, useful: [] as boolean[] };

  const rater = judge.withStructuredOutput(Usefulness, { name: "usefulness" });
  const { useful } = await rater.invoke([
    {
      role: "system",
      content:
        "Judge each context separately on whether it helps reach the REFERENCE " +
        "ANSWER. Answer with exactly as many booleans as there are contexts, in the " +
        "same order.",
    },
    {
      role: "user",
      content:
        `REFERENCE ANSWER:\n${groundTruth}\n\n` +
        contexts.map((c, i) => `CONTEXT ${i + 1}:\n${c}`).join("\n\n"),
    },
  ]);

  const flags = contexts.map((_, i) => useful[i] ?? false);
  const totalUseful = flags.filter(Boolean).length;
  if (totalUseful === 0) return { score: 0, useful: flags };

  let sum = 0;
  let hits = 0;
  flags.forEach((isUseful, index) => {
    if (!isUseful) return;
    hits++;
    sum += hits / (index + 1);
  });

  return { score: sum / totalUseful, useful: flags };
}

const Attribution = z.object({
  sentences: z.array(
    z.object({
      sentence: z.string(),
      attributable: z.boolean(),
    }),
  ),
});

export async function contextRecall(groundTruth: string, contexts: string[]) {
  const rater = judge.withStructuredOutput(Attribution, { name: "attribution" });
  const { sentences } = await rater.invoke([
    {
      role: "system",
      content:
        "Break the REFERENCE ANSWER into sentences and judge for each whether it " +
        "can be attributed to the CONTEXTS (attributable=true) or not.",
    },
    {
      role: "user",
      content: `CONTEXTS:\n${contexts.join("\n---\n")}\n\nREFERENCE ANSWER:\n${groundTruth}`,
    },
  ]);

  if (sentences.length === 0) return { score: 0, sentences: 0, attributable: 0 };
  const attributable = sentences.filter((s) => s.attributable).length;
  return {
    score: attributable / sentences.length,
    sentences: sentences.length,
    attributable,
  };
}

const Refusal = z.object({
  refused: z.boolean().describe("Does the answer state it cannot cite this, or refer the rider on?"),
  inventedFacts: z.boolean().describe("Does it nonetheless make unsupported technical claims?"),
});

export async function refusalCorrectness(question: string, answer: string) {
  const rater = judge.withStructuredOutput(Refusal, { name: "refusal" });
  return rater.invoke([
    {
      role: "system",
      content:
        "Judge whether the answer names the limits of its knowledge (no evidence " +
        "found) or refers the rider to a professional — and whether it makes " +
        "technical claims beyond that which are not supported.",
    },
    { role: "user", content: `QUESTION:\n${question}\n\nANSWER:\n${answer}` },
  ]);
}
