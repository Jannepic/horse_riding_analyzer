/** Runs the evaluation and writes the summary and per-case values to results.json. */

import { readFile, writeFile } from "node:fs/promises";
import type { EvalRecord } from "./buildDataset.ts";
import {
  answerRelevancy, contextPrecision, contextRecall, faithfulness, refusalCorrectness,
} from "./metrics.ts";

const records = JSON.parse(await readFile("eval/dataset.json", "utf8")) as EvalRecord[];

type Row = {
  id: string;
  answerable: boolean;
  faithfulness?: number;
  answerRelevancy?: number;
  contextPrecision?: number;
  contextRecall?: number;
  refusedCorrectly?: boolean;
  unsupported?: string[];
};

const rows: Row[] = [];

for (const r of records) {
  process.stdout.write(`  ${r.id.padEnd(28)}`);

  if (!r.answerable) {
    let ok = false;
    try {
      const refusal = await refusalCorrectness(r.question, r.answer);
      ok = refusal.refused && !refusal.inventedFacts;
    } catch (error) {
      console.log(`  ! Bewertung fehlgeschlagen: ${(error as Error).message.slice(0, 80)}`);
    }
    rows.push({ id: r.id, answerable: false, refusedCorrectly: ok });
    console.log(ok ? "  Verweigerung korrekt" : "  VERWEIGERUNG FEHLGESCHLAGEN");
    continue;
  }

  const safe = async <T>(label: string, fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      console.log(`\n     ! ${label} fehlgeschlagen: ${(error as Error).message.slice(0, 90)}`);
      return undefined;
    }
  };

  const [f, ar, cp, cr] = await Promise.all([
    safe("faithfulness", () => faithfulness(r.answer, r.contexts)),
    safe("answerRelevancy", () => answerRelevancy(r.question, r.answer)),
    safe("contextPrecision", () => contextPrecision(r.groundTruth, r.contexts)),
    safe("contextRecall", () => contextRecall(r.groundTruth, r.contexts)),
  ]);

  rows.push({
    id: r.id,
    answerable: true,
    faithfulness: f?.score,
    answerRelevancy: ar?.score,
    contextPrecision: cp?.score,
    contextRecall: cr?.score,
    unsupported: f?.detail,
  });

  const show = (v: number | undefined) => (v === undefined ? " —  " : v.toFixed(2));
  console.log(
    `  F ${show(f?.score)}  AR ${show(ar?.score)}  ` +
      `CP ${show(cp?.score)}  CR ${show(cr?.score)}`,
  );
}

const answerable = rows.filter((r) => r.answerable);
const mean = (pick: (r: Row) => number | undefined) => {
  const values = answerable.map(pick).filter((v): v is number => typeof v === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
};

const summary = {
  cases: rows.length,
  answerableCases: answerable.length,
  faithfulness: mean((r) => r.faithfulness),
  answerRelevancy: mean((r) => r.answerRelevancy),
  contextPrecision: mean((r) => r.contextPrecision),
  contextRecall: mean((r) => r.contextRecall),
  refusalAccuracy:
    rows.filter((r) => !r.answerable).length === 0
      ? 1
      : rows.filter((r) => !r.answerable && r.refusedCorrectly).length /
        rows.filter((r) => !r.answerable).length,
};

console.log("\n" + "─".repeat(52));
console.log("  Faithfulness      ", summary.faithfulness.toFixed(3), " Halluzination");
console.log("  Answer Relevancy  ", summary.answerRelevancy.toFixed(3), " trifft die Frage");
console.log("  Context Precision ", summary.contextPrecision.toFixed(3), " Reihenfolge der Belege");
console.log("  Context Recall    ", summary.contextRecall.toFixed(3), " Vollständigkeit");
console.log("  Verweigerung      ", summary.refusalAccuracy.toFixed(3), " nicht beantwortbare Fälle");
console.log("─".repeat(52));

const unsupported = rows.flatMap((r) => r.unsupported ?? []);
if (unsupported.length) {
  console.log("\nNicht belegte Aussagen:");
  unsupported.forEach((u) => console.log(`  - ${u.slice(0, 160)}`));
}

await writeFile("eval/results.json", `${JSON.stringify({ summary, rows }, null, 2)}\n`, "utf8");
console.log("\n-> eval/results.json");
