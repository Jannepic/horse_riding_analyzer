/** Tests for the bilingual UI: matching keys, no forgotten translation, language rule in both directions. */

import assert from "node:assert/strict";
import { dict, isLanguage, LANGUAGES, languageInstruction } from "./i18n.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("both languages carry the same keys", () => {
  const de = Object.keys(dict("de")).sort();
  const en = Object.keys(dict("en")).sort();
  assert.deepEqual(en, de, "eine Sprache hat eine Lücke");
});

const SAME_IN_BOTH = new Set(["exportLabel"]);

test("no string is left untranslated by accident", () => {
  const de = dict("de");
  const en = dict("en");
  for (const key of Object.keys(de) as (keyof typeof de)[]) {
    if (typeof de[key] !== "string" || SAME_IN_BOTH.has(key)) continue;
    assert.notEqual(en[key], de[key], `${key} ist in beiden Sprachen gleich`);
  }
});

test("the example questions exist in both languages", () => {
  assert.equal(dict("de").examples.length, dict("en").examples.length);
  assert.ok(dict("en").examples.every((e) => /^[A-Z]/.test(e)));
});

test("isLanguage rejects anything else", () => {
  for (const l of LANGUAGES) assert.equal(isLanguage(l), true);
  for (const bad of ["fr", "", "DE", null, 42]) assert.equal(isLanguage(bad), false, String(bad));
});

test("both languages get an instruction that overrides the question", () => {
  assert.match(languageInstruction("de"), /GERMAN/);
  assert.match(languageInstruction("en"), /ENGLISH/);
  for (const l of LANGUAGES) {
    const rule = languageInstruction(l);
    assert.ok(rule.length > 0, `${l} ohne Regel`);
    assert.match(rule, /PRECEDENCE/, `${l} benennt den Vorrang nicht`);
    assert.match(rule, /different language/, `${l} überstimmt die Frage nicht`);
  }
});

test("the default video question names the file", () => {
  assert.match(dict("de").defaultVideoQuestion("IMG.mp4"), /IMG\.mp4/);
  assert.match(dict("en").defaultVideoQuestion("IMG.mp4"), /IMG\.mp4/);
});

console.log(`\n${passed} Tests bestanden.`);
