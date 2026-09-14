/** The model instances via OpenRouter: one for the application, one for the evaluation. */

import { ChatOpenAI } from "@langchain/openai";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OpenRouterAPIKey not available in web/.env.local");

export const MODEL_ID = "google/gemini-3.7-flash";

export function createModel(options: { model?: string; maxTokens?: number; temperature?: number } = {}) {
  return new ChatOpenAI({
    model: options.model ?? MODEL_ID,
    apiKey,
    maxTokens: options.maxTokens ?? 2000,
    temperature: options.temperature ?? 0.3,
    configuration: { baseURL: "https://openrouter.ai/api/v1" },
  });
}

export const model = new ChatOpenAI({
  model: MODEL_ID,
  apiKey,
  maxTokens: 2000,
  temperature: 0.3,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
