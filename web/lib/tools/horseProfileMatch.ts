/** Tool: does a movement suit this horse's training level and age? */

import { tool } from "langchain";
import { z } from "zod";
import {
  COLLECTION_BY_LEVEL, findLesson, LESSONS, LEVELS, LEVEL_NAMES,
  levelRank, minimumLevel, type Level,
} from "./levels.ts";

const YOUNG_HORSE_MAX_AGE = 6;

export type MatchResult = {
  suitable: boolean;
  lesson: string;
  reason: string;
  requiredLevel: Level;
  horseLevel: Level;
  citation?: string;
  preparatory: string[];
  cautions: string[];
};

export function matchHorseToLesson(input: {
  lesson: string;
  trainingLevel: Level;
  age?: number;
  knownIssues?: string[];
}): MatchResult {
  const { lesson: name, trainingLevel, age, knownIssues = [] } = input;

  const lesson = findLesson(name);
  if (!lesson) {
    return {
      suitable: false,
      lesson: name,
      reason:
        `"${name}" steht nicht im Lektionskatalog meiner Quellen. Ich kann dazu ` +
        `keine Einschätzung geben, ohne zu raten.`,
      requiredLevel: "E",
      horseLevel: trainingLevel,
      preparatory: [],
      cautions: [],
    };
  }

  const required = minimumLevel(lesson.requires);
  const ready = levelRank(trainingLevel) >= levelRank(required);

  const cautions: string[] = [];
  if (age !== undefined && age <= YOUNG_HORSE_MAX_AGE && lesson.requires !== "basic") {
    cautions.push(
      `Das Pferd ist ${age} Jahre alt. Prüfungen für junge Pferde verlangen ` +
        `"lengthening of strides" statt versammelter Lektionen (Judging Manual, S. 8) — ` +
        `versammelnde Arbeit in kurzen Sequenzen und nicht als Schwerpunkt.`,
    );
  }
  for (const issue of knownIssues) {
    cautions.push(`Bekanntes Problem im Profil: "${issue}" — vor dieser Lektion adressieren.`);
  }

  const preparatory = ready
    ? []
    : LESSONS.filter((l) => levelRank(minimumLevel(l.requires)) < levelRank(required))
        .map((l) => l.de)
        .slice(0, 5);

  const collection = COLLECTION_BY_LEVEL[trainingLevel];
  const reason = ready
    ? `${lesson.de} passt zu Klasse ${trainingLevel} (${LEVEL_NAMES[trainingLevel]}). ` +
      `Auf dieser Stufe wird ${collection === "voll" ? "volle" : collection} Versammlung erwartet.`
    : `${lesson.de} setzt mindestens Klasse ${required} voraus, das Pferd steht auf ` +
      `Klasse ${trainingLevel}. Auf dieser Stufe ist die Versammlung "${collection}". ` +
      `Grundlage: ${lesson.basis}.`;

  return {
    suitable: ready,
    lesson: lesson.de,
    reason,
    requiredLevel: required,
    horseLevel: trainingLevel,
    citation: lesson.fei ? `${lesson.fei} (S. ${lesson.page})` : undefined,
    preparatory,
    cautions,
  };
}

export const horseProfileMatchTool = tool(
  (input) => JSON.stringify(matchHorseToLesson(input)),
  {
    name: "horse_profile_match",
    description:
      "Checks whether a given movement suits a horse's training level and age, and " +
      "names preparatory movements and warnings. Use this tool whenever you are " +
      "asked whether a horse is ready for a movement or what to train next. Decides " +
      "from a rule table derived from the FEI Judging Manual and the German FN " +
      "leaflet — never assess this yourself.",
    schema: z.object({
      lesson: z.string().describe('Name der Lektion, z.B. "Traversale" oder "Schulterherein"'),
      trainingLevel: z.enum(LEVELS).describe("Ausbildungsstand des Pferdes: E, A, L, M oder S"),
      age: z.number().int().min(0).max(40).optional().describe("Alter in Jahren"),
      knownIssues: z.array(z.string()).optional()
        .describe('Bekannte Probleme, z.B. ["stellt sich links schwer"]'),
    }),
  },
);
