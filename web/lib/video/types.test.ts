/** Tests for parsing the model's answer, including malformed JSON. */

import assert from "node:assert/strict";
import { parseAnalysis } from "./types.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const valid = JSON.stringify({
  gait: "Galopp",
  observations: [{ claim: "Ferse zeitweise hoch", confidence: "mittel", aspect: "Reitersitz" }],
  notAssessable: ["Versammlung"],
});

test("parses plain JSON", () => {
  const r = parseAnalysis(valid);
  assert.equal(r.gait, "Galopp");
  assert.equal(r.observations.length, 1);
});

test("survives markdown fences", () => {
  assert.equal(parseAnalysis("```json\n" + valid + "\n```").gait, "Galopp");
});

test("survives a sentence before the JSON", () => {
  assert.equal(parseAnalysis("Hier die Analyse:\n" + valid).gait, "Galopp");
});

test("drops malformed observations instead of failing", () => {
  const r = parseAnalysis(JSON.stringify({
    gait: "Trab",
    observations: [{ claim: "ok", confidence: "hoch", aspect: "Gangart" }, { nonsense: 1 }, null],
  }));
  assert.equal(r.observations.length, 1);
});

test("unparseable output yields an honest empty result, not an exception", () => {
  const r = parseAnalysis("Das Modell hat nur Prosa geschrieben.");
  assert.equal(r.gait, "unklar");
  assert.deepEqual(r.observations, []);
  assert.match(r.notAssessable.join(" "), /nicht auswertbar/);
});

test("missing fields default safely", () => {
  const r = parseAnalysis("{}");
  assert.equal(r.gait, "unklar");
  assert.deepEqual(r.observations, []);
  assert.deepEqual(r.notAssessable, []);
});

test("a missing deviation flag defaults to false, never true", () => {
  const parsed = parseAnalysis(JSON.stringify({
    gait: "Trab",
    observations: [
      { claim: "Ferse angehoben", confidence: "hoch", aspect: "Sitz", deviation: true },
      { claim: "Dreitakt", confidence: "hoch", aspect: "Takt" },
      { claim: "irgendwas", confidence: "mittel", aspect: "x", deviation: "ja" },
    ],
    notAssessable: [],
  }));
  assert.deepEqual(parsed.observations.map((o) => o.deviation), [true, false, false]);
});

console.log(`\n${passed} Tests bestanden.`);
