/** Renders a conversation as json, md or csv. */

import type { SourceRef, Usage } from "./events.ts";
import type { StoredMessage } from "./history.ts";

export type ExportFormat = "json" | "md" | "csv";

export type ExportMeta = {
  id: string;
  title: string | null;
  horseName?: string | null;
  createdAt?: string;
};

const ROLE_LABEL: Record<string, string> = {
  user: "Frage",
  assistant: "Antwort",
  observation: "Beobachtungen aus dem Video",
};

export function exportFileName(meta: ExportMeta, format: ExportFormat): string {
  const slug =
    (meta.title ?? "konversation")
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "konversation";
  const day = (meta.createdAt ?? new Date().toISOString()).slice(0, 10);
  return `reitbahn-${day}-${slug}.${format}`;
}

export const MIME: Record<ExportFormat, string> = {
  json: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

export function toJson(meta: ExportMeta, messages: StoredMessage[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      application: "Reitbahn — Dressur-Feedback mit Quellenangabe",
      conversation: meta,
      messages,
    },
    null,
    2,
  );
}

export function toMarkdown(meta: ExportMeta, messages: StoredMessage[]): string {
  const out: string[] = [
    `# ${meta.title ?? "Konversation"}`,
    "",
    `*Reitbahn-Export${meta.horseName ? ` · Pferd: ${meta.horseName}` : ""}` +
      `${meta.createdAt ? ` · begonnen am ${meta.createdAt.slice(0, 10)}` : ""}*`,
    "",
  ];

  for (const message of messages) {
    out.push(`## ${ROLE_LABEL[message.role] ?? message.role}`, "");
    out.push(message.content.trim(), "");

    if (message.videoName) {
      out.push(
        `*Video: ${message.videoName}` +
          `${message.videoFile ? ` (lokal gespeichert als ${message.videoFile})` : ""}*`,
        "",
      );
    }

    const sources = message.sources as SourceRef[];
    if (Array.isArray(sources) && sources.length) {
      out.push("**Belege**", "");
      for (const source of sources) {
        out.push(`- ${source.citation} — ${source.excerpt}`);
      }
      out.push("");
    }

    const usage = message.usage as Usage | null;
    if (usage) {
      out.push(
        `*${usage.calls} Modellaufrufe · ` +
          `${usage.inputTokens + usage.outputTokens} Tokens ` +
          `(davon ${usage.reasoningTokens} Reasoning) · ` +
          `${usage.costUsd.toFixed(4)} USD*`,
        "",
      );
    }
  }

  return out.join("\n");
}

export function csvField(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(meta: ExportMeta, messages: StoredMessage[]): string {
  const header = [
    "conversation_id", "created_at", "role", "content", "video_name",
    "sources", "tools", "tokens", "cost_usd",
  ];
  const rows = [header.map(csvField).join(",")];

  for (const message of messages) {
    const sources = (message.sources as SourceRef[]) ?? [];
    const tools = (message.toolResults as { name?: string }[]) ?? [];
    const usage = message.usage as Usage | null;
    rows.push(
      [
        meta.id,
        message.createdAt,
        message.role,
        message.content,
        message.videoName,
        sources.map((s) => s.citation).join(" | "),
        tools.map((t) => t.name ?? "").filter(Boolean).join(" | "),
        usage ? usage.inputTokens + usage.outputTokens : "",
        usage ? usage.costUsd.toFixed(6) : "",
      ].map(csvField).join(","),
    );
  }

  return `${rows.join("\n")}\n`;
}

export function renderExport(
  format: ExportFormat,
  meta: ExportMeta,
  messages: StoredMessage[],
): string {
  if (format === "json") return toJson(meta, messages);
  if (format === "csv") return toCsv(meta, messages);
  return toMarkdown(meta, messages);
}
