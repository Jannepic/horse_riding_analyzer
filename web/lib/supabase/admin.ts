/** Client with the secret key. Bypasses RLS — only for ingest and reading the corpus. */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing — see web/.env.local");
if (!secret) throw new Error("SUPABASE_SECRET_KEY is missing — see web/.env.local");

export const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
