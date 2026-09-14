/** Tests against path traversal in both path positions. */

import assert from "node:assert/strict";
import {
  conversationSegment, extensionFor, isConversationId, isVideoFileName,
  mimeForFileName, videoFileName, videoSegments,
} from "./paths.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`  ok  ${name}`); };

const ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const OTHER = "9c858901-8a57-4791-81fe-4c455b099bc9";

test("accepts a real uuid, rejects everything else", () => {
  assert.equal(isConversationId(ID), true);
  assert.equal(isConversationId(ID.toUpperCase()), true, "Grossschreibung");
  for (const bad of ["", "web-abc123", "../..", "3f2504e0", `${ID}/..`, `${ID} `]) {
    assert.equal(isConversationId(bad), false, bad);
  }
});

test("rejects path traversal in every position", () => {
  assert.throws(() => videoSegments("../../etc", "x.mp4"), /Konversations-ID/);
  assert.throws(() => videoSegments(ID, "../../../etc/passwd"), /Dateiname/);
  assert.throws(() => videoSegments(ID, `${OTHER}.mp4/../x`), /Dateiname/);
  assert.throws(() => videoSegments(ID, "..%2f..%2fx.mp4"), /Dateiname/);
  assert.throws(() => videoSegments(ID, "/etc/passwd"), /Dateiname/);
});

test("segments come back lowercased and separator-free", () => {
  const seg = videoSegments(ID.toUpperCase(), `${OTHER.toUpperCase()}.MP4`);
  assert.deepEqual(seg, [ID, `${OTHER}.mp4`]);
  for (const s of seg) {
    assert.doesNotMatch(s, /[/\\]/, s);
    assert.doesNotMatch(s, /\.\./, s);
  }
});

test("only known extensions pass", () => {
  assert.equal(isVideoFileName(`${ID}.mp4`), true);
  assert.equal(isVideoFileName(`${ID}.webm`), true);
  assert.equal(isVideoFileName(`${ID}.exe`), false);
  assert.equal(isVideoFileName(`${ID}.mp4.sh`), false);
  assert.equal(isVideoFileName("clip.mp4"), false, "muss eine UUID sein");
});

test("extensionFor never returns free text", () => {
  assert.equal(extensionFor("video/webm"), "webm");
  assert.equal(extensionFor("video/quicktime"), "mov");
  assert.equal(extensionFor("was/anderes"), "mp4", "Rückfall statt Durchreichen");
  assert.equal(extensionFor("../evil"), "mp4");
});

test("videoFileName names the file after the message", () => {
  assert.equal(videoFileName(ID, "video/mp4"), `${ID}.mp4`);
  assert.throws(() => videoFileName("nicht-uuid", "video/mp4"), /Nachrichten-ID/);
});

test("conversationSegment guards the folder name", () => {
  assert.equal(conversationSegment(ID), ID);
  assert.throws(() => conversationSegment(".."), /Konversations-ID/);
});

test("mimeForFileName maps back for the response header", () => {
  assert.equal(mimeForFileName(`${ID}.mp4`), "video/mp4");
  assert.equal(mimeForFileName(`${ID}.webm`), "video/webm");
  assert.equal(mimeForFileName("x.unknown"), "application/octet-stream");
});

console.log(`\n${passed} Tests bestanden.`);
