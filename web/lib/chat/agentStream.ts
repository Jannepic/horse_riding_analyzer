/** Runs the agent and turns its output into NDJSON events. */

import { createDressageAgent } from "../agent.ts";
import { citationOf, type FusedHit } from "../retrieval/types.ts";
import { inspectInput } from "../security/injectionGuard.ts";
import { encodeEvent, type SourceRef, type Usage } from "./events.ts";
import type { Language } from "../i18n.ts";

const AGENT_MODEL_NODE = "model_request";

export type TurnResult = {
  answer: string;
  sources: SourceRef[];
  toolResults: { name: string; result: unknown }[];
  usage: Usage | null;
};

export function streamAgentAnswer(
  question: string,
  horsePreamble?: string,

  observations?: string,

  prior: { role: "user" | "assistant"; content: string }[] = [],

  language: Language = "de",

  onFinish?: (result: TurnResult) => Promise<void> | void,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const collected: FusedHit[] = [];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: Parameters<typeof encodeEvent>[0]) =>
        controller.enqueue(encoder.encode(encodeEvent(e)));

      try {
        const guard = inspectInput(question);
        if (guard.suspicious) {
          console.warn("[chat] suspicious input:", guard.findings);
          emit({ type: "warning", value: `Auffällige Eingabe: ${guard.findings.join("; ")}` });
        }

        const agent = createDressageAgent(collected, language);

        const content = [horsePreamble, observations, `FRAGE:\n${question}`]
          .filter(Boolean)
          .join("\n\n");
        const stream = await agent.stream(
          { messages: [...prior, { role: "user", content }] },
          { streamMode: "messages" },
        );

        const seenTools = new Set<string>();

        let answer = "";
        const toolResults: { name: string; result: unknown }[] = [];

        const usage: Usage = {
          inputTokens: 0, outputTokens: 0, reasoningTokens: 0, costUsd: 0, calls: 0,
        };

        for await (const part of stream) {
          const [message, meta] = part as [
            { text?: string; tool_calls?: { name?: string }[]; getType?: () => string },
            { langgraph_node?: string } | undefined,
          ];

          for (const call of message?.tool_calls ?? []) {
            if (call.name && !seenTools.has(call.name)) {
              seenTools.add(call.name);
              emit({ type: "tool", name: call.name });
            }
          }

          const m = message as unknown as {
            usage_metadata?: {
              input_tokens?: number;
              output_tokens?: number;
              output_token_details?: { reasoning?: number };
            };
            response_metadata?: { usage?: { cost?: number } };
          };
          if (m.usage_metadata) {
            usage.calls += 1;
            usage.inputTokens += m.usage_metadata.input_tokens ?? 0;
            usage.outputTokens += m.usage_metadata.output_tokens ?? 0;
            usage.reasoningTokens += m.usage_metadata.output_token_details?.reasoning ?? 0;
            usage.costUsd += m.response_metadata?.usage?.cost ?? 0;
          }

          if (message?.getType?.() === "tool") {
            const toolMessage = message as unknown as { name?: string; content?: unknown };
            if (toolMessage.name) {
              let result: unknown = toolMessage.content;
              if (typeof result === "string") {
                try {
                  result = JSON.parse(result);
                } catch {
                }
              }
              toolResults.push({ name: toolMessage.name, result });
              emit({ type: "toolResult", name: toolMessage.name, result });
            }
          }

          if (message?.getType?.() !== "ai") continue;
          if (meta?.langgraph_node !== AGENT_MODEL_NODE) continue;
          if (message.text) {
            answer += message.text;
            emit({ type: "token", value: message.text });
          }
        }

        const sources: SourceRef[] = [];
        if (collected.length) {
          const seen = new Set<number>();
          for (const hit of collected) {
            if (seen.has(hit.id)) continue;
            seen.add(hit.id);
            sources.push({
              citation: citationOf(hit),
              page: hit.metadata.page,
              source: hit.metadata.source,
              foundBy: hit.foundBy.map((f) => `${f.list}#${f.rank}`),
              excerpt: hit.content.replace(/\s+/g, " ").slice(0, 220),
            });
          }
          emit({ type: "sources", value: sources });
        }

        if (usage.calls > 0) emit({ type: "usage", usage });

        try {
          await onFinish?.({
            answer,
            sources,
            toolResults,
            usage: usage.calls > 0 ? usage : null,
          });
        } catch (error) {
          console.error("[chat] persisting the turn failed:", error);
        }

        controller.close();
      } catch (error) {
        console.error("[chat] agent run failed:", error);
        emit({ type: "error", value: "Die Anfrage konnte nicht bearbeitet werden." });
        controller.close();
      }
    },
  });
}
