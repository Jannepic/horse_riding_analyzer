/** Movement catalogue and level mapping, with a source reference per rule. */

export const LEVELS = ["E", "A", "L", "M", "S"] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_NAMES: Record<Level, string> = {
  E: "Eingangsklasse",
  A: "Anfänger",
  L: "Leicht",
  M: "Mittel",
  S: "Schwer",
};

export const COLLECTION_BY_LEVEL: Record<Level, "keine" | "beginnend" | "voll"> = {
  E: "keine",
  A: "keine",
  L: "beginnend",
  M: "voll",
  S: "voll",
};

export type Requirement = "basic" | "collection_starting" | "collection_full";

type Lesson = {
  de: string;

  fei?: string;
  page?: number;
  requires: Requirement;

  basis: string;
};

export const LESSONS: Lesson[] = [

  { de: "Halten", fei: "THE HALT", page: 13, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Zügel aus der Hand kauen lassen", fei: "LET THE HORSE STRETCH ON A LONG REIN", page: 13,
    requires: "basic", basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Hingeben und Wiederaufnehmen der Zügel", fei: "GIVE AND RETAKE THE REINS", page: 14,
    requires: "basic", basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Rückwärtsrichten", fei: "REIN-BACK", page: 14, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Einfacher Galoppwechsel", fei: "SIMPLE CHANGE OF LEG", page: 15, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Handwechsel", fei: "THE CHANGES OF DIRECTIONS", page: 15, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Kurzkehrtwendung", fei: "TURN ON HAUNCHES", page: 15, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },
  { de: "Schenkelweichen", fei: "LEG-YIELDING", page: 17, requires: "basic",
    basis: "Judging Manual: BASIC DRESSAGE EXERCISES" },

  { de: "Schulterherein", fei: "SHOULDER-IN", page: 18, requires: "collection_starting",
    basis: "Judging Manual: ADVANCED DRESSAGE EXERCISES; Seitengänge setzen Versammlung voraus" },
  { de: "Travers", fei: "TRAVERS", page: 18, requires: "collection_starting",
    basis: "Judging Manual: ADVANCED DRESSAGE EXERCISES" },
  { de: "Renvers", fei: "RENVERS", page: 19, requires: "collection_starting",
    basis: "Judging Manual: ADVANCED DRESSAGE EXERCISES" },
  { de: "Traversale", fei: "HALF PASS", page: 19, requires: "collection_full",
    basis: "Judging Manual: ADVANCED; Traversale verlangt entwickelte Versammlung" },
  { de: "Piaffe", fei: "THE PIAFFE", page: 22, requires: "collection_full",
    basis: "Judging Manual: ADVANCED; 'very collected'" },
  { de: "Passage", fei: "THE PASSAGE", page: 23, requires: "collection_full",
    basis: "Judging Manual: ADVANCED; 'measured, very collected'" },
  { de: "Galopppirouette", fei: "CANTER PIROUETTE", page: 37, requires: "collection_full",
    basis: "Judging Manual: 'must be executed in collection'" },
];

export function minimumLevel(requires: Requirement): Level {
  if (requires === "basic") return "E";
  if (requires === "collection_starting") return "L";
  return "M";
}

export function findLesson(name: string): Lesson | undefined {
  const needle = name.toLowerCase().trim();
  return (
    LESSONS.find((l) => l.de.toLowerCase() === needle || l.fei?.toLowerCase() === needle) ??
    LESSONS.find(
      (l) => l.de.toLowerCase().includes(needle) || needle.includes(l.de.toLowerCase()),
    )
  );
}

export function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}
