/** Tests for how the lexical arm builds its query. */

import assert from "node:assert/strict";
import { toOrQuery } from "./terms.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("joins terms with the websearch OR keyword", () => {
  assert.equal(toOrQuery("Galopp Takt"), "Galopp or Takt");
});

test("strips punctuation that would change the query", () => {
  assert.equal(toOrQuery("spackt -Galopp"), "spackt or Galopp");
  assert.equal(toOrQuery('"Takt", im Galopp!'), "Takt or Galopp");
});

test("drops words too short to carry meaning", () => {
  assert.equal(toOrQuery("im am Galopp"), "Galopp");
});

test("removes reserved words so they cannot alter the syntax", () => {
  assert.equal(toOrQuery("Galopp and Takt not Trab"), "Galopp or Takt or Trab");
});

test("deduplicates repeated terms", () => {
  assert.equal(toOrQuery("Galopp Galopp Takt"), "Galopp or Takt");
});

test("keeps umlauts and digits", () => {
  assert.equal(toOrQuery("Durchlässigkeit Aufgabe A5"), "Durchlässigkeit or Aufgabe");
});

test("caps the number of terms", () => {
  const many = Array.from({ length: 50 }, (_, i) => `wort${i}`).join(" ");
  assert.equal(toOrQuery(many).split(" or ").length, 20);
});

test("returns empty string when nothing usable remains", () => {
  assert.equal(toOrQuery("!!! ... ?"), "");
  assert.equal(toOrQuery(""), "");
});

console.log(`\n${passed} Tests bestanden.`);
