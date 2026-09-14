/** Tests for the format, size and duration checks. */

import assert from "node:assert/strict";
import {
  checkDuration, checkSize, checkType, checkVideo, describeFile,
  checkSource, MAX_BYTES, MAX_DURATION_S, MAX_SOURCE_BYTES, resolveMimeType,
  SLOW_UPLOAD_BYTES,
} from "./limits.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("accepts the formats OpenRouter documents", () => {
  for (const t of ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"]) {
    assert.equal(checkType(t).ok, true, t);
  }
});

test("rejects other formats with a usable message", () => {
  const r = checkType("image/png");
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /MP4/);
});

test("rejects an empty type when the extension does not help either", () => {
  assert.equal(checkType("", "clip.txt").ok, false);
  assert.equal(checkType("").ok, false);
});

test("falls back to the file extension when the browser reports nothing", () => {
  assert.equal(checkType("", "galopp.mov").ok, true, "MOV vom iPhone");
  assert.equal(checkType("", "galopp.mp4").ok, true);
  assert.equal(checkType("", "GALOPP.MP4").ok, true, "Grossschreibung");
  assert.equal(checkType("", "clip.webm").ok, true);
});

test("falls back for unhelpful types the browser sometimes invents", () => {
  assert.equal(checkType("application/octet-stream", "clip.mp4").ok, true);
  assert.equal(checkType("video/x-m4v", "clip.m4v").ok, true);
});

test("resolveMimeType reports where the value came from", () => {
  assert.deepEqual(resolveMimeType("a.mp4", "video/mp4"), {
    mimeType: "video/mp4", source: "browser",
  });
  assert.deepEqual(resolveMimeType("a.mov", ""), {
    mimeType: "video/quicktime", source: "endung",
  });
  assert.equal(resolveMimeType("a.txt", "").source, "unbekannt");
});

test("the rejection message names what was actually detected", () => {
  const r = checkType("", "notiz.txt");
  assert.equal(r.ok, false);
  const reason = (r as { reason: string }).reason;
  assert.match(reason, /kein Typ gemeldet/);
  assert.match(reason, /txt/);
});

test("size limit keeps clear headroom under the measured failure band", () => {
  assert.ok(MAX_BYTES <= 28 * 1024 * 1024, "unter dem gemessenen Abbruch");
  assert.equal(checkSize(MAX_BYTES).ok, true);
  assert.equal(checkSize(MAX_BYTES + 1).ok, false);
  assert.equal(checkSize(0).ok, false);
});

test("a large but allowed file warns about the upload time", () => {
  const r = checkSize(SLOW_UPLOAD_BYTES + 1);
  assert.equal(r.ok, true);
  assert.match((r as { warning: string }).warning, /dauert/);
  assert.equal((checkSize(1024) as { warning?: string }).warning, undefined);
});

test("duration limit", () => {
  assert.equal(checkDuration(MAX_DURATION_S).ok, true);
  assert.equal(checkDuration(MAX_DURATION_S + 0.5).ok, false);
});

test("an unreadable duration warns instead of rejecting", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0]) {
    const r = checkDuration(value);
    assert.equal(r.ok, true, String(value));
    assert.match((r as { warning: string }).warning, /nicht bestimmen/);
  }
});

test("checkVideo passes the duration warning through", () => {
  const r = checkVideo({
    mimeType: "", bytes: 5 * 1024 * 1024, durationSeconds: Number.NaN, fileName: "IMG_0042.MOV",
  });
  assert.equal(r.ok, true, "MOV ohne lesbare Dauer muss durchgehen");
  assert.match((r as { warning: string }).warning, /iPhone/);
});

test("a clip that is measurably too long is still rejected", () => {
  const r = checkVideo({
    mimeType: "video/mp4", bytes: 1e6, durationSeconds: 120, fileName: "lang.mp4",
  });
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /Sekunden lang/);
});

test("describeFile names every measured value", () => {
  const line = describeFile({
    fileName: "IMG_0042.MOV", reportedType: "", bytes: 12 * 1048576, durationSeconds: Number.NaN,
  });
  assert.match(line, /IMG_0042\.MOV/);
  assert.match(line, /kein Typ/);
  assert.match(line, /video\/quicktime \(endung\)/);
  assert.match(line, /12\.0 MB/);
  assert.match(line, /nicht lesbar/);
  assert.match(describeFile({
    fileName: "a.mp4", reportedType: "video/mp4", bytes: 1e6, durationSeconds: 8.25,
  }), /8\.3 s/);
});

test("checkVideo reports the first violation only", () => {
  const r = checkVideo({ mimeType: "image/png", bytes: 999e6, durationSeconds: 600, fileName: "x.png" });
  assert.equal(r.ok, false);
  assert.match((r as { reason: string }).reason, /Format/, "Typ zuerst");
});

test("the source limit is generous, the upload limit is not", () => {
  assert.ok(MAX_SOURCE_BYTES > MAX_BYTES * 5);
  assert.equal(checkSource(120 * 1024 * 1024).ok, true, "120 MB Quelle ist in Ordnung");
  assert.equal(checkSize(120 * 1024 * 1024).ok, false, "als Upload aber nicht");
  assert.equal(checkSource(MAX_SOURCE_BYTES + 1).ok, false);
  assert.equal(checkSource(0).ok, false);
});

test("checkVideo judges the source, not the upload", () => {
  const r = checkVideo({
    mimeType: "video/quicktime", bytes: 60 * 1024 * 1024,
    durationSeconds: 40, fileName: "IMG_0042.MOV",
  });
  assert.equal(r.ok, true);
});

test("a valid clip passes", () => {
  assert.equal(
    checkVideo({ mimeType: "video/mp4", bytes: 8 * 1024 * 1024, durationSeconds: 22 }).ok,
    true,
  );
});

console.log(`\n${passed} Tests bestanden.`);
