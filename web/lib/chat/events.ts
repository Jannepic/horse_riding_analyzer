/** The event format between route handler and browser. */

export type ChatEvent =
  | { type: "token"; value: string }
  | { type: "tool"; name: string }
  | { type: "toolResult"; name: string; result: unknown }
  | { type: "usage"; usage: Usage }
  | { type: "sources"; value: SourceRef[] }
  | { type: "terms"; german: string[]; english: string[] }
  | { type: "warning"; value: string }
  | { type: "error"; value: string };

export type Usage = {
  inputTokens: number;
  outputTokens: number;

  reasoningTokens: number;
  costUsd: number;

  calls: number;
};

export type SourceRef = {
  citation: string;
  page?: number;
  source?: string;
  foundBy: string[];
  excerpt: string;
};

export function encodeEvent(event: ChatEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function createEventParser() {
  let buffer = "";
  return function parse(chunk: string): ChatEvent[] {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    const events: ChatEvent[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line) as ChatEvent);
      } catch {
      }
    }
    return events;
  };
}
