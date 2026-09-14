/** Tests for the export, above all the CSV escaping. */

import assert from "node:assert/strict";
import {
  csvField, exportFileName, renderExport, toCsv, toJson, toMarkdown,
} from "./export.ts";
import type { StoredMessage } from "./history.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const META = {
  id: "42816cb5-2e9e-443e-9f26-18975b25c5a2",
  title: "Läuft das Pferd gut?",
  horseName: "Filou",
  createdAt: "2026-09-02T13:59:27.000Z",
};

const msg = (over: Partial<StoredMessage>): StoredMessage => ({
  id: "m1", role: "user", content: "Frage", sources: [], toolResults: [],
  usage: null, videoFile: null, videoName: null,
  createdAt: "2026-09-02T14:00:00.000Z", ...over,
});

const MESSAGES: StoredMessage[] = [
  msg({ role: "observation", content: "Viertakt im Schritt", videoName: "IMG.mp4",
        videoFile: "abc.webm",
        toolResults: [{ name: "analyse_video", result: { gait: "Schritt" } }] }),
  msg({ role: "user", content: "Läuft das Pferd gut?" }),
  msg({
    role: "assistant",
    content: "Der Takt ist gleichmässig (WALK, S. 25).",
    sources: [{ citation: "WALK (S. 25)", foundBy: ["vector:de#1"], excerpt: "Takt ist …" }],
    usage: { inputTokens: 100, outputTokens: 50, reasoningTokens: 8, costUsd: 0.0012, calls: 3 },
  }),
];

test("csvField quotes and doubles inner quotes", () => {
  assert.equal(csvField('sagt "hallo"'), '"sagt ""hallo"""');
  assert.equal(csvField("a,b"), '"a,b"');
  assert.equal(csvField("Zeile1\nZeile2"), '"Zeile1\nZeile2"');
  assert.equal(csvField(null), '""');
  assert.equal(csvField(undefined), '""');
  assert.equal(csvField(42), '"42"');
});

test("csv has one header plus one row per message", () => {
  const csv = toCsv(META, MESSAGES);

  const occurrences = csv.split(META.id).length - 1;
  assert.equal(occurrences, MESSAGES.length);
  assert.match(csv, /^"conversation_id","created_at","role"/);
  assert.ok(csv.endsWith("\n"), "abschliessender Umbruch");
});

test("csv keeps a comma inside a citation from shifting columns", () => {
  const csv = toCsv(META, [
    msg({ role: "assistant", content: "x",
          sources: [{ citation: "THE CANTER, S. 8", foundBy: [], excerpt: "a,b" }] }),
  ]);
  assert.match(csv, /"THE CANTER, S\. 8"/);
});

test("markdown labels the roles in German and carries the sources", () => {
  const md = toMarkdown(META, MESSAGES);
  assert.match(md, /^# Läuft das Pferd gut\?/);
  assert.match(md, /Pferd: Filou/);
  assert.match(md, /## Beobachtungen aus dem Video/);
  assert.match(md, /## Frage/);
  assert.match(md, /## Antwort/);
  assert.match(md, /\*\*Belege\*\*/);
  assert.match(md, /WALK \(S\. 25\)/);
  assert.match(md, /IMG\.mp4/);
  assert.match(md, /0\.0012 USD/);
});

test("json keeps everything, including tool results and usage", () => {
  const parsed = JSON.parse(toJson(META, MESSAGES));
  assert.equal(parsed.conversation.id, META.id);
  assert.equal(parsed.messages.length, 3);
  assert.equal(parsed.messages[0].toolResults[0].name, "analyse_video");
  assert.equal(parsed.messages[2].usage.calls, 3);
  assert.ok(parsed.exportedAt);
});

test("file name is slugged, dated and never empty", () => {
  assert.equal(
    exportFileName(META, "md"),
    "reitbahn-2026-09-02-läuft-das-pferd-gut.md",
  );
  assert.match(exportFileName({ id: "x", title: null }, "json"), /^reitbahn-\d{4}-\d{2}-\d{2}-konversation\.json$/);
  assert.match(
    exportFileName({ id: "x", title: "?!?", createdAt: "2026-01-01" }, "csv"),
    /konversation\.csv$/,
    "Titel ohne verwertbare Zeichen fällt zurück",
  );
});

test("renderExport dispatches on the format", () => {
  assert.match(renderExport("json", META, MESSAGES), /^\{/);
  assert.match(renderExport("csv", META, MESSAGES), /^"conversation_id"/);
  assert.match(renderExport("md", META, MESSAGES), /^# /);
});

test("an empty conversation exports without throwing", () => {
  const csv = toCsv(META, []);
  assert.match(csv, /^"conversation_id"/);
  assert.ok(csv.endsWith("\n"));
  assert.equal(csv.split(META.id).length - 1, 0, "keine Datenzeilen");
  assert.match(toMarkdown(META, []), /^# /);
  assert.equal(JSON.parse(toJson(META, [])).messages.length, 0);
});

console.log(`\n${passed} Tests bestanden.`);
