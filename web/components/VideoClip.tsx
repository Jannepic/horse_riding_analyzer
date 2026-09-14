/** Player for a stored video in the history. */

"use client";

import type { Dict } from "@/lib/i18n";

export function VideoClip({
  conversationId,
  file,
  name,
  t,
}: {
  conversationId: string;
  file: string;
  name?: string | null;
  t: Dict;
}) {
  const src = `/api/video/file/${conversationId}/${file}`;

  return (
    <details className="rounded-xl border border-line bg-surface">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[13px] text-muted">
        ▶ {t.watchVideo}{name ? ` — ${name}` : ""}
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <video
          controls
          preload="metadata"
          src={src}
          className="w-full rounded-lg bg-black"
        />
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-[12px] text-muted underline decoration-line
                     hover:text-accent"
        >
          {t.openInTab}
        </a>
      </div>
    </details>
  );
}
