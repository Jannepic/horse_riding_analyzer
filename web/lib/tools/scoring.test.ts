/** Tests for the mark arithmetic per FEI Art. 423 and 425. */

import assert from "node:assert/strict";
import { labelForMark, medianScore, scoreTestSheet } from "./scoring.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("percentage without coefficients", () => {
  const r = scoreTestSheet([
    { mark: 7, coefficient: 1 },
    { mark: 8, coefficient: 1 },
    { mark: 6, coefficient: 1 },
  ]);
  assert.equal(r.totalPoints, 21);
  assert.equal(r.maxPoints, 30);
  assert.equal(r.percentage, 70);
});

test("coefficients count double, in both directions (Art. 425.1)", () => {
  const r = scoreTestSheet([
    { mark: 8, coefficient: 2 },
    { mark: 6, coefficient: 1 },
  ]);
  assert.equal(r.totalPoints, 22);
  assert.equal(r.maxPoints, 30);
  assert.equal(r.percentage, 73.33);
});

test("a bad mark with coefficient 2 hurts twice as much", () => {
  const withCoeff = scoreTestSheet([{ mark: 4, coefficient: 2 }, { mark: 8, coefficient: 1 }]);
  const without = scoreTestSheet([{ mark: 4, coefficient: 1 }, { mark: 8, coefficient: 1 }]);
  assert.ok(withCoeff.percentage < without.percentage);
});

test("half marks are handled exactly (Art. 423.4)", () => {
  const r = scoreTestSheet([{ mark: 6.5, coefficient: 1 }, { mark: 7.5, coefficient: 1 }]);
  assert.equal(r.totalPoints, 14);
  assert.equal(r.percentage, 70);
});

test("weakest movements are ranked by points lost, not by mark", () => {
  const r = scoreTestSheet([
    { name: "Traversale", mark: 5, coefficient: 2 },   // 10 Punkte verloren
    { name: "Halten", mark: 4, coefficient: 1 },       // 6 Punkte verloren
    { name: "Mitteltrab", mark: 9, coefficient: 1 },   // 1 Punkt
  ]);
  assert.equal(r.weakest[0]!.name, "Traversale", "schlechtere Note ist nicht immer der größere Verlust");
  assert.equal(r.weakest[0]!.lostPoints, 10);
  assert.equal(r.weakest[1]!.name, "Halten");
});

test("a perfect sheet has no weak points", () => {
  const r = scoreTestSheet([{ mark: 10, coefficient: 1 }, { mark: 10, coefficient: 2 }]);
  assert.equal(r.percentage, 100);
  assert.deepEqual(r.weakest, []);
});

test("mark labels come from the rulebook scale (Art. 423.3)", () => {
  assert.equal(labelForMark(10), "Excellent");
  assert.equal(labelForMark(6), "Satisfactory");
  assert.equal(labelForMark(0), "Not executed");

  assert.equal(labelForMark(6.5), "Satisfactory");
});

test("median of an odd number of judges (Art. 425.2.1.2)", () => {
  assert.equal(medianScore([70.5, 68.5, 71, 69, 70]), 70);
});

test("median of an even number of judges averages the middle two", () => {
  assert.equal(medianScore([68, 70, 72, 74]), 71);
});

test("empty input is rejected rather than returning NaN", () => {
  assert.throws(() => scoreTestSheet([]), /Lektion/);
  assert.throws(() => medianScore([]), /Noten/);
});

console.log(`\n${passed} Tests bestanden.`);
