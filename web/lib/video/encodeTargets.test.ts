/** Tests for target dimensions, bitrate and container choice. */

import assert from "node:assert/strict";
import {
  containerOf, fileNameFor, MAX_BITS_PER_SECOND, MAX_EDGE, MIN_BITS_PER_SECOND,
  MIME_CANDIDATES, pickBitrate, pickMimeType, TARGET_BYTES, targetSize,
  worthCompressing,
} from "./encodeTargets.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

test("targetSize caps the longest edge and keeps the aspect ratio", () => {
  const a = targetSize(3840, 2160);
  assert.equal(a.width, MAX_EDGE);
  assert.equal(a.height, 720);

  const b = targetSize(1080, 1920);
  assert.equal(b.height, MAX_EDGE);
  assert.equal(b.width, 720);
});

test("targetSize never upscales", () => {
  assert.deepEqual(targetSize(640, 480), { width: 640, height: 480 });
});

test("targetSize returns even numbers — odd sizes break some encoders", () => {
  for (const [w, h] of [[1921, 1081], [999, 333], [3, 7]]) {
    const t = targetSize(w, h);
    assert.equal(t.width % 2, 0, `Breite ${t.width}`);
    assert.equal(t.height % 2, 0, `Höhe ${t.height}`);
  }
});

test("targetSize rejects unusable dimensions instead of producing NaN", () => {
  assert.throws(() => targetSize(0, 100), /Unbrauchbare/);
  assert.throws(() => targetSize(Number.NaN, 100), /Unbrauchbare/);
});

test("pickBitrate spends the budget over the clip length", () => {
  const b = pickBitrate(60);
  assert.ok(b > 1_800_000 && b < 2_000_000, String(b));

  assert.ok((b * 60) / 8 <= TARGET_BYTES * 1.01);
});

test("pickBitrate clamps at both ends", () => {
  assert.equal(pickBitrate(1), MAX_BITS_PER_SECOND, "kurzer Clip: Obergrenze");
  assert.equal(pickBitrate(600), MIN_BITS_PER_SECOND, "langer Clip: Untergrenze");
  assert.equal(pickBitrate(Number.NaN), MIN_BITS_PER_SECOND, "unbekannte Länge");
});

test("pickMimeType prefers mp4 and falls back to webm", () => {
  assert.equal(pickMimeType(() => true), MIME_CANDIDATES[0]);
  assert.equal(
    pickMimeType((t) => t.startsWith("video/webm")),
    "video/webm;codecs=vp9",
    "Chrome ohne MP4-Muxer",
  );
  assert.equal(pickMimeType(() => false), null, "nichts unterstützt");
});

test("containerOf drops the codec", () => {
  assert.equal(containerOf("video/webm;codecs=vp9"), "video/webm");
  assert.equal(containerOf("video/mp4"), "video/mp4");
});

test("worthCompressing skips work that would only cost quality", () => {
  assert.equal(worthCompressing({ bytes: 2e6, width: 640, height: 480 }), false);
  assert.equal(worthCompressing({ bytes: 30e6, width: 640, height: 480 }), true, "zu gross");
  assert.equal(worthCompressing({ bytes: 2e6, width: 3840, height: 2160 }), true, "zu hochauflösend");
});

test("fileNameFor gives the route an extension it can read", () => {
  assert.equal(fileNameFor("video/webm"), "clip.webm");
  assert.equal(fileNameFor("video/mp4"), "clip.mp4");
});

console.log(`\n${passed} Tests bestanden.`);
