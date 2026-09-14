/** Debug view of retrieval: both arms, the fusion, and vector-only for comparison. */

import { retrieve } from "../lib/retrieval/retriever.ts";
import { citationOf } from "../lib/retrieval/types.ts";

const args = process.argv.slice(2);
const plain = args.includes("--plain");
const query = args.filter((a) => a !== "--plain").join(" ") || "Was bedeutet Takt in der Dressur?";

console.log(`\nFrage: ${query}`);
console.log(plain ? "Modus: nur Vektor, ohne Übersetzung\n" : "Modus: Hybrid mit Query Translation\n");

const t0 = Date.now();
const { hits, translation, arms } = await retrieve(query, {
  vectorOnly: plain,
  skipTranslation: plain,
});
const ms = Date.now() - t0;

if (!plain) {
  console.log("─── Übersetzung ───");
  console.log(`  deutsch:  ${translation.german.join(", ")}`);
  console.log(`  englisch: ${translation.english.join(", ")}`);
  console.log(`  HyDE:     ${translation.hyde.replace(/\s+/g, " ").slice(0, 140)}…`);
}

console.log("\n─── Arme ───");
for (const a of arms) console.log(`  ${a.name.padEnd(18)} ${a.hits} Treffer`);

console.log(`\n─── Fusioniert (Top ${hits.length}) ───`);
hits.forEach((h, i) => {
  const provenance = h.foundBy.map((f) => `${f.list.replace(/^(vector|keyword):/, "$1 ")}#${f.rank}`).join(", ");
  console.log(`\n  ${i + 1}. rrf ${h.rrfScore.toFixed(5)}  ${citationOf(h)}`);
  console.log(`     gefunden von: ${provenance}`);
  console.log(`     ${h.content.replace(/\s+/g, " ").slice(0, 150)}…`);
});
console.log(`\n(${ms} ms)`);
