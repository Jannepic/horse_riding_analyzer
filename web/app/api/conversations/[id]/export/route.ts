/** Downloads a conversation as a file — json, md or csv. */

import {
  exportFileName, MIME, renderExport, type ExportFormat,
} from "@/lib/chat/export";
import { loadMessages } from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/server";
import { isConversationId } from "@/lib/video/paths";

export const runtime = "nodejs";

const FORMATS: ExportFormat[] = ["json", "md", "csv"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isConversationId(id)) {
    return Response.json({ error: "Ungültige ID." }, { status: 400 });
  }

  const requested = new URL(req.url).searchParams.get("format") ?? "md";
  if (!FORMATS.includes(requested as ExportFormat)) {
    return Response.json(
      { error: `Format unbekannt. Erlaubt: ${FORMATS.join(", ")}.` },
      { status: 400 },
    );
  }
  const format = requested as ExportFormat;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, title, created_at, horses(name)")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return Response.json({ error: "Nicht gefunden." }, { status: 404 });

  const messages = await loadMessages(id);
  const meta = {
    id,
    title: (conversation.title as string | null) ?? null,

    horseName:
      ((conversation.horses as { name: string }[] | null) ?? [])[0]?.name ?? null,
    createdAt: conversation.created_at as string,
  };

  return new Response(renderExport(format, meta, messages), {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${exportFileName(meta, format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
