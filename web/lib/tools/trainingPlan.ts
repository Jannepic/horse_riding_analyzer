/** Tool: analysis of recorded training sessions. */

import { tool } from "langchain";
import { z } from "zod";
import { analyseLoad } from "./trainingLoad.ts";

export const trainingPlanTool = tool(
  ({ sessions, today, targetDate }) =>
    JSON.stringify(analyseLoad(sessions, { today, targetDate })),
  {
    name: "training_load",
    description:
      "Analyses recorded training sessions: sessions per week, total load, longest " +
      "run without a rest day, load compared with the previous week, and days until " +
      "a target competition. Use this tool as soon as concrete training data or dates " +
      "are mentioned. It calculates instead of estimating.",
    schema: z.object({
      sessions: z
        .array(
          z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format JJJJ-MM-TT"),
            durationMin: z.number().int().positive().max(600),
            intensity: z.number().int().min(1).max(5)
              .describe("1 = locker, 5 = maximal"),
            focus: z.string().optional().describe('z.B. "Galopparbeit"'),
          }),
        )
        .min(1),
      today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe("Bezugsdatum; ohne Angabe die letzte erfasste Einheit"),
      targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe("Datum der Zielprüfung"),
    }),
  },
);
