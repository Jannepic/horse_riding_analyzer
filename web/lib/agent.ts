/** Builds the agent with its four tools and the language rule; memory comes from the database. */

import { createAgent } from "langchain";
import { model } from "./llm.ts";
import { AGENT_PROMPT } from "./chat/prompt.ts";
import { languageInstruction, type Language } from "./i18n.ts";
import { createRetrieveDoctrineTool } from "./tools/retrieveDoctrine.ts";
import { scoreTestSheetTool } from "./tools/scoreTestSheet.ts";
import { horseProfileMatchTool } from "./tools/horseProfileMatch.ts";
import { trainingPlanTool } from "./tools/trainingPlan.ts";
import type { FusedHit } from "./retrieval/types.ts";

export function createDressageAgent(collector: FusedHit[], language: Language = "de") {
  return createAgent({
    model,
    tools: [
      createRetrieveDoctrineTool(collector),
      scoreTestSheetTool,
      horseProfileMatchTool,
      trainingPlanTool,
    ],
    systemPrompt: AGENT_PROMPT + languageInstruction(language),
  });
}
