/** Tests against open redirects, including protocol-relative URLs. */

import assert from "node:assert/strict";
import { DEFAULT_REDIRECT, safeNext } from "./safeRedirect.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("keeps internal paths", () => {
  assert.equal(safeNext("/profile"), "/profile");
  assert.equal(safeNext("/"), "/");
  assert.equal(safeNext("/profile?tab=horses"), "/profile?tab=horses");
});

test("falls back when nothing is given", () => {
  assert.equal(safeNext(null), DEFAULT_REDIRECT);
  assert.equal(safeNext(""), DEFAULT_REDIRECT);
});

test("rejects absolute URLs to other hosts", () => {
  assert.equal(safeNext("https://boese.example.com"), DEFAULT_REDIRECT);
  assert.equal(safeNext("http://boese.example.com/login"), DEFAULT_REDIRECT);
});

test("rejects protocol-relative URLs", () => {
  assert.equal(safeNext("//boese.example.com"), DEFAULT_REDIRECT);
  assert.equal(safeNext("/\\boese.example.com"), DEFAULT_REDIRECT);
});

test("rejects other schemes", () => {
  assert.equal(safeNext("javascript:alert(1)"), DEFAULT_REDIRECT);
  assert.equal(safeNext("data:text/html,x"), DEFAULT_REDIRECT);
});

test("rejects paths without a leading slash", () => {
  assert.equal(safeNext("profile"), DEFAULT_REDIRECT);
  assert.equal(safeNext("boese.example.com"), DEFAULT_REDIRECT);
});

console.log(`\n${passed} Tests bestanden.`);
