/** Local video store: one folder per conversation under data/videos. */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { conversationSegment, videoSegments } from "./paths.ts";

export const VIDEO_ROOT = path.join(process.cwd(), "data", "videos");

export async function saveVideo(
  conversationId: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<void> {
  const [folder, file] = videoSegments(conversationId, fileName);
  const dir = path.join(VIDEO_ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), bytes);
}

export async function readVideo(
  conversationId: string,
  fileName: string,
): Promise<Buffer | null> {
  const [folder, file] = videoSegments(conversationId, fileName);
  try {
    return await readFile(path.join(VIDEO_ROOT, folder, file));
  } catch {
    return null;
  }
}

export async function deleteConversationVideos(conversationId: string): Promise<void> {
  const folder = conversationSegment(conversationId);
  await rm(path.join(VIDEO_ROOT, folder), { recursive: true, force: true });
}
