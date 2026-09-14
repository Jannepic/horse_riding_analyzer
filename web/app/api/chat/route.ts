/** HTTP adapter for the chat: validates the body, persists the turn, returns the NDJSON event stream. */

import { ChatRequest } from "@/lib/chat/schema";
import { streamAgentAnswer } from "@/lib/chat/agentStream";
import { describeHorse, loadHorse } from "@/lib/chat/horseContext";
import {
  appendMessage, ensureConversation, recentContext, setTitleIfEmpty, titleFrom,
} from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body is not valid JSON." }, { status: 400 });
  }

  const parsed = ChatRequest.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }
  const { message, conversationId, horseId, observations, language } = parsed.data;

  let horsePreamble: string | undefined;
  if (horseId) {
    const horse = await loadHorse(horseId);
    if (horse) horsePreamble = describeHorse(horse);
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const persist = Boolean(auth.user && conversationId);

  let prior: { role: "user" | "assistant"; content: string }[] = [];
  if (persist && conversationId) {
    try {
      await ensureConversation(conversationId, {
        horseId: horseId ?? null,
        title: titleFrom(message),
      });
      prior = await recentContext(conversationId);
      await appendMessage(conversationId, { role: "user", content: message });
      await setTitleIfEmpty(conversationId, titleFrom(message));
    } catch (error) {
      console.error("[api/chat] history unavailable:", error);
      prior = [];
    }
  }

  return new Response(
    streamAgentAnswer(
      message,
      horsePreamble,
      observations,
      prior,
      language,
      persist && conversationId
        ? async (result) => {
            if (!result.answer.trim()) return;
            await appendMessage(conversationId, {
              role: "assistant",
              content: result.answer,
              sources: result.sources,
              toolResults: result.toolResults,
              usage: result.usage,
            });
          }
        : undefined,
    ),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
