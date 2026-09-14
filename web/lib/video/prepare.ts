/** Prepares a clip in the browser and sends it off for analysis. */

import { compressVideo } from "./compress.ts";
import { fileNameFor, worthCompressing } from "./encodeTargets.ts";
import { checkSize, checkVideo, describeFile, resolveMimeType } from "./limits.ts";

export type PreparedClip = {
  blob: Blob;
  mimeType: string;

  uploadName: string;

  sourceName: string;

  diagnostics: string;

  note?: string;
};

export class ClipRejected extends Error {}

function readMetadata(
  file: File,
): Promise<{ seconds: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const done = (seconds: number, width: number, height: number) => {
      URL.revokeObjectURL(url);
      resolve({ seconds, width, height });
    };
    probe.onloadedmetadata = () => done(probe.duration, probe.videoWidth, probe.videoHeight);
    probe.onerror = () => done(Number.NaN, 0, 0);
    probe.src = url;
  });
}

export async function prepareClip(
  file: File,
  onPhase?: (phase: string) => void,
): Promise<PreparedClip> {
  const meta = await readMetadata(file);
  const measured = describeFile({
    fileName: file.name,
    reportedType: file.type,
    bytes: file.size,
    durationSeconds: meta.seconds,
  });

  const verdict = checkVideo({
    mimeType: file.type,
    bytes: file.size,
    durationSeconds: meta.seconds,
    fileName: file.name,
  });
  if (!verdict.ok) throw new ClipRejected(verdict.reason);

  const notes: string[] = [];
  if (verdict.warning) notes.push(verdict.warning);

  let blob: Blob = file;
  let mimeType = resolveMimeType(file.name, file.type).mimeType;
  let uploadName = file.name;
  let diagnostics = measured;
  let recoded = false;

  const shouldCompress =
    meta.width > 0 &&
    worthCompressing({ bytes: file.size, width: meta.width, height: meta.height });

  if (shouldCompress) {
    onPhase?.("verkleinert… 0 %");
    try {
      const result = await compressVideo(file, (f) =>
        onPhase?.(`verkleinert… ${Math.round(f * 100)} %`),
      );
      blob = result.blob;
      mimeType = result.mimeType;
      uploadName = fileNameFor(result.mimeType);
      recoded = true;
      const factor = file.size / Math.max(1, result.blob.size);
      diagnostics =
        `${measured}  ->  ${result.width}×${result.height} · ` +
        `${(result.blob.size / 1048576).toFixed(1)} MB · ${mimeType} ` +
        `(${factor.toFixed(1)}× kleiner)`;
    } catch (error) {
      notes.push(
        `Verkleinern nicht möglich (${error instanceof Error ? error.message : "unbekannt"}) — ` +
        `es wird die Originaldatei geschickt.`,
      );
    }
  }

  const sizeVerdict = checkSize(blob.size);
  if (!sizeVerdict.ok) {
    throw new ClipRejected(
      recoded
        ? sizeVerdict.reason
        : `${sizeVerdict.reason} (Verkleinern im Browser war hier nicht möglich.)`,
    );
  }
  if (sizeVerdict.warning) notes.push(sizeVerdict.warning);

  return {
    blob, mimeType, uploadName, sourceName: file.name, diagnostics,
    note: notes.length ? notes.join(" ") : undefined,
  };
}

export async function requestAnalysis(
  clip: PreparedClip,
  options: { focus?: string; conversationId?: string; language?: string },
): Promise<{ analysis: unknown; videoFile: string | null }> {
  const body = new FormData();
  body.append("video", clip.blob, clip.uploadName);

  body.append("mimeType", clip.mimeType);
  if (options.focus?.trim()) body.append("focus", options.focus.trim());
  if (options.conversationId) body.append("conversationId", options.conversationId);
  if (options.language) body.append("language", options.language);

  const res = await fetch("/api/video", { method: "POST", body });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error ?? `Analyse fehlgeschlagen (${res.status})`);
  }
  return (await res.json()) as { analysis: unknown; videoFile: string | null };
}
