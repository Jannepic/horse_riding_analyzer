/** Tests for both chunking strategies and the page boundaries. */

import assert from "node:assert/strict";
import {
  chunkDocument, FLOOR_CHARS, HEADING, MAX_CHARS, type ChunkStrategy,
} from "./chunk.ts";
import { cleanDocument, cleanPage } from "./clean.ts";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
};

const doc = (pages: string[], strategy: ChunkStrategy = "heading") =>
  chunkDocument({ source: "t.pdf", language: "english", strategy, pages });

const body = (n: number) => Array.from({ length: n }, () =>
  "Das Pferd geht ruhig und taktrein vorwaerts an die Hand heran.").join("\n");

test("rejoins words broken by line wrapping", () => {
  assert.equal(cleanPage("Leistungsvermö-\ngen"), "Leistungsvermögen");
  assert.equal(cleanPage("Trai- ningsalltag"), "Trainingsalltag");
});

test("does NOT glue German elliptical compounds", () => {
  assert.match(cleanPage("Trainings- und Wettkampfplanung"), /Trainings- und Wettkampf/);
});

test("keeps hyphenated proper compounds", () => {
  assert.match(cleanPage("Reiter-Pferd-Paar"), /Reiter-Pferd-Paar/);
});

test("drops a running footer found by frequency, not by pattern", () => {
  const pages = Array.from({ length: 10 }, (_, i) =>
    `· DOKR Rahmentrainingskonzeption Dressur${i + 1}\nEchter Inhalt auf Seite ${i + 1}.`);
  const cleaned = cleanDocument(pages);
  for (const page of cleaned) {
    assert.ok(!page.includes("DOKR"), "footer must be gone");
    assert.match(page, /Echter Inhalt/);
  }
});

test("keeps a line that appears on only a few pages", () => {
  const pages = ["THE CANTER:", ...Array.from({ length: 9 }, (_, i) => `Seiteninhalt ${i}.`)];
  assert.ok(cleanDocument(pages)[0]!.includes("THE CANTER:"));
});

test("removes page furniture and figure captions", () => {
  const cleaned = cleanDocument([
    "8 | P a g e\nAbb. 5: Überblick Qualifikationsstufen\nEchter Satz hier.",
    "9 | P a g e\nEchter Satz dort.",
    "10 | P a g e\nNoch ein Satz.",
  ]);
  assert.equal(cleaned[0], "Echter Satz hier.");
});

test("recognises real lesson headings", () => {
  for (const h of ["THE CANTER:", "SHOULDER-IN:", "TURN ON HAUNCHES:", "REIN-BACK:"]) {
    assert.ok(HEADING.test(h), h);
  }
});

test("does not mistake prose for a heading", () => {
  for (const line of [
    "The canter is a three (3)-beat pace in six (6) phases.",
    "Collected canter. The Horse, remaining on the bit, moves forward.",
    "",
  ]) {
    assert.ok(!HEADING.test(line), line);
  }
});

test("every chunk carries its lesson as an anchor", () => {
  const chunks = doc([`THE CANTER:\n${body(20)}`]);
  assert.ok(chunks.length >= 1);
  for (const c of chunks) {
    assert.equal(c.metadata.lesson, "THE CANTER");
    assert.ok(c.content.startsWith("THE CANTER\n"));
  }
});

test("a section spanning a page break yields one chunk with page and pageEnd", () => {
  const chunks = doc([`THE CANTER:\n${body(6)}`, body(6)]);
  assert.equal(chunks.length, 1, "must not split just because the page ended");
  assert.equal(chunks[0]!.metadata.page, 1);
  assert.equal(chunks[0]!.metadata.pageEnd, 2);
});

test("sentences are no longer cut at page boundaries", () => {
  const chunks = doc(
    ["Pferd und Reiter sind als Einheit zu", "betrachten. " + body(6)],
    "paragraph",
  );
  assert.ok(chunks[0]!.content.includes("als Einheit zu\nbetrachten."));
});

test("two headings on one page produce two lessons", () => {
  const chunks = doc([`THE WALK:\n${body(8)}\nTHE TROT:\n${body(8)}`]);
  assert.deepEqual([...new Set(chunks.map((c) => c.metadata.lesson))], ["THE WALK", "THE TROT"]);
});

test("paragraph strategy records no lesson", () => {
  const chunks = doc([body(20)], "paragraph");
  assert.equal(chunks[0]!.metadata.lesson, undefined);
  assert.equal(chunks[0]!.metadata.strategy, "paragraph");
});

test("no chunk exceeds MAX_CHARS unless it is a single long line", () => {
  for (const c of doc([body(300)], "paragraph")) {
    const lines = c.content.split("\n").length;
    assert.ok(c.content.length <= MAX_CHARS || lines <= 2, `${c.content.length} chars`);
  }
});

test("fragments below the floor are dropped, not stored", () => {
  const chunks = doc(["BASIC PACES OF THE HORSE."], "heading");
  for (const c of chunks) assert.ok(c.content.length >= FLOOR_CHARS);
});

test("empty input yields no chunks", () => {
  assert.deepEqual(doc([""]), []);
  assert.deepEqual(doc([]), []);
});

console.log(`\n${passed} Tests bestanden.`);
