/** Tests for the training-load analysis. */

import assert from "node:assert/strict";
import { analyseLoad, REST_DAY_WARNING_STREAK } from "./trainingLoad.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const s = (date: string, durationMin = 60, intensity = 3, focus?: string) =>
  ({ date, durationMin, intensity, focus });

test("counts sessions, minutes and load", () => {
  const r = analyseLoad([s("2026-08-01", 60, 3), s("2026-08-03", 30, 4)]);
  assert.equal(r.sessions, 2);
  assert.equal(r.totalMinutes, 90);
  assert.equal(r.totalLoad, 60 * 3 + 30 * 4);
});

test("sessions per week is normalised to the logged span", () => {
  const r = analyseLoad([s("2026-08-01"), s("2026-08-05"), s("2026-08-09"), s("2026-08-14")]);
  assert.equal(r.spanDays, 14);
  assert.equal(r.sessionsPerWeek, 2);
});

test("finds the longest run of consecutive days", () => {
  const r = analyseLoad([
    s("2026-08-01"), s("2026-08-02"), s("2026-08-03"),
    s("2026-08-06"),
  ]);
  assert.equal(r.longestStreakWithoutRest, 3);
});

test("two sessions on one day do not extend the streak", () => {
  const r = analyseLoad([s("2026-08-01"), s("2026-08-01", 30), s("2026-08-02")]);
  assert.equal(r.longestStreakWithoutRest, 2);
});

test("warns only once the streak reaches the threshold", () => {
  const days = Array.from({ length: REST_DAY_WARNING_STREAK }, (_, i) =>
    s(`2026-08-${String(i + 1).padStart(2, "0")}`));
  assert.match(analyseLoad(days).observations.join(" "), /ohne Pausentag/);
  assert.equal(analyseLoad(days.slice(0, -1)).observations.length, 0);
});

test("flags a jump in weekly load", () => {
  const r = analyseLoad(
    [
      s("2026-08-01", 60, 2), // Vorwoche, Last 120
      s("2026-08-10", 60, 5), // letzte Woche, Last 300
      s("2026-08-12", 60, 5),
    ],
    { today: "2026-08-14" },
  );
  assert.match(r.observations.join(" "), /Faktor/);
});

test("notices an empty last week", () => {
  const r = analyseLoad([s("2026-07-01")], { today: "2026-08-14" });
  assert.match(r.observations.join(" "), /keine Einheit/);
});

test("counts days to the target competition", () => {
  const r = analyseLoad([s("2026-08-01")], { today: "2026-08-01", targetDate: "2026-08-29" });
  assert.equal(r.daysToTarget, 28);
});

test("counts focus areas", () => {
  const r = analyseLoad([
    s("2026-08-01", 60, 3, "Galopparbeit"),
    s("2026-08-02", 60, 3, "Galopparbeit"),
    s("2026-08-03", 60, 3, "Seitengänge"),
  ]);
  assert.deepEqual(r.focusCounts, { Galopparbeit: 2, "Seitengänge": 1 });
});

test("rejects empty input and bad dates", () => {
  assert.throws(() => analyseLoad([]), /Trainingseinheiten/);
  assert.throws(() => analyseLoad([s("nicht-ein-datum")]), /Ungültiges Datum/);
});

test("unsorted input gives the same result as sorted", () => {
  const a = analyseLoad([s("2026-08-03"), s("2026-08-01"), s("2026-08-02")]);
  const b = analyseLoad([s("2026-08-01"), s("2026-08-02"), s("2026-08-03")]);
  assert.deepEqual(a, b);
});

console.log(`\n${passed} Tests bestanden.`);
