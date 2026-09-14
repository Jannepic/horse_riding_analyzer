/** Tests for turning stored messages back into turns. */

import assert from "node:assert/strict";
import { turnsFromMessages, type StoredLike } from "./turns.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const base = {
  sources: [] as unknown[], toolResults: [] as unknown[], usage: null,
  videoFile: null as string | null, videoName: null as string | null,
};
const msg = (role: StoredLike["role"], content: string, extra: Partial<StoredLike> = {}) =>
  ({ ...base, role, content, ...extra }) as StoredLike;

const ANALYSIS = {
  gait: "Schritt",
  observations: [{ claim: "Viertakt", confidence: "hoch", aspect: "Takt" }],
  notAssessable: ["Versammlung"],
  usage: { inputTokens: 1, outputTokens: 2, costUsd: 0.001 },
};

test("pairs question and answer into one turn", () => {
  const turns = turnsFromMessages([
    msg("user", "Was ist Takt?"),
    msg("assistant", "Gleichmäßigkeit.", { sources: [{ citation: "WALK (S. 25)" }] }),
  ]);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].question, "Was ist Takt?");
  assert.equal(turns[0].answer, "Gleichmäßigkeit.");
  assert.equal(turns[0].sources.length, 1);
  assert.equal(turns[0].done, true);
});

test("keeps several turns in order", () => {
  const turns = turnsFromMessages([
    msg("user", "erste"), msg("assistant", "A"),
    msg("user", "zweite"), msg("assistant", "B"),
  ]);
  assert.deepEqual(turns.map((t) => [t.question, t.answer]), [["erste", "A"], ["zweite", "B"]]);
});

test("attaches the observation that preceded the question", () => {
  const turns = turnsFromMessages([
    msg("observation", "Beobachtungen…", {
      toolResults: [{ name: "analyse_video", result: ANALYSIS }],
      videoFile: "abc.mp4", videoName: "IMG.mp4",
    }),
    msg("user", "Ordne das ein"),
    msg("assistant", "Der Schritt ist ein Viertakt."),
  ]);
  assert.equal(turns.length, 1, "keine eigene Runde für die Beobachtung");
  assert.equal(turns[0].observations?.gait, "Schritt");
  assert.equal(turns[0].videoFile, "abc.mp4");
  assert.equal(turns[0].videoName, "IMG.mp4");
  assert.equal(turns[0].answer, "Der Schritt ist ein Viertakt.");
});

test("recovers tool results and usage for the display", () => {
  const turns = turnsFromMessages([
    msg("user", "7, 6 und 8?"),
    msg("assistant", "70 %", {
      toolResults: [{ name: "score_test_sheet", result: { percent: 70 } }],
      usage: { inputTokens: 10, outputTokens: 5, reasoningTokens: 1, costUsd: 0.002, calls: 2 },
    }),
  ]);
  assert.deepEqual(turns[0].tools, ["score_test_sheet"]);
  assert.deepEqual(turns[0].toolResults[0].result, { percent: 70 });
  assert.equal(turns[0].usage?.calls, 2);
});

test("an observation with no question still shows up", () => {
  const turns = turnsFromMessages([
    msg("observation", "…", { videoFile: "a.mp4", videoName: "IMG.mp4" }),
  ]);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].question, "");
  assert.equal(turns[0].videoFile, "a.mp4");
});

test("two observations in a row each keep their video", () => {
  const turns = turnsFromMessages([
    msg("observation", "…", { videoFile: "a.mp4" }),
    msg("observation", "…", { videoFile: "b.mp4" }),
    msg("user", "und jetzt?"),
    msg("assistant", "…"),
  ]);
  assert.deepEqual(turns.map((t) => t.videoFile), ["a.mp4", "b.mp4"]);
  assert.equal(turns[1].question, "und jetzt?");
});

test("malformed tool_results do not throw", () => {
  const turns = turnsFromMessages([
    msg("observation", "…", { toolResults: "kaputt" as unknown as unknown[] }),
    msg("user", "?"),
    msg("assistant", "!", { toolResults: [{ ohne: "name" }, null] as unknown[] }),
  ]);
  assert.equal(turns[0].observations, undefined);
  assert.deepEqual(turns[0].tools, []);
});

test("an answer with no question is shown, not swallowed", () => {
  const turns = turnsFromMessages([msg("assistant", "verwaist")]);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].answer, "verwaist");
});

test("empty input yields no turns", () => {
  assert.deepEqual(turnsFromMessages([]), []);
});

console.log(`\n${passed} Tests bestanden.`);
