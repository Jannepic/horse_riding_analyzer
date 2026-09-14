/** Tests for the rank fusion, including the deterministic tie-break. */

import assert from "node:assert/strict";
import { fuseRRF, RRF_K } from "./rrf.ts";
import type { RankedHit } from "./types.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const hit = (id: number, score = 0): RankedHit => ({
  id, content: `chunk ${id}`, metadata: {}, score,
});

test("consensus beats a single top placement", () => {
  const fused = fuseRRF([
    { name: "vector", hits: [hit(1), hit(2), hit(9)] },
    { name: "keyword", hits: [hit(3), hit(2), hit(8)] },
  ]);
  assert.equal(fused[0]!.id, 2);
  assert.equal(fused[0]!.foundBy.length, 2);
});

test("scores follow the formula exactly", () => {
  const fused = fuseRRF([{ name: "vector", hits: [hit(1), hit(2)] }]);
  assert.equal(fused[0]!.rrfScore, 1 / (RRF_K + 1));
  assert.equal(fused[1]!.rrfScore, 1 / (RRF_K + 2));
});

test("incomparable arm scores do not distort the result", () => {
  const a = fuseRRF([
    { name: "vector", hits: [hit(1, 0.60)] },
    { name: "keyword", hits: [hit(2, 0.07)] },
  ]);
  const b = fuseRRF([
    { name: "vector", hits: [hit(1, 0.99)] },
    { name: "keyword", hits: [hit(2, 0.0001)] },
  ]);
  assert.deepEqual(a.map((h) => h.id), b.map((h) => h.id));
});

test("a chunk found by three lists is merged once", () => {
  const fused = fuseRRF([
    { name: "a", hits: [hit(7)] },
    { name: "b", hits: [hit(7)] },
    { name: "c", hits: [hit(7)] },
  ]);
  assert.equal(fused.length, 1);
  assert.equal(fused[0]!.foundBy.length, 3);
  assert.equal(fused[0]!.rrfScore, 3 / (RRF_K + 1));
});

test("weights shift the ranking", () => {
  assert.equal(fuseRRF([
    { name: "vector", hits: [hit(1)] },
    { name: "keyword", hits: [hit(2)] },
  ])[0]!.id, 1, "tie broken by id");

  assert.equal(fuseRRF([
    { name: "vector", hits: [hit(1)], weight: 1 },
    { name: "keyword", hits: [hit(2)], weight: 5 },
  ])[0]!.id, 2, "heavier arm wins");
});

test("empty and missing lists are harmless", () => {
  assert.deepEqual(fuseRRF([]), []);
  assert.deepEqual(fuseRRF([{ name: "empty", hits: [] }]), []);
  assert.equal(fuseRRF([
    { name: "empty", hits: [] },
    { name: "full", hits: [hit(4)] },
  ]).length, 1);
});

test("output is deterministic across runs", () => {
  const build = () => fuseRRF([
    { name: "v", hits: [hit(3), hit(1), hit(2)] },
    { name: "k", hits: [hit(2), hit(3), hit(1)] },
  ]).map((h) => h.id);
  assert.deepEqual(build(), build());
});

test("provenance records which arm gave which rank", () => {
  const fused = fuseRRF([
    { name: "vector", hits: [hit(5, 0.91), hit(6, 0.7)] },
    { name: "keyword", hits: [hit(6, 0.42)] },
  ]);
  assert.deepEqual(fused.find((h) => h.id === 6)!.foundBy, [
    { list: "vector", rank: 2, score: 0.7 },
    { list: "keyword", rank: 1, score: 0.42 },
  ]);
});

console.log(`\n${passed} Tests bestanden.`);
