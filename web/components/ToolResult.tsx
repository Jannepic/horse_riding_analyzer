/** A typed card per tool return — shows the raw value next to the answer text. */

"use client";

import type { Dict } from "@/lib/i18n";

type Weak = { name: string; mark: number; coefficient: number; lostPoints: number };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function ToolResult(
  { name, result, t }: { name: string; result: unknown; t: Dict },
) {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;

  if (name === "score_test_sheet") {
    const weakest = (r.weakest as Weak[]) ?? [];
    return (
      <Card title={t.cardScore}>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">
            {Number(r.percentage).toFixed(2)} %
          </span>
          <span className="text-[13px] text-muted">
            {String(r.totalPoints)} von {String(r.maxPoints)} Punkten
          </span>
        </div>
        <Row label={t.rowAverage} value={`${r.averageMark} · ${r.averageLabel}`} />
        {weakest.length > 0 && (
          <div className="mt-2 border-t border-line pt-2">
            <div className="mb-1 text-[11px] text-muted">{t.rowLosses}</div>
            {weakest.map((w, i) => (
              <Row
                key={i}
                label={`${w.name}${w.coefficient > 1 ? ` (Koeff. ${w.coefficient})` : ""}`}
                value={`Note ${w.mark} · −${w.lostPoints}`}
              />
            ))}
          </div>
        )}
      </Card>
    );
  }

  if (name === "horse_profile_match") {
    const cautions = (r.cautions as string[]) ?? [];
    const prep = (r.preparatory as string[]) ?? [];
    return (
      <Card title={t.cardMatch}>
        <div className="mb-1.5 flex items-baseline gap-2">
          <span className={`text-[15px] font-semibold ${r.suitable ? "text-accent" : ""}`}>
            {r.suitable ? "passt" : "noch zu früh"}
          </span>
          <span className="text-[13px] text-muted">{String(r.lesson)}</span>
        </div>
        <Row label="verlangt mindestens" value={`Klasse ${r.requiredLevel}`} />
        <Row label={t.rowHorseLevel} value={`${t.levelPrefix} ${r.horseLevel}`} />
        {typeof r.citation === "string" && <Row label={t.rowSource} value={r.citation} />}
        {prep.length > 0 && (
          <p className="mt-2 border-t border-line pt-2 text-[13px] text-muted">
            Vorbereitend: {prep.join(", ")}
          </p>
        )}
        {cautions.map((c, i) => (
          <p key={i} className="mt-2 text-[13px] text-accent">{c}</p>
        ))}
      </Card>
    );
  }

  if (name === "training_load") {
    const observations = (r.observations as string[]) ?? [];
    return (
      <Card title={t.cardLoad}>
        <Row label={t.rowSessions} value={t.rowSessionsValue(Number(r.sessions), Number(r.spanDays))} />
        <Row label="pro Woche" value={String(r.sessionsPerWeek)} />
        <Row label="Ø Intensität" value={String(r.averageIntensity)} />
        <Row label="längste Serie ohne Pause" value={`${r.longestStreakWithoutRest} Tage`} />
        <Row label={t.rowLoad} value={`${r.loadLastWeek} / ${r.loadPreviousWeek}`} />
        {typeof r.daysToTarget === "number" && (
          <Row label="bis zur Zielprüfung" value={`${r.daysToTarget} Tage`} />
        )}
        {observations.map((o, i) => (
          <p key={i} className="mt-2 border-t border-line pt-2 text-[13px] text-accent">{o}</p>
        ))}
      </Card>
    );
  }

  if (name === "analyse_video") {
    if (typeof r.error === "string") {
      return <Card title={t.cardVideoError}><p className="text-[13px] text-muted">{r.error}</p></Card>;
    }
    const obs =
      (r.observations as {
        claim: string; confidence: string; aspect: string; deviation?: boolean;
      }[]) ?? [];
    const notAssessable = (r.notAssessable as string[]) ?? [];
    const dot = (c: string) =>
      c === "hoch" ? "bg-accent" : c === "mittel" ? "bg-accent/50" : "bg-muted/40";

    const sorted = [...obs].sort(
      (a, b) => Number(b.deviation ?? false) - Number(a.deviation ?? false),
    );
    return (
      <Card title={t.cardVideo}>
        <Row label={t.rowGait} value={String(r.gait)} />
        {sorted.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5 border-t border-line pt-2">
            {sorted.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot(o.confidence)}`}
                  title={`Konfidenz: ${o.confidence}`}
                />
                <span>
                  {o.deviation && (
                    <span
                      title={t.deviationTitle}
                      className="mr-1.5 rounded bg-accent/15 px-1 py-px text-[10px]
                                 font-medium uppercase tracking-wide text-accent"
                    >
                      {t.deviation}
                    </span>
                  )}
                  <span className="text-muted">{o.aspect}: </span>
                  {o.claim}
                  <span className="ml-1 text-[11px] text-muted">({o.confidence})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {notAssessable.length > 0 && (
          <p className="mt-2 border-t border-line pt-2 text-[13px] text-muted">
            {t.notAssessable}: {notAssessable.join(", ")}
          </p>
        )}
      </Card>
    );
  }

  if (name === "retrieve_doctrine") {
    const searched = r.searchedFor as { german?: string[]; english?: string[] } | undefined;
    if (!searched) return null;
    return (
      <Card title={t.cardSearched}>
        <p className="text-[13px] leading-relaxed">
          <span className="font-mono text-[10px] text-muted">DE</span>{" "}
          {(searched.german ?? []).join(" · ")}
        </p>
        <p className="text-[13px] leading-relaxed">
          <span className="font-mono text-[10px] text-muted">EN</span>{" "}
          {(searched.english ?? []).join(" · ")}
        </p>
      </Card>
    );
  }

  return null;
}
