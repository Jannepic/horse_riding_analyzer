/** Image analysis via OpenRouter: describes what is visible and names deviations. Awards no marks. */

import { parseAnalysis, type VideoAnalysis } from "./types.ts";
import type { Language } from "../i18n.ts";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error("OPENROUTER_API_KEY fehlt — siehe web/.env.local");

export const VIDEO_MODEL = "google/gemini-3.7-flash";

const SYSTEM = `You describe what can be SEEN in a riding video. You award no marks.

YOUR JOB IS NOT AN INVENTORY.
Work like an attentive trainer at the arena fence: look ACTIVELY for deviations. A
list in which everything is fine is almost always a poor observation — look again
before you submit it. Conversely, name what is genuinely correct too, but without
praise.

WHAT YOU ACTIVELY CHECK (as far as visible in the image)
- Rhythm: regularity, four-beat walk, three-beat canter, pacing, hurrying,
  disunited canter, hesitation in transitions.
- Rider's seat: heel raised or lower than the toe, lower leg slipped forward or
  back, upper body in front of or behind the vertical, shoulder forward, gaze
  down, seat off-centre, hip swinging or locked.
- Hand and rein: hand height, hand position, tilted fist, uneven rein length,
  hand pulling backwards, contact changing or lost, reins slack.
- Head and neck carriage: nose line behind the vertical, poll not the highest
  point, neck rolled up, nose high, mouth open, tongue visible.
- Track: leaving the track, cutting corners, circle not round, crookedness
  visible in the line ridden.

RULES
- No marks, no percentages, no judgements such as "good", "bad", "clean" or
  "harmonious". Describe WHAT you see instead: not "poor seat", but "heel raised,
  heel higher than the toe".
- Every observation gets "deviation": true when it describes a departure from the
  norm, false when it is a finding without objection.
- Every observation gets a confidence: "hoch", "mittel" or "niedrig".
- Describe a deviation precisely enough for the rider to find it again: WHEN in
  the clip (e.g. "second pass down the long side"), on WHICH rein, and HOW
  STRONGLY or HOW OFTEN.
- What you cannot recognise with confidence belongs under "notAssessable" — not
  in the observations with low confidence.
- NOT reliably recognisable from a video are: collection, impulsion, throughness,
  straightness, suppleness. Those belong under "notAssessable" unless you see
  something very obvious.
- The language rule at the end of this prompt takes precedence over everything
  else.

Answer with JSON in this form and nothing else:
{"gait":"Schritt|Trab|Galopp|Halten|gemischt|unklar",
 "observations":[{"claim":"…","confidence":"hoch|mittel|niedrig","aspect":"…","deviation":true}],
 "notAssessable":["…"]}`;

async function postWithRetry(body: string): Promise<Response> {
  const attempts = 2;
  let lastReason = "";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
    });
    if (res.ok) return res;

    const text = await res.text();
    const isHtml = text.trimStart().startsWith("<");

    if (isHtml || res.status >= 500) {
      lastReason =
        `Die Anfrage hat den Dienst nicht erreicht (HTTP ${res.status}). Bei einem ` +
        `grossen Clip auf einer langsamen Leitung läuft die Übertragung in ein ` +
        `Zeitlimit. Ein kürzerer Ausschnitt hilft zuverlässig.`;
      if (attempt < attempts) continue;
      throw new Error(lastReason);
    }

    throw new Error(`Videoanalyse abgelehnt (${res.status}): ${text.slice(0, 300)}`);
  }

  throw new Error(lastReason || "Videoanalyse fehlgeschlagen.");
}

function languageRule(language: Language): string {
  const target = language === "en" ? "ENGLISH" : "GERMAN";
  return (
    `\n\nLANGUAGE — TAKES PRECEDENCE OVER EVERYTHING ELSE\n` +
    `Write every text field of your answer in ${target}: "claim", "aspect", ` +
    `"gait" and every entry in "notAssessable". This holds even when the rider's ` +
    `question is asked in a different language. The gait values stay as given in ` +
    `the schema when writing German, and are translated when writing English.`
  );
}

export async function analyseVideo(
  video: Uint8Array,
  mimeType: string,
  focus?: string,
  language: Language = "de",
): Promise<VideoAnalysis> {
  const base64 = Buffer.from(video).toString("base64");

  const userText = [
    focus
      ? `Describe what can be seen. Pay particular attention to: ${focus}`
      : "Describe what can be seen.",

    language === "en"
      ? "Write every text field of your answer in ENGLISH: claim, aspect, gait and notAssessable."
      : "Schreibe jedes Textfeld deiner Antwort auf DEUTSCH: claim, aspect, gait und notAssessable.",
  ].join("\n\n");

  const body = JSON.stringify({
    model: VIDEO_MODEL,
    messages: [

      { role: "system", content: SYSTEM + languageRule(language) },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "video_url", video_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 2500,
    temperature: 0.2,
  });

  const res = await postWithRetry(body);

  const payload = (await res.json()) as {
    choices: { message: { content: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };

  const raw = payload.choices[0]?.message?.content ?? "";
  const parsed = parseAnalysis(raw);

  return {
    ...parsed,
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
      costUsd: payload.usage?.cost ?? 0,
    },
  };
}
