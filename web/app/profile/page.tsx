/** Rider profile and horse management. */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/browser";
import { HorseForm, type Horse } from "@/components/HorseForm";
import { LEVELS } from "@/lib/tools/levels";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("A");
  const [goals, setGoals] = useState("");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [editing, setEditing] = useState<Horse | "new" | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { router.push("/login"); return; }
    setEmail(auth.user.email ?? null);

    const { data: profile } = await supabase
      .from("profiles").select("name, level, goals").eq("id", auth.user.id).maybeSingle();
    if (profile) {
      setName(profile.name ?? "");
      setLevel(profile.level ?? "A");
      setGoals(profile.goals ?? "");
    }

    const { data: rows, error: horseError } = await supabase
      .from("horses").select("*").order("created_at", { ascending: true });
    if (horseError) setError(horseError.message);
    else setHorses((rows ?? []) as Horse[]);

    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { error: dbError } = await supabase
      .from("profiles")
      .upsert({ id: auth.user.id, name: name.trim(), level, goals: goals.trim() });
    if (dbError) setError(dbError.message);
    else setStatus("Profil gespeichert.");
  }

  async function removeHorse(id: string) {
    const supabase = createClient();
    const { error: dbError } = await supabase.from("horses").delete().eq("id", id);
    if (dbError) setError(dbError.message);
    else void load();
  }

  const field = "rounded-lg border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-accent";

  if (loading) {
    return (
      <>
        <Nav />
        <main className="p-8 text-sm text-muted">lädt…</main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-7 px-5 py-7">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Profil</h1>
          <p className="mt-1 text-[14px] text-muted">{email}</p>
        </div>

      <section>
        <h2 className="mb-2 font-medium">Reiterin</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-3 rounded border
                                                border-gray-200 p-4 dark:border-gray-800">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)}
                     maxLength={80} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Eigene Klasse
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={field}>
                {LEVELS.map((l) => <option key={l} value={l}>Klasse {l}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Ziele
            <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2}
                      maxLength={500} placeholder="z.B. Klasse M bis nächsten Sommer"
                      className={field} />
          </label>
          <button type="submit" className="self-start rounded-lg bg-accent px-4 py-2 text-[14px] font-medium text-white">
            Speichern
          </button>
          {status && <p className="text-sm text-muted">{status}</p>}
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Pferde ({horses.length})</h2>
          {editing !== "new" && (
            <button onClick={() => setEditing("new")} className="text-sm underline">
              Pferd hinzufügen
            </button>
          )}
        </div>

        {editing === "new" && (
          <HorseForm onSaved={() => { setEditing(null); void load(); }}
                     onCancel={() => setEditing(null)} />
        )}

        {horses.length === 0 && editing !== "new" && (
          <p className="text-sm text-muted">
            Noch kein Pferd angelegt. Der Assistent nutzt Alter, Ausbildungsstand und
            bekannte Probleme, um Lektionen einzuordnen.
          </p>
        )}

        {horses.map((horse) =>
          editing !== "new" && typeof editing === "object" && editing?.id === horse.id ? (
            <HorseForm key={horse.id} horse={horse}
                       onSaved={() => { setEditing(null); void load(); }}
                       onCancel={() => setEditing(null)} />
          ) : (
            <article key={horse.id} className="rounded border border-gray-200 p-4
                                               dark:border-gray-800">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {horse.name}
                  <span className="ml-2 text-sm font-normal text-muted">
                    Klasse {horse.training_level ?? "?"}
                    {horse.age != null && ` · ${horse.age} Jahre`}
                    {horse.breed && ` · ${horse.breed}`}
                  </span>
                </span>
                <span className="flex gap-3 text-sm">
                  <button onClick={() => setEditing(horse)} className="underline">bearbeiten</button>
                  <button onClick={() => void removeHorse(horse.id)} className="underline">
                    löschen
                  </button>
                </span>
              </div>
              {horse.known_issues.length > 0 && (
                <p className="mt-1 text-sm text-muted">
                  Bekannte Probleme: {horse.known_issues.join(", ")}
                </p>
              )}
            </article>
          ),
        )}
      </section>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      </main>
    </>
  );
}
