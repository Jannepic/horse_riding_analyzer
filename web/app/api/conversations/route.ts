/** Lists the user's own conversations for the sidebar. */

import { listConversations } from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ conversations: [] });

  return Response.json({ conversations: await listConversations() });
}
