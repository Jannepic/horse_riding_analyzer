/** Sidebar: horses on top, conversation history below. */

"use client";

import type { ConversationSummary } from "@/lib/chat/history";
import type { Dict } from "@/lib/i18n";

export type Horse = { id: string; name: string; training_level: string | null };

export function Sidebar({
  open,
  horses,
  conversations,
  activeId,
  horseId,
  onClose,
  onNew,
  onOpen,
  onDelete,
  onSelectHorse,
  t,
}: {
  open: boolean;
  horses: Horse[];
  conversations: ConversationSummary[];
  activeId: string | null;
  horseId: string;
  onClose: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectHorse: (id: string) => void;
  t: Dict;
}) {
  const visible = horseId
    ? conversations.filter((c) => c.horseId === horseId || c.horseId === null)
    : conversations;

  const horseName = (id: string | null) =>
    id ? horses.find((h) => h.id === id)?.name : undefined;

  return (
    <>
      {}
      {open && (
        <button
          aria-label={t.closeSidebar}
          onClick={onClose}
          className="fixed inset-0 z-20 bg-black/25 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col gap-4 overflow-y-auto
                    border-r border-line bg-surface px-3 py-4 transition-transform
                    md:sticky md:top-0 md:h-dvh md:translate-x-0
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          onClick={() => { onNew(); onClose(); }}
          className="rounded-lg border border-line px-3 py-2 text-left text-[13px]
                     font-medium transition-colors hover:border-accent hover:text-accent"
        >
          {t.newChat}
        </button>

        {horses.length > 0 && (
          <section className="flex flex-col gap-0.5">
            <h2 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide
                           text-muted">
              {t.horses}
            </h2>
            {horseId && (
              <button
                onClick={() => onSelectHorse("")}
                className="rounded-md px-2 py-1.5 text-left text-[13px] text-muted
                           transition-colors hover:bg-background"
              >
                {t.allHorses}
              </button>
            )}
            {horses.map((horse) => (
              <button
                key={horse.id}
                onClick={() => onSelectHorse(horse.id === horseId ? "" : horse.id)}
                className={`flex items-baseline gap-1.5 rounded-md px-2 py-1.5 text-left
                            text-[13px] transition-colors ${
                              horse.id === horseId
                                ? "bg-accent/12 text-accent"
                                : "hover:bg-background"
                            }`}
              >
                <span className="truncate">{horse.name}</span>
                {horse.training_level && (
                  <span className="shrink-0 text-[11px] text-muted">
                    {t.levelPrefix} {horse.training_level}
                  </span>
                )}
              </button>
            ))}
          </section>
        )}

        <section className="flex min-h-0 flex-col gap-0.5">
          <h2 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide
                         text-muted">
            {t.history}
          </h2>

          {visible.length === 0 ? (
            <p className="px-2 py-1 text-[12px] leading-relaxed text-muted">
              {t.historyEmpty}
            </p>
          ) : (
            visible.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-1 rounded-md pr-1 transition-colors ${
                  conversation.id === activeId ? "bg-accent/12" : "hover:bg-background"
                }`}
              >
                <button
                  onClick={() => { onOpen(conversation.id); onClose(); }}
                  className="flex min-w-0 flex-1 flex-col items-start px-2 py-1.5 text-left"
                >
                  <span
                    className={`flex w-full items-center gap-1.5 truncate text-[13px] ${
                      conversation.id === activeId ? "text-accent" : ""
                    }`}
                  >
                    {conversation.hasVideo && (
                      <span title={t.hasVideo} className="shrink-0 text-[11px]">▶</span>
                    )}
                    <span className="truncate">
                      {conversation.title ?? t.untitled}
                    </span>
                  </span>
                  <span className="text-[10px] text-muted">
                    {new Date(conversation.updatedAt).toLocaleDateString(undefined, {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                    })}
                    {horseName(conversation.horseId) && ` · ${horseName(conversation.horseId)}`}
                  </span>
                </button>
                <button
                  onClick={() => onDelete(conversation.id)}
                  title={t.deleteChat}
                  className="shrink-0 rounded px-1.5 py-1 text-[13px] text-muted opacity-0
                             transition-opacity hover:text-red-600 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </section>
      </aside>
    </>
  );
}
