/** Attaches a clip: validate, downscale in the browser, show it. The analysis runs on send. */

"use client";

import { useRef, useState } from "react";
import { ClipRejected, prepareClip, type PreparedClip } from "@/lib/video/prepare";
import { MAX_DURATION_S } from "@/lib/video/limits";
import type { Dict } from "@/lib/i18n";

export function VideoPicker({
  clip,
  disabled,
  t,
  onPicked,
  onCleared,
}: {
  clip: PreparedClip | null;
  disabled?: boolean;
  t: Dict;
  onPicked: (clip: PreparedClip) => void;
  onCleared: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);
    setPhase("prüft…");
    try {
      onPicked(await prepareClip(file, setPhase));
    } catch (e) {
      onCleared();
      setError(
        e instanceof ClipRejected || e instanceof Error
          ? e.message
          : t.unknownError,
      );
    } finally {
      setPhase(null);
      if (input.current) input.current.value = "";
    }
  }

  const busy = phase !== null;

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        type="file"

        accept="video/mp4,video/mpeg,video/quicktime,video/webm,.mp4,.m4v,.mov,.mpeg,.mpg,.webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />

      {clip ? (
        <div className="flex items-center gap-2 self-start rounded-lg border border-accent/50
                        bg-accent/8 px-3 py-1.5 text-xs">
          <span className="text-accent">▶</span>
          <span className="max-w-[16rem] truncate">{clip.sourceName}</span>
          <span className="text-muted">
            {(clip.blob.size / 1048576).toFixed(1)} MB
          </span>
          <button
            onClick={onCleared}
            disabled={disabled}
            title={t.removeAttachment}
            className="rounded px-1 text-muted transition-colors hover:text-red-600
                       disabled:opacity-40"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={() => input.current?.click()}
          disabled={busy || disabled}
          title={t.attachTitle}
          className="self-start rounded-lg border border-line px-3 py-1.5 text-xs
                     text-muted transition-colors hover:border-accent hover:text-accent
                     disabled:opacity-40"
        >
          {busy ? phase : `${t.attachVideo} (max. ${MAX_DURATION_S} s)`}
        </button>
      )}

      {/*
        Aufklaerung, weil hier zwei verschiedene Dinge passieren und nur eines
        davon lokal bleibt: zur ANALYSE geht der Clip einmalig an das Modell,
        GESPEICHERT wird er ausschliesslich auf diesem Rechner. Das pauschale
        "liegt nie auf einem fremden Server" waere irrefuehrend gewesen.
      */}
      {!clip && !busy && (
        <p className="max-w-md text-[11px] leading-relaxed text-muted/80">
          {t.attachHint}
        </p>
      )}

      {error && <p className="text-[12px] text-red-700 dark:text-red-300">{error}</p>}
      {!error && clip?.note && <p className="text-[12px] text-muted">{clip.note}</p>}
      {!error && clip && (
        <p className="font-mono text-[11px] leading-relaxed text-muted/70">
          {clip.diagnostics}
        </p>
      )}
    </div>
  );
}
