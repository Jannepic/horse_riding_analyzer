/** The chat page: turns, sidebar, video attachment, export and language choice. */

"use client";

import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { Markdown } from "@/components/Markdown";
import { Sources } from "@/components/Sources";
import { ToolResult } from "@/components/ToolResult";
import { Thinking } from "@/components/Thinking";
import { VideoPicker } from "@/components/VideoPicker";
import { VideoClip } from "@/components/VideoClip";
import { Sidebar, type Horse } from "@/components/Sidebar";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { dict, isLanguage, type Language } from "@/lib/i18n";
import { describeObservations } from "@/lib/video/describe";
import { requestAnalysis, type PreparedClip } from "@/lib/video/prepare";
import type { VideoAnalysis } from "@/lib/video/types";
import { createEventParser, type SourceRef, type Usage } from "@/lib/chat/events";
import { turnsFromMessages, type StoredLike } from "@/lib/chat/turns";
import type { ConversationSummary } from "@/lib/chat/history";
import { createClient } from "@/lib/supabase/browser";

const TOOL_KEYS = {
  retrieve_doctrine: "toolRetrieve",
  score_test_sheet: "toolScore",
  horse_profile_match: "toolMatch",
  training_load: "toolLoad",
} as const;

type Turn = {
  question: string;

  observations?: VideoAnalysis;

  videoFile?: string | null;
  videoName?: string | null;

  videoPending?: boolean;
  answer: string;
  tools: string[];
  toolResults: { name: string; result: unknown }[];
  sources: SourceRef[];
  usage?: Usage;
  warning?: string;
  error?: string;
  done: boolean;
};

