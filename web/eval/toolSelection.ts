/** Checks that the agent picks the right tool per question — and none for small talk. */

import { createDressageAgent } from "../lib/agent.ts";
import type { FusedHit } from "../lib/retrieval/types.ts";

type Case = {
  difficulty: "easy" | "medium" | "hard" | "edge";
  query: string;

  expect: string[];
  why: string;
};

const CASES: Case[] = [
  { difficulty: "easy", query: "Was ist Anlehnung?",
    expect: ["retrieve_doctrine"], why: "reine Lehrfrage" },
  { difficulty: "easy",
    query: "Ich hatte die Noten 7, 6 und 8, die letzte mit Koeffizient 2. Wie viel Prozent?",
    expect: ["score_test_sheet"], why: "konkrete Noten genannt" },
  { difficulty: "medium",
    query: "Mein Pferd steht auf Klasse A und ist 6. Ist es reif für Piaffe?",
    expect: ["horse_profile_match"], why: "Eignungsfrage mit Profil" },
  { difficulty: "medium",
    query: "Ich bin am 1., 3. und 5. August je 60 Minuten geritten, Intensität 4. Wie ist meine Belastung?",
    expect: ["training_load"], why: "Trainingsdaten genannt" },
  { difficulty: "hard",
    query: "Mein Pferd spackt im Galopp — woran liegt das und was übe ich als Nächstes?",
    expect: ["retrieve_doctrine"], why: "Laienformulierung, Lehrfrage trotz Trainingsbezug" },
  { difficulty: "edge", query: "Erzähl mir einen Witz.",
    expect: [], why: "nichts mit Reiten zu tun" },
  { difficulty: "edge", query: "Hallo!",
    expect: [], why: "Begrüssung" },
  { difficulty: "edge", query: "Mein Pferd lahmt seit gestern. Was hat es?",
    expect: [], why: "Verweigerungsfall — keine tierärztliche Diagnose" },
];

let pass = 0;
const failures: string[] = [];

for (const [i, c] of CASES.entries()) {
  const collector: FusedHit[] = [];
  const agent = createDressageAgent(collector);
  const result = await agent.invoke(
    { messages: [{ role: "user", content: c.query }] },
    { configurable: { thread_id: `eval-${i}` } },
  );

  const called = new Set<string>();
  for (const m of result.messages as { tool_calls?: { name: string }[] }[]) {
    for (const tc of m.tool_calls ?? []) called.add(tc.name);
  }

  const missing = c.expect.filter((t) => !called.has(t));
  const unexpected = c.expect.length === 0 ? [...called] : [];
  const ok = missing.length === 0 && unexpected.length === 0;
  if (ok) pass++;
  else failures.push(`${c.query} → erwartet [${c.expect}], bekam [${[...called]}]`);

  console.log(
    `  ${ok ? "ok  " : "FAIL"} [${c.difficulty.padEnd(6)}] ${c.query.slice(0, 58)}`,
  );
  console.log(`         erwartet: [${c.expect.join(", ") || "kein Tool"}]  gerufen: [${[...called].join(", ") || "keins"}]`);
}

console.log(`\n${pass}/${CASES.length} bestanden`);
if (failures.length) {
  console.log("\nFehlschläge:");
  failures.forEach((f) => console.log(`  - ${f}`));
}
