/** Zod schema for the chat request. */

import { z } from "zod";
import { LANGUAGES } from "../i18n.ts";

export const ChatRequest = z.object({
  message: z.string().trim().min(1).max(2000),

  conversationId: z.string().uuid().optional(),

  horseId: z.string().uuid().optional(),

  observations: z.string().max(6000).optional(),

  language: z.enum(LANGUAGES).default("de"),
});

export type ChatRequest = z.infer<typeof ChatRequest>;