export default function Page() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [horseId, setHorseId] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const [conversationId, setConversationId] = useState(() => crypto.randomUUID());
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const [clip, setClip] = useState<PreparedClip | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("de");
  const t = dict(language);
  const bottom = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("reitbahn.language");
    if (isLanguage(stored)) setLanguage(stored);
  }, []);

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("reitbahn.language", next);

    window.dispatchEvent(new Event("reitbahn:language"));
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setSignedIn(true);
      const { data } = await supabase
        .from("horses").select("id, name, training_level").order("created_at");
      setHorses(data ?? []);
      void refreshConversations();
    })();
  }, []);

  async function refreshConversations() {
    const res = await fetch("/api/conversations");
    if (!res.ok) return;
    const payload = (await res.json()) as { conversations: ConversationSummary[] };
    setConversations(payload.conversations);
  }

  function newChat() {
    setConversationId(crypto.randomUUID());
    setTurns([]);
    setInput("");
  }

  async function openConversation(id: string) {
    if (busy) return;
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const payload = (await res.json()) as { messages: StoredLike[] };
    setConversationId(id);
    setTurns(turnsFromMessages(payload.messages));
    const known = conversations.find((c) => c.id === id);
    if (known?.horseId) setHorseId(known.horseId);
  }

  async function removeConversation(id: string) {
    if (!confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    if (id === conversationId) newChat();
    await refreshConversations();
  }

  useEffect(() => {
    const nearBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight - 220;
    if (nearBottom) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(question: string) {
    const attached = clip;
    const typed = question.trim();
    if ((!typed && !attached) || busy) return;

    const message = typed || t.defaultVideoQuestion(attached?.sourceName ?? "");

    setBusy(true);
    setInput("");
    setClip(null);
    if (box.current) box.current.style.height = "auto";
    const index = turns.length;
    setTurns((t) => [
      ...t,
      { question: message, videoName: attached?.sourceName, answer: "",
        videoPending: Boolean(attached), tools: [], toolResults: [],
        sources: [], done: false },
    ]);

    const patch = (change: Partial<Turn>) =>
      setTurns((t) => t.map((turn, i) => (i === index ? { ...turn, ...change } : turn)));

    let observations: VideoAnalysis | undefined;
    if (attached) {
      try {
        const result = await requestAnalysis(attached, {
          focus: typed || undefined,
          conversationId,
          language,
        });
        observations = result.analysis as VideoAnalysis;
        patch({ observations, videoFile: result.videoFile, videoPending: false });
      } catch (e) {
        patch({
          videoPending: false, done: true,
          error: e instanceof Error ? e.message : t.videoFailed,
        });
        setBusy(false);

        if (signedIn) void refreshConversations();
        return;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          conversationId,
          horseId: horseId || undefined,
          language,
          observations: observations ? describeObservations(observations) : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? `Anfrage fehlgeschlagen (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parse = createEventParser();
      let answer = "";
      const tools: string[] = [];
      const toolResults: { name: string; result: unknown }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const event of parse(decoder.decode(value, { stream: true }))) {
          if (event.type === "token") { answer += event.value; patch({ answer }); }
          else if (event.type === "tool") { tools.push(event.name); patch({ tools: [...tools] }); }
          else if (event.type === "toolResult") {
            toolResults.push({ name: event.name, result: event.result });
            patch({ toolResults: [...toolResults] });
          }
          else if (event.type === "usage") patch({ usage: event.usage });
          else if (event.type === "sources") patch({ sources: event.value });
          else if (event.type === "warning") patch({ warning: event.value });
          else if (event.type === "error") patch({ error: event.value });
        }
      }
    } catch (e) {
      patch({ error: e instanceof Error ? e.message : t.unknownError });
    } finally {
      patch({ done: true });
      setBusy(false);

      if (signedIn) void refreshConversations();
    }
  }

  return (
    <div className="flex min-h-dvh">
      {signedIn && (
        <Sidebar
          open={sidebarOpen}
          horses={horses}
          conversations={conversations}
          activeId={conversationId}
          horseId={horseId}
          onClose={() => setSidebarOpen(false)}
          onNew={newChat}
          onOpen={(id) => void openConversation(id)}
          onDelete={(id) => void removeConversation(id)}
          onSelectHorse={setHorseId}
          t={t}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
      <Nav />

      {signedIn && (
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label={t.openHistory}
          className="sticky top-3 z-10 mx-3 mt-2 self-start rounded-lg border border-line
                     bg-surface px-2.5 py-1 text-[12px] text-muted md:hidden"
        >
          ☰ {t.history}
        </button>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5">
        <div className="flex-1 py-6">
          {turns.length === 0 ? (
            <section className="flex flex-col gap-5 pt-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  {t.headline}
                </h1>
                <p className="mt-1.5 max-w-lg text-[15px] leading-relaxed text-muted">
                  {t.intro}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted">{t.tryIt}</span>
                {t.examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => void send(example)}
                    className="rounded-lg border border-line bg-surface px-4 py-2.5 text-left
                               text-[14px] transition-colors hover:border-accent"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="flex flex-col gap-7">
              {/*
                Export. Bewusst drei Formate mit verschiedenem Zweck: JSON
                verliert nichts (Belege, Tool-Rueckgaben, Verbrauch), Markdown
                ist zum Lesen und laesst sich im Browser als PDF drucken, CSV
                geht in die Tabelle. Nur sichtbar, wenn es auch etwas zu
                exportieren gibt.
              */}
              {signedIn && (
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <span>{t.exportLabel}</span>
                  {(["md", "json", "csv"] as const).map((format) => (
                    <a
                      key={format}
                      href={`/api/conversations/${conversationId}/export?format=${format}`}
                      download
                      className="rounded border border-line px-1.5 py-0.5 uppercase
                                 transition-colors hover:border-accent hover:text-accent"
                    >
                      {format}
                    </a>
                  ))}
                </div>
              )}

              {turns.map((turn, i) => (
                <article key={i} className="flex flex-col gap-3">
                  <p className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-surface
                                border border-line px-4 py-2.5 text-[15px]">
                    {turn.question}
                  </p>

                  {turn.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {turn.tools.map((tool, j) => {
                        const finished = turn.toolResults.some((r) => r.name === tool);
                        return (
                          <span
                            key={j}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5
                                        text-[11px] transition-colors ${
                                          finished
                                            ? "border-line text-muted"
                                            : "border-accent/50 text-accent"
                                        }`}
                          >
                            {!finished && (
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                            )}
                            {t[TOOL_KEYS[tool as keyof typeof TOOL_KEYS]] ?? tool}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {turn.warning && (
                    <p className="rounded-lg border border-accent/40 px-3 py-2 text-[13px]
                                  text-accent">
                      {turn.warning}
                    </p>
                  )}

                  {turn.videoFile && (
                    <VideoClip
                      conversationId={conversationId}
                      file={turn.videoFile}
                      name={turn.videoName}
                      t={t}
                    />
                  )}

                  {turn.observations && (
                    <ToolResult name="analyse_video" result={turn.observations} t={t} />
                  )}

                  {turn.toolResults.map((tr, j) => (
                    <ToolResult key={j} name={tr.name} result={tr.result} t={t} />
                  ))}

                  {turn.answer ? (
                    <div className="rounded-xl border border-line bg-surface px-5 py-4">
                      <Markdown>{turn.answer}</Markdown>
                      {!turn.done && (
                        <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse
                                         align-text-bottom bg-accent" />
                      )}
                      {turn.done && <Sources sources={turn.sources} t={t} />}
                      {turn.done && turn.usage && (
                        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[10px]
                                      text-muted">
                          {turn.usage.calls} {t.usageCalls} ·{" "}
                          {(turn.usage.inputTokens + turn.usage.outputTokens).toLocaleString(language)}{" "}
                          {t.usageTokens}
                          {turn.usage.reasoningTokens > 0 &&
                            ` (${t.usageReasoning} ${turn.usage.reasoningTokens.toLocaleString(language)} reasoning)`}{" "}
                          · {turn.usage.costUsd.toFixed(4)} USD
                        </p>
                      )}
                    </div>
                  ) : turn.error ? null : turn.done ? (

                    <p className="rounded-lg border border-line bg-surface px-4 py-2.5
                                  text-[13px] text-muted">
                      {t.unfinished}
                    </p>
                  ) : (
                    <Thinking
                      label={
                        turn.videoPending
                          ? t.phaseVideo
                          : turn.tools.length === 0
                            ? t.phaseReading
                            : turn.toolResults.length === 0
                              ? t.phaseSearching
                              : t.phaseWriting
                      }
                    />
                  )}

                  {turn.error && (
                    <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2
                                  text-[14px] text-red-700 dark:border-red-900
                                  dark:bg-red-950/40 dark:text-red-300">
                      {turn.error}
                    </p>
                  )}
                </article>
              ))}
              <div ref={bottom} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-line
                        bg-background/90 py-4 backdrop-blur">
          {signedIn && (
            <VideoPicker
              clip={clip}
              disabled={busy}
              t={t}
              onPicked={setClip}
              onCleared={() => setClip(null)}
            />
          )}

          {horses.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted">
              {t.questionAbout}
              <select
                value={horseId}
                onChange={(e) => setHorseId(e.target.value)}
                className="rounded-md border border-line bg-surface px-2 py-1 text-xs"
              >
                <option value="">{t.noHorse}</option>
                {horses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                    {h.training_level ? ` · ${t.levelPrefix} ${h.training_level}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex items-end gap-2">
            <textarea
              ref={box}
              value={input}
              onChange={(e) => { setInput(e.target.value); grow(e.currentTarget); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder={t.placeholder}
              title={t.inputHint}
              className="max-h-40 min-h-[44px] flex-1 resize-none overflow-y-auto rounded-xl
                         border border-line bg-surface px-4 py-3 text-[15px] outline-none
                         focus:border-accent"
            />
            <button
              onClick={() => void send(input)}
              disabled={busy || (!input.trim() && !clip)}
              className="h-[44px] rounded-xl bg-accent px-5 text-[14px] font-medium
                         text-white transition-opacity disabled:opacity-35"
            >
              {busy ? "…" : t.ask}
            </button>
          </div>
        </div>
      </main>
      </div>

      <LanguageSwitch language={language} label={t.language} onChange={changeLanguage} />
    </div>
  );
}
