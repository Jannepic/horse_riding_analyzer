/** Re-encodes the clip to 720p in the browser using canvas and MediaRecorder. Needs a visible window. */

import {
  CAPTURE_FPS, containerOf, pickBitrate, pickMimeType, targetSize,
} from "./encodeTargets.ts";

export type CompressResult = {
  blob: Blob;

  mimeType: string;
  width: number;
  height: number;
  seconds: number;
};

type FrameScheduler = (draw: () => void) => void;

function schedulerFor(video: HTMLVideoElement): FrameScheduler {
  const withFrameCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: () => void) => number;
  };
  return typeof withFrameCallback.requestVideoFrameCallback === "function"
    ? (draw) => void withFrameCallback.requestVideoFrameCallback!(draw)
    : (draw) => void requestAnimationFrame(draw);
}

function loadMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error("Der Browser kann dieses Video nicht dekodieren."));
  });
}

export async function compressVideo(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<CompressResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Dieser Browser kann nicht aufnehmen (MediaRecorder fehlt).");
  }
  const recordingType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
  if (!recordingType) {
    throw new Error("Dieser Browser bietet kein brauchbares Aufnahmeformat.");
  }

  if (document.hidden) {
    throw new Error(
      "Das Fenster muss sichtbar sein — im Hintergrund hält der Browser die " +
      "Bildausgabe an und die Umwandlung käme nicht voran.",
    );
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await loadMetadata(video);

    const seconds = Number.isFinite(video.duration) ? video.duration : 0;
    const size = targetSize(video.videoWidth, video.videoHeight);

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Kein 2D-Kontext verfügbar.");

    const recorder = new MediaRecorder(canvas.captureStream(CAPTURE_FPS), {
      mimeType: recordingType,
      videoBitsPerSecond: pickBitrate(seconds),
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    const blob = await new Promise<Blob>((resolve, reject) => {
      const schedule = schedulerFor(video);
      let running = false;

      const budgetMs = (seconds > 0 ? seconds * 2000 : 120_000) + 15_000;

      let lastTime = -1;
      let lastProgressAt = Date.now();

      let stall: ReturnType<typeof setInterval>;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const clearTimers = () => { for (const t of timers) clearTimeout(t); };

      const settle = (fn: () => void) => {
        running = false;
        clearTimers();
        clearInterval(stall);
        if (recorder.state !== "inactive") recorder.stop();
        fn();
      };

      stall = setInterval(() => {
        if (!running) return;
        if (video.currentTime > lastTime + 0.01) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
          return;
        }
        if (Date.now() - lastProgressAt > 8000) {
          settle(() =>
            reject(new Error(
              document.hidden
                ? "Das Fenster war im Hintergrund — dort hält der Browser die " +
                  "Bildausgabe an. Lass den Tab sichtbar und versuch es erneut."
                : "Die Wiedergabe kam nicht voran, das Video liess sich nicht umwandeln.",
            )),
          );
        }
      }, 1000);

      timers.push(setTimeout(
        () => settle(() => reject(new Error("Das Umkodieren hat zu lange gebraucht."))),
        budgetMs,
      ));

      recorder.onstop = () => {
        clearTimers();
        clearInterval(stall);
        running = false;
        const out = new Blob(chunks, { type: containerOf(recordingType) });
        if (out.size > 0) resolve(out);
        else reject(new Error("Die Aufnahme blieb leer."));
      };
      recorder.onerror = () =>
        settle(() => reject(new Error("Die Aufnahme ist fehlgeschlagen.")));

      video.onerror = () =>
        settle(() => reject(new Error("Der Browser kann dieses Video nicht dekodieren.")));

      video.onended = () => {
        running = false;
        onProgress?.(1);

        timers.push(setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 200));
      };

      const draw = () => {
        if (!running) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (seconds > 0) onProgress?.(Math.min(1, video.currentTime / seconds));
        schedule(draw);
      };

      recorder.start(1000);
      running = true;
      video.play()
        .then(draw)
        .catch(() =>
          settle(() => reject(new Error("Der Browser konnte das Video nicht abspielen."))),
        );
    });

    return {
      blob,
      mimeType: containerOf(recordingType),
      width: size.width,
      height: size.height,
      seconds,
    };
  } finally {
    video.onended = null;
    video.onerror = null;
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
