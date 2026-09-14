/** Reads and writes conversations and messages — under the session, so RLS applies. */

import { createClient } from "@/lib/supabase/server";

export type MessageRole = "user" | "assistant" | "observation";

export type StoredMessage = {
  id: string;
  role: MessageRole;
  content: string;
  sources: unknown[];
  toolResults: unknown[];
  usage: unknown | null;
  videoFile: string | null;
  videoName: string | null;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  horseId: string | null;
  updatedAt: string;
  hasVideo: boolean;
};

export function titleFrom(question: string): string {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length <= 48 ? clean : `${clean.slice(0, 47)}…`;
}

export async function ensureConversation(
  id: string,

  options: { horseId?: string | null; title?: string } = {},
): Promise<boolean> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Nicht angemeldet.");

  await supabase
    .from("profiles")
    .upsert({ id: auth.user.id }, { onConflict: "id", ignoreDuplicates: true });

  const { data: existing } = await supabase
    .from("conversations").select("id").eq("id", id).maybeSingle();

  if (existing) {
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        ...("horseId" in options ? { horse_id: options.horseId ?? null } : {}),
      })
      .eq("id", id);
    return false;
  }

  const { error } = await supabase.from("conversations").insert({
    id,
    owner: auth.user.id,
    horse_id: options.horseId ?? null,
    title: options.title ?? null,
  });
  if (error) throw new Error(`Konversation konnte nicht angelegt werden: ${error.message}`);
  return true;
}

export async function setTitleIfEmpty(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("conversations").update({ title }).eq("id", id).is("title", null);
}

export async function appendMessage(
  conversationId: string,
  message: {
    id?: string;
    role: MessageRole;
    content: string;
    sources?: unknown[];
    toolResults?: unknown[];
    usage?: unknown;
    videoFile?: string | null;
    videoName?: string | null;
  },
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      ...(message.id ? { id: message.id } : {}),
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      sources: message.sources ?? [],
      tool_results: message.toolResults ?? [],
      usage: message.usage ?? null,
      video_file: message.videoFile ?? null,
      video_name: message.videoName ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Nachricht konnte nicht gespeichert werden: ${error.message}`);
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data.id as string;
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, title, horse_id, updated_at, messages(video_file)")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    horseId: (row.horse_id as string | null) ?? null,
    updatedAt: row.updated_at as string,
    hasVideo: ((row.messages ?? []) as { video_file: string | null }[])
      .some((m) => m.video_file),
  }));
}

export async function loadMessages(conversationId: string): Promise<StoredMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, role, content, sources, tool_results, usage, video_file, video_name, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as MessageRole,
    content: row.content as string,
    sources: (row.sources ?? []) as unknown[],
    toolResults: (row.tool_results ?? []) as unknown[],
    usage: row.usage ?? null,
    videoFile: (row.video_file as string | null) ?? null,
    videoName: (row.video_name as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function deleteConversation(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("conversations").delete().eq("id", id).select("id");
  return (data ?? []).length > 0;
}

export async function recentContext(
  conversationId: string,
  turns = 6,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const messages = await loadMessages(conversationId);
  return messages
    .filter((m) => m.role !== "observation")
    .slice(-turns * 2)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}
