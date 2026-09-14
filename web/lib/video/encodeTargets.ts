/** Target values for the re-encode: dimensions, bitrate, container. Pure arithmetic. */

export const MAX_EDGE = 1280;

export const CAPTURE_FPS = 30;

export const TARGET_BYTES = 14 * 1024 * 1024;

export const MIN_BITS_PER_SECOND = 700_000;
export const MAX_BITS_PER_SECOND = 4_000_000;

export function targetSize(
  width: number,
  height: number,
  maxEdge = MAX_EDGE,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error("Unbrauchbare Videomasse");
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

export function pickBitrate(
  seconds: number,
  budgetBytes = TARGET_BYTES,
): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return MIN_BITS_PER_SECOND;
  const fromBudget = (budgetBytes * 8) / seconds;
  return Math.round(
    Math.min(MAX_BITS_PER_SECOND, Math.max(MIN_BITS_PER_SECOND, fromBudget)),
  );
}

export const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
] as const;

export function pickMimeType(
  isSupported: (type: string) => boolean,
  candidates: readonly string[] = MIME_CANDIDATES,
): string | null {
  for (const candidate of candidates) if (isSupported(candidate)) return candidate;
  return null;
}

export function containerOf(mimeType: string): string {
  return mimeType.split(";")[0].trim();
}

export function worthCompressing(input: {
  bytes: number;
  width: number;
  height: number;
  budgetBytes?: number;
  maxEdge?: number;
}): boolean {
  const budget = input.budgetBytes ?? TARGET_BYTES;
  const maxEdge = input.maxEdge ?? MAX_EDGE;
  return input.bytes > budget || Math.max(input.width, input.height) > maxEdge;
}

export function fileNameFor(container: string, stem = "clip"): string {
  const ext = container === "video/webm" ? "webm" : "mp4";
  return `${stem}.${ext}`;
}
