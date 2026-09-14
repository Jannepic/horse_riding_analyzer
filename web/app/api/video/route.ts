/** Video analysis: the file goes to the vision model in memory, the observations into the conversation, the clip into the local folder. */

import { appendMessage, ensureConversation } from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/server";
import { analyseVideo } from "@/lib/video/analyse";
import { describeObservations } from "@/lib/video/describe";
import { checkSize, checkType, resolveMimeType } from "@/lib/video/limits";
import { isConversationId, videoFileName } from "@/lib/video/paths";
import { isLanguage } from "@/lib/i18n";
import { saveVideo } from "@/lib/video/store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return Response.json({ error: "Zum Analysieren musst du angemeldet sein." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (error) {
    console.error("[api/video] formData failed:", error);
    const declared = req.headers.get("content-length");
    const mb = declared ? (Number(declared) / 1048576).toFixed(1) : "?";
    return Response.json(
      {
        error:
          `Der Upload kam unvollständig an (${mb} MB angekündigt). Wahrscheinlich ` +
          `begrenzt etwas auf dem Weg die Request-Grösse. Ein kürzerer Clip hilft sofort.`,
      },
      { status: 413 },
    );
  }

  const file = form.get("video");
  if (!(file instanceof File)) {
    return Response.json({ error: "Keine Videodatei übermittelt." }, { status: 400 });
  }

  const claimed = form.get("mimeType");
  const reported = typeof claimed === "string" && claimed ? claimed : file.type;
  const { mimeType } = resolveMimeType(file.name, reported);

  for (const check of [checkType(reported, file.name), checkSize(file.size)]) {
    if (!check.ok) return Response.json({ error: check.reason }, { status: 400 });
  }

  const focusValue = form.get("focus");
  const focus = typeof focusValue === "string" && focusValue.trim() ? focusValue.trim() : undefined;

  const languageValue = form.get("language");
  const language = isLanguage(languageValue) ? languageValue : "de";

  const conversationValue = form.get("conversationId");
  const conversationId =
    typeof conversationValue === "string" && isConversationId(conversationValue)
      ? conversationValue
      : null;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const analysis = await analyseVideo(bytes, mimeType, focus, language);

    let videoFile: string | null = null;
    if (conversationId) {
      try {
        await ensureConversation(conversationId);
        const messageId = crypto.randomUUID();
        videoFile = videoFileName(messageId, mimeType);

        await saveVideo(conversationId, videoFile, bytes);
        await appendMessage(conversationId, {
          id: messageId,
          role: "observation",
          content: describeObservations(analysis),

          toolResults: [{ name: "analyse_video", result: analysis }],
          videoFile,
          videoName: file.name,
        });
      } catch (error) {
        console.error("[api/video] storing the observation failed:", error);
        videoFile = null;
      }
    }

    return Response.json({ analysis, videoFile, videoName: file.name });
  } catch (error) {
    console.error("[api/video] analysis failed:", error);

    const detail = error instanceof Error ? error.message.slice(0, 300) : "";
    return Response.json(
      { error: detail ? `Die Videoanalyse ist fehlgeschlagen: ${detail}` : "Die Videoanalyse ist fehlgeschlagen." },
      { status: 502 },
    );
  }
}
