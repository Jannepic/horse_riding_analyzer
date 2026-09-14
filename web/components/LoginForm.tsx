/** Sign-in by email or Google, with the error message from the OAuth callback. */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState<null | "password" | "google">(null);
  const [message, setMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(params.get("error"));

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setBusy(null);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Bestätigungsmail verschickt. Nach der Bestätigung hier anmelden.");
      setBusy(null);
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  async function withGoogle() {
    setBusy("google");
    setError(null);

    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(null);
    }
  }

  const field =
    "rounded-lg border border-line bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-accent";

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signin" ? "Anmelden" : "Konto anlegen"}
          </h1>
          <p className="mt-1 text-[14px] text-muted">
            Für Reiter- und Pferdeprofile. Der Chat funktioniert auch ohne Konto.
          </p>
        </div>

        <button
          onClick={() => void withGoogle()}
          disabled={busy !== null}
          className="flex items-center justify-center gap-2.5 rounded-lg border border-line
                     bg-surface px-4 py-2.5 text-[15px] transition-colors
                     hover:border-accent disabled:opacity-40"
        >
          <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          {busy === "google" ? "leitet weiter…" : "Mit Google anmelden"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          oder
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={withPassword} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            E-Mail
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   required autoComplete="email" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Passwort
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   required minLength={8}
                   autoComplete={mode === "signin" ? "current-password" : "new-password"}
                   className={field} />
          </label>
          <button type="submit" disabled={busy !== null}
                  className="rounded-lg bg-accent px-4 py-2.5 text-[15px] font-medium text-white
                             disabled:opacity-40">
            {busy === "password" ? "…" : mode === "signin" ? "Anmelden" : "Konto anlegen"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
          className="text-[13px] text-muted underline hover:text-accent"
        >
          {mode === "signin" ? "Noch kein Konto? Registrieren" : "Schon registriert? Anmelden"}
        </button>

        {message && (
          <p className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[14px]">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-[14px]
                        text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
      </main>
    </>
  );
}
