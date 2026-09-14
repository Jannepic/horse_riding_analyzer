/** Serves a locally stored video; ownership is decided by RLS through the message row. */

import { createClient } from "@/lib/supabase/server";
import { isConversationId, isVideoFileName, mimeForFileName } from "@/lib/video/paths";
import { readVideo } from "@/lib/video/store";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ conversationId: string; file: string }> },
) {
  const { conversationId, file } = await params;
  if (!isConversationId(conversationId) || !isVideoFileName(file)) {
    return new Response("Nicht gefunden.", { status: 404 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new Response("Nicht angemeldet.", { status: 401 });

  const { data: message } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("video_file", file)
    .maybeSingle();
  if (!message) return new Response("Nicht gefunden.", { status: 404 });

  const bytes = await readVideo(conversationId, file);
  if (!bytes) {
    return new Response("Die Videodatei liegt nicht mehr vor.", { status: 410 });
  }

  const type = mimeForFileName(file);
  const total = bytes.length;

  const range = req.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
    if (Number.isNaN(start) || start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206,
      headers: {
        "Content-Type": type,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  });
}
