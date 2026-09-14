/** Types of the image analysis and the parser for the model's answer. */

export type Confidence = "hoch" | "mittel" | "niedrig";

export type Observation = {
  claim: string;
  confidence: Confidence;

  aspect: string;

  deviation: boolean;
};

export type VideoAnalysis = {
  gait: string;
  observations: Observation[];

  notAssessable: string[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
};

export function parseAnalysis(raw: string): Omit<VideoAnalysis, "usage"> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

  try {
    const data = JSON.parse(slice) as Partial<VideoAnalysis>;
    return {
      gait: typeof data.gait === "string" ? data.gait : "unklar",
      observations: Array.isArray(data.observations)
        ? data.observations
            .filter(
              (o): o is Observation =>
                !!o && typeof o.claim === "string" && typeof o.aspect === "string",
            )

            .map((o) => ({ ...o, deviation: o.deviation === true }))
        : [],
      notAssessable: Array.isArray(data.notAssessable)
        ? data.notAssessable.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return {
      gait: "unklar",
      observations: [],
      notAssessable: ["Die Antwort des Modells war nicht auswertbar."],
    };
  }
}
