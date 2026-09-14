/** Limits for video uploads. MAX_BYTES is measured: OpenRouter drops the upload after ~43 s. */

export const MAX_DURATION_S = 60;

export const MAX_SOURCE_BYTES = 300 * 1024 * 1024;

export const MAX_BYTES = 20 * 1024 * 1024;

export const SLOW_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_TYPES = ["video/mp4", "video/mpeg", "video/quicktime", "video/webm"] as const;

const BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  mov: "video/quicktime",
  qt: "video/quicktime",
  webm: "video/webm",
};

export function resolveMimeType(
  fileName: string,
  reportedType: string,
): { mimeType: string; source: "browser" | "endung" | "unbekannt" } {
  if ((ALLOWED_TYPES as readonly string[]).includes(reportedType)) {
    return { mimeType: reportedType, source: "browser" };
  }
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const fromExt = BY_EXTENSION[ext];
  if (fromExt) return { mimeType: fromExt, source: "endung" };
  return { mimeType: reportedType, source: "unbekannt" };
}

export type Rejection = { ok: false; reason: string };

export type Acceptance = { ok: true; warning?: string };
export type Check = Acceptance | Rejection;

export function checkType(mimeType: string, fileName = ""): Check {
  const resolved = resolveMimeType(fileName, mimeType);
  if (!(ALLOWED_TYPES as readonly string[]).includes(resolved.mimeType)) {
    const seen = mimeType || "kein Typ gemeldet";
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "keine Endung";
    return {
      ok: false,
      reason:
        `Format wird nicht unterstützt (Browser meldet: ${seen}, Endung: ${ext}). ` +
        `Erlaubt: MP4, MPEG, MOV, WebM.`,
    };
  }
  return { ok: true };
}

export function checkSize(bytes: number): Check {
  if (bytes <= 0) return { ok: false, reason: "Die Datei ist leer." };
  if (bytes > MAX_BYTES) {
    return {
      ok: false,
      reason:
        `Die Datei ist ${(bytes / 1048576).toFixed(1)} MB gross, erlaubt sind ` +
        `${MAX_BYTES / 1048576} MB. Schneide den Clip auf die relevante Stelle zu — ` +
        `ein kurzer Ausschnitt liefert ohnehin genaueres Feedback als eine ganze ` +
        `Trainingseinheit.`,
    };
  }
  if (bytes > SLOW_UPLOAD_BYTES) {
    return {
      ok: true,
      warning:
        `${(bytes / 1048576).toFixed(1)} MB gehen jetzt an die Analyse — das dauert ` +
        `auf einer langsamen Leitung eine Weile. Kommt ein Übertragungsfehler, ist ` +
        `ein kürzerer Ausschnitt die Abhilfe.`,
    };
  }
  return { ok: true };
}

export function checkDuration(seconds: number): Check {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return {
      ok: true,
      warning:
        `Die Länge liess sich im Browser nicht bestimmen — bei MOV aus dem iPhone ` +
        `der Normalfall. Der Clip geht trotzdem an die Analyse. Achte selbst darauf, ` +
        `dass er kurz ist (Richtwert ${MAX_DURATION_S} s): lange Clips kosten mehr ` +
        `und liefern unschärferes Feedback.`,
    };
  }
  if (seconds > MAX_DURATION_S) {
    return {
      ok: false,
      reason:
        `Der Clip ist ${Math.round(seconds)} Sekunden lang, erlaubt sind ` +
        `${MAX_DURATION_S}. Kurze Ausschnitte liefern ohnehin genaueres Feedback ` +
        `als eine ganze Trainingseinheit.`,
    };
  }
  return { ok: true };
}

export function checkSource(bytes: number): Check {
  if (bytes <= 0) return { ok: false, reason: "Die Datei ist leer." };
  if (bytes > MAX_SOURCE_BYTES) {
    return {
      ok: false,
      reason:
        `Die Datei ist ${(bytes / 1048576).toFixed(0)} MB gross. Mehr als ` +
        `${MAX_SOURCE_BYTES / 1048576} MB kann der Browser nicht sinnvoll verarbeiten.`,
    };
  }
  return { ok: true };
}

export function checkVideo(input: {
  mimeType: string;
  bytes: number;
  durationSeconds: number;
  fileName?: string;
}): Check {
  const warnings: string[] = [];
  for (const check of [
    checkType(input.mimeType, input.fileName ?? ""),
    checkSource(input.bytes),
    checkDuration(input.durationSeconds),
  ]) {
    if (!check.ok) return check;
    if (check.warning) warnings.push(check.warning);
  }
  return warnings.length ? { ok: true, warning: warnings.join(" ") } : { ok: true };
}

export function describeFile(input: {
  fileName: string;
  reportedType: string;
  bytes: number;
  durationSeconds: number;
}): string {
  const { mimeType, source } = resolveMimeType(input.fileName, input.reportedType);
  const readable = Number.isFinite(input.durationSeconds) && input.durationSeconds > 0;
  return [
    input.fileName || "ohne Namen",
    `Browser: ${input.reportedType || "kein Typ"}`,
    `verwendet: ${mimeType || "keiner"} (${source})`,
    `${(input.bytes / 1048576).toFixed(1)} MB`,
    readable ? `${input.durationSeconds.toFixed(1)} s` : "Länge nicht lesbar",
  ].join(" · ");
}
