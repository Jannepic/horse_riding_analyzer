/** Reads a conversation's messages, and deletes the conversation together with its video folder. */

import { deleteConversation, loadMessages } from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/server";
import { isConversationId } from "@/lib/video/paths";
import { deleteConversationVideos } from "@/lib/video/store";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  return auth.user;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isConversationId(id)) return Response.json({ error: "Ungültige ID." }, { status: 400 });
  if (!(await requireUser())) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  return Response.json({ messages: await loadMessages(id) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isConversationId(id)) return Response.json({ error: "Ungültige ID." }, { status: 400 });
  if (!(await requireUser())) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const deleted = await deleteConversation(id);
  if (!deleted) return Response.json({ error: "Nicht gefunden." }, { status: 404 });

  await deleteConversationVideos(id);
  return Response.json({ ok: true });
}
