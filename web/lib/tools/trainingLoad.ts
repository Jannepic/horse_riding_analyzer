/** Computes training load from recorded sessions. The thresholds are convention, not doctrine. */

export type Session = {
  date: string;
  durationMin: number;

  intensity: number;
  focus?: string;
};

export const REST_DAY_WARNING_STREAK = 6;
export const LOAD_JUMP_WARNING = 1.5;

export type LoadReport = {
  sessions: number;
  spanDays: number;
  sessionsPerWeek: number;
  totalMinutes: number;

  totalLoad: number;
  averageIntensity: number;
  longestStreakWithoutRest: number;
  loadLastWeek: number;
  loadPreviousWeek: number;
  daysToTarget?: number;
  observations: string[];
  focusCounts: Record<string, number>;
};

const DAY = 86_400_000;
const toDay = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY);

export function analyseLoad(
  sessions: Session[],
  options: { today?: string; targetDate?: string } = {},
): LoadReport {
  if (sessions.length === 0) throw new Error("Keine Trainingseinheiten übergeben.");

  for (const s of sessions) {
    if (Number.isNaN(toDay(s.date))) throw new Error(`Ungültiges Datum: ${s.date}`);
  }

  const sorted = [...sessions].sort((a, b) => toDay(a.date) - toDay(b.date));
  const first = toDay(sorted[0]!.date);
  const last = toDay(sorted.at(-1)!.date);
  const todayDay = options.today ? toDay(options.today) : last;

  const spanDays = last - first + 1;
  const totalMinutes = sorted.reduce((n, s) => n + s.durationMin, 0);
  const totalLoad = sorted.reduce((n, s) => n + s.durationMin * s.intensity, 0);
  const averageIntensity = totalLoad / Math.max(totalMinutes, 1);

  let longestStreak = 1;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = toDay(sorted[i]!.date) - toDay(sorted[i - 1]!.date);
    if (gap === 0) continue;
    streak = gap === 1 ? streak + 1 : 1;
    longestStreak = Math.max(longestStreak, streak);
  }

  const loadBetween = (fromDay: number, toDayExcl: number) =>
    sorted
      .filter((s) => toDay(s.date) >= fromDay && toDay(s.date) < toDayExcl)
      .reduce((n, s) => n + s.durationMin * s.intensity, 0);

  const loadLastWeek = loadBetween(todayDay - 6, todayDay + 1);
  const loadPreviousWeek = loadBetween(todayDay - 13, todayDay - 6);

  const focusCounts: Record<string, number> = {};
  for (const s of sorted) {
    if (s.focus) focusCounts[s.focus] = (focusCounts[s.focus] ?? 0) + 1;
  }

  const observations: string[] = [];
  if (longestStreak >= REST_DAY_WARNING_STREAK) {
    observations.push(
      `${longestStreak} Tage in Folge ohne Pausentag. (Schwelle ${REST_DAY_WARNING_STREAK} — ` +
        `eine gesetzte Konvention, keine Vorgabe aus den Quellen.)`,
    );
  }
  if (loadPreviousWeek > 0 && loadLastWeek / loadPreviousWeek >= LOAD_JUMP_WARNING) {
    const factor = (loadLastWeek / loadPreviousWeek).toFixed(1);
    observations.push(`Belastung gegenüber der Vorwoche um Faktor ${factor} gestiegen.`);
  }
  if (loadLastWeek === 0) observations.push("In den letzten sieben Tagen keine Einheit erfasst.");

  const report: LoadReport = {
    sessions: sorted.length,
    spanDays,
    sessionsPerWeek: round1((sorted.length / spanDays) * 7),
    totalMinutes,
    totalLoad,
    averageIntensity: round1(averageIntensity),
    longestStreakWithoutRest: longestStreak,
    loadLastWeek,
    loadPreviousWeek,
    observations,
    focusCounts,
  };

  if (options.targetDate) {
    const target = toDay(options.targetDate);
    if (Number.isNaN(target)) throw new Error(`Ungültiges Zieldatum: ${options.targetDate}`);
    report.daysToTarget = target - todayDay;
  }
  return report;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
