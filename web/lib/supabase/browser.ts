/** Supabase client for client components, using the publishable key. */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase-Umgebungsvariablen fehlen — siehe web/.env.local");
  }
  return createBrowserClient(url, key);
}
