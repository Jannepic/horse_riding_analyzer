/** Form for creating and editing a horse. */

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { LEVELS } from "@/lib/tools/levels";

export type Horse = {
  id: string;
  name: string;
  age: number | null;
  breed: string | null;
  training_level: string | null;
  temperament: Record<string, unknown>;
  known_issues: string[];
};

export function HorseForm({ horse, onSaved, onCancel }: {
  horse?: Horse;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(horse?.name ?? "");
  const [age, setAge] = useState(horse?.age?.toString() ?? "");
  const [breed, setBreed] = useState(horse?.breed ?? "");
  const [level, setLevel] = useState(horse?.training_level ?? "A");
  const [issues, setIssues] = useState((horse?.known_issues ?? []).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Nicht angemeldet."); setBusy(false); return; }

    const row = {
      owner: auth.user.id,
      name: name.trim(),
      age: age ? Number(age) : null,
      breed: breed.trim() || null,
      training_level: level,
      known_issues: issues.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const { error: dbError } = horse
      ? await supabase.from("horses").update(row).eq("id", horse.id)
      : await supabase.from("horses").insert(row);

    if (dbError) setError(dbError.message);
    else onSaved();
    setBusy(false);
  }

  const field = "rounded-lg border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-accent";

  return (
    <form onSubmit={save} className="flex flex-col gap-3 rounded border border-gray-200 p-4
                                     dark:border-gray-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required
                 maxLength={60} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Alter
          <input type="number" min={0} max={40} value={age}
                 onChange={(e) => setAge(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Rasse
          <input value={breed} onChange={(e) => setBreed(e.target.value)}
                 maxLength={60} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Ausbildungsstand
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={field}>
            {LEVELS.map((l) => <option key={l} value={l}>Klasse {l}</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Bekannte Probleme (mit Komma getrennt)
        <input value={issues} onChange={(e) => setIssues(e.target.value)}
               placeholder="stellt sich links schwer, eilt im Galopp" className={field} />
      </label>

      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-[14px] font-medium text-white disabled:opacity-40">
          {busy ? "…" : horse ? "Speichern" : "Pferd anlegen"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
                  className="rounded-lg border border-line px-4 py-2 text-[14px]">
            Abbrechen
          </button>
        )}
      </div>
    </form>
  );
}
