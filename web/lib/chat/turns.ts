/** Turns the database's flat message list into turns for display. */

import type { SourceRef, Usage } from "./events.ts";
import type { VideoAnalysis } from "../video/types.ts";

export type StoredLike = {
  role: "user" | "assistant" | "observation";
  content: string;
  sources: unknown[];
  toolResults: unknown[];
  usage: unknown | null;
  videoFile: string | null;
  videoName: string | null;
};

export type RestoredTurn = {
  question: string;

  observations?: VideoAnalysis;

  videoFile?: string | null;
  videoName?: string | null;
  answer: string;
  tools: string[];
  toolResults: { name: string; result: unknown }[];
  sources: SourceRef[];
  usage?: Usage;
  done: boolean;
};

type NamedResult = { name: string; result: unknown };

function asResults(value: unknown): NamedResult[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is NamedResult =>
      typeof entry === "object" && entry !== null && typeof (entry as NamedResult).name === "string",
  );
}

function analysisOf(message: StoredLike): VideoAnalysis | undefined {
  const entry = asResults(message.toolResults).find((r) => r.name === "analyse_video");
  const result = entry?.result;
  if (!result || typeof result !== "object") return undefined;
  const candidate = result as Partial<VideoAnalysis>;
  if (!Array.isArray(candidate.observations)) return undefined;
  return result as VideoAnalysis;
}

function emptyTurn(question: string): RestoredTurn {
  return {
    question, answer: "", tools: [], toolResults: [], sources: [], done: true,
  };
}

export function turnsFromMessages(messages: StoredLike[]): RestoredTurn[] {
  const turns: RestoredTurn[] = [];
  let pending: StoredLike | null = null;

  const attachPending = (turn: RestoredTurn) => {
    if (!pending) return;
    turn.observations = analysisOf(pending);
    turn.videoFile = pending.videoFile;
    turn.videoName = pending.videoName;
    pending = null;
  };

  for (const message of messages) {
    if (message.role === "observation") {
      if (pending) {
        const orphan = emptyTurn("");
        attachPending(orphan);
        turns.push(orphan);
      }
      pending = message;
      continue;
    }

    if (message.role === "user") {
      const turn = emptyTurn(message.content);
      turn.done = true;
      attachPending(turn);
      turns.push(turn);
      continue;
    }

    const target = turns.at(-1);
    if (!target || target.answer) {
      const turn = emptyTurn("");
      attachPending(turn);
      turn.answer = message.content;
      turn.toolResults = asResults(message.toolResults);
      turn.tools = turn.toolResults.map((r) => r.name);
      turn.sources = (message.sources ?? []) as SourceRef[];
      if (message.usage) turn.usage = message.usage as Usage;
      turns.push(turn);
      continue;
    }

    target.answer = message.content;
    target.toolResults = asResults(message.toolResults);
    target.tools = target.toolResults.map((r) => r.name);
    target.sources = (message.sources ?? []) as SourceRef[];
    if (message.usage) target.usage = message.usage as Usage;
  }

  if (pending) {
    const orphan = emptyTurn("");
    attachPending(orphan);
    turns.push(orphan);
  }

  return turns;
}
