/** Waiting state with the current phase. */

"use client";

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[14px] text-muted">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${i * 200}ms`, animationDuration: "1.2s" }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
