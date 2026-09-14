/** Header with sign-in state and the current language. */

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { dict, isLanguage, type Language } from "@/lib/i18n";

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [known, setKnown] = useState(false);

  const [language, setLanguage] = useState<Language>("de");
  const t = dict(language);

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem("reitbahn.language");
      if (isLanguage(stored)) setLanguage(stored);
    };
    read();
    window.addEventListener("reitbahn:language", read);
    return () => window.removeEventListener("reitbahn:language", read);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setKnown(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
      setKnown(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-[17px] font-semibold tracking-tight">Reitbahn</span>
          <span className="hidden text-xs text-muted sm:inline">
            {t.tagline}
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {!known ? null : email ? (
            <>
              <Link
                href="/profile"
                className={`hover:text-accent ${
                  pathname === "/profile" ? "text-accent" : "text-muted"
                }`}
              >
                {t.profile}
              </Link>
              <button onClick={() => void signOut()} className="text-muted hover:text-accent">
                {t.signOut}
              </button>
            </>
          ) : (
            <Link href="/login" className="text-muted hover:text-accent">
              anmelden
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
