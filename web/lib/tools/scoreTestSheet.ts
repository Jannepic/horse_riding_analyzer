/** Tool: result of a dressage test from the individual marks. */

import { tool } from "langchain";
import { z } from "zod";
import { MARK_STEP, MAX_MARK, MIN_MARK, scoreTestSheet } from "./scoring.ts";

const MovementSchema = z.object({
  number: z.number().int().positive().optional()
    .describe("Nummer der Lektion auf dem Richterbogen"),
  name: z.string().optional()
    .describe('Name der Lektion, z.B. "Traversale rechts"'),
  mark: z
    .number()
    .min(MIN_MARK)
    .max(MAX_MARK)
    .refine((m) => Math.abs(m / MARK_STEP - Math.round(m / MARK_STEP)) < 1e-9, {
      message: "Nur ganze und halbe Noten sind zulässig (FEI Art. 423.4).",
    })
    .describe("Note von 0 bis 10, halbe Noten erlaubt"),
  coefficient: z.number().int().min(1).max(3).default(1)
    .describe("Koeffizient der Lektion, meist 1 oder 2"),
});

export const scoreTestSheetTool = tool(
  ({ movements }) => {
    const result = scoreTestSheet(movements);
    return JSON.stringify(result);
  },
  {
    name: "score_test_sheet",
    description:
      "Computes the result of a dressage test from the individual marks: total " +
      "points, percentage and the movements that lost the most points. Use this " +
      "tool as soon as concrete marks are mentioned or a percentage is asked for. " +
      "Calculates per FEI Art. 423 and 425 — never estimate the result yourself.",
    schema: z.object({
      movements: z.array(MovementSchema).min(1)
        .describe("Alle bewerteten Lektionen der Aufgabe"),
    }),
  },
);
