/** Collapsible evidence panel with citation, excerpt and how the hit was found. */

"use client";

import type { Dict } from "@/lib/i18n";

import { useState } from "react";
import type { SourceRef } from "@/lib/chat/events";

export function Sources({ sources, t }: { sources: SourceRef[]; t: Dict }) {
  const [open, setOpen] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted hover:text-accent"
      >
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        {sources.length} {sources.length === 1 ? t.evidenceOne : t.evidenceMany}
        {!open && <span className="text-[11px]">— zum Nachlesen aufklappen</span>}
      </button>

      {open && (
        <ol className="mt-3 flex flex-col gap-2">
          {sources.map((s, i) => (
            <li key={i} className="rounded-md border border-line bg-background p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium">{s.citation}</span>
                <span className="font-mono text-[10px] text-muted">
                  {s.foundBy.join("  ")}
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.excerpt}…</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
