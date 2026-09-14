/** Tests for the movement catalogue and the readiness rules. */

import assert from "node:assert/strict";
import { matchHorseToLesson } from "./horseProfileMatch.ts";
import { findLesson, minimumLevel } from "./levels.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("basic exercises are open from the lowest class", () => {
  assert.equal(minimumLevel("basic"), "E");
  assert.ok(matchHorseToLesson({ lesson: "Schenkelweichen", trainingLevel: "E" }).suitable);
});

test("a young horse at class A is NOT ready for piaffe", () => {
  const r = matchHorseToLesson({ lesson: "Piaffe", trainingLevel: "A", age: 6 });
  assert.equal(r.suitable, false);
  assert.equal(r.requiredLevel, "M");
  assert.match(r.reason, /Klasse M/);
});

test("the same horse at class S is ready", () => {
  assert.ok(matchHorseToLesson({ lesson: "Piaffe", trainingLevel: "S" }).suitable);
});

test("age triggers a caution even when the level fits", () => {
  const r = matchHorseToLesson({ lesson: "Traversale", trainingLevel: "M", age: 5 });
  assert.ok(r.suitable, "Klasse M reicht fuer die Traversale");
  assert.match(r.cautions.join(" "), /junge Pferde|S\. 8/);
});

test("no caution for an older horse", () => {
  const r = matchHorseToLesson({ lesson: "Traversale", trainingLevel: "M", age: 12 });
  assert.deepEqual(r.cautions, []);
});

test("known issues are surfaced", () => {
  const r = matchHorseToLesson({
    lesson: "Schulterherein", trainingLevel: "L", knownIssues: ["stellt sich links schwer"],
  });
  assert.match(r.cautions.join(" "), /stellt sich links schwer/);
});

test("collection lessons start at L, not earlier", () => {
  assert.equal(minimumLevel("collection_starting"), "L");
  assert.equal(matchHorseToLesson({ lesson: "Schulterherein", trainingLevel: "A" }).suitable, false);
  assert.equal(matchHorseToLesson({ lesson: "Schulterherein", trainingLevel: "L" }).suitable, true);
});

test("an unknown lesson is refused instead of guessed", () => {
  const r = matchHorseToLesson({ lesson: "Kaffeekochen", trainingLevel: "S" });
  assert.equal(r.suitable, false);
  assert.match(r.reason, /nicht im Lektionskatalog/);
  assert.deepEqual(r.preparatory, []);
});

test("preparatory lessons are offered only when not ready", () => {
  assert.ok(matchHorseToLesson({ lesson: "Piaffe", trainingLevel: "E" }).preparatory.length > 0);
  assert.deepEqual(matchHorseToLesson({ lesson: "Halten", trainingLevel: "E" }).preparatory, []);
});

test("lessons are findable by German and FEI name", () => {
  assert.equal(findLesson("Traversale")?.fei, "HALF PASS");
  assert.equal(findLesson("SHOULDER-IN")?.de, "Schulterherein");
  assert.equal(findLesson("schulterherein")?.de, "Schulterherein");
});

test("the answer carries a citation", () => {
  assert.equal(matchHorseToLesson({ lesson: "Piaffe", trainingLevel: "S" }).citation, "THE PIAFFE (S. 22)");
});

console.log(`\n${passed} Tests bestanden.`);
