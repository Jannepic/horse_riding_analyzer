/** Mark scale and percentage arithmetic per FEI Art. 423 and 425. */

export const MARK_SCALE: Record<number, string> = {
  10: "Excellent",
  9: "Very good",
  8: "Good",
  7: "Fairly good",
  6: "Satisfactory",
  5: "Sufficient",
  4: "Insufficient",
  3: "Fairly bad",
  2: "Bad",
  1: "Very bad",
  0: "Not executed",
};

export const MIN_MARK = 0;
export const MAX_MARK = 10;

export const MARK_STEP = 0.5;

export type Movement = {
  number?: number;
  name?: string;
  mark: number;

  coefficient: number;
};

export type ScoreResult = {
  totalPoints: number;
  maxPoints: number;
  percentage: number;

  averageMark: number;
  averageLabel: string;

  weakest: { name: string; mark: number; coefficient: number; lostPoints: number }[];
};

export function labelForMark(mark: number): string {
  return MARK_SCALE[Math.floor(mark)] ?? "unbekannt";
}

export function scoreTestSheet(movements: Movement[]): ScoreResult {
  if (movements.length === 0) {
    throw new Error("Mindestens eine Lektion wird benötigt.");
  }

  let totalPoints = 0;
  let maxPoints = 0;

  for (const m of movements) {
    totalPoints += m.mark * m.coefficient;
    maxPoints += MAX_MARK * m.coefficient;
  }

  const weighted = movements.reduce((sum, m) => sum + m.coefficient, 0);
  const averageMark = totalPoints / weighted;

  const weakest = movements
    .map((m, i) => ({
      name: m.name ?? (m.number ? `Lektion ${m.number}` : `Lektion ${i + 1}`),
      mark: m.mark,
      coefficient: m.coefficient,

      lostPoints: (MAX_MARK - m.mark) * m.coefficient,
    }))
    .filter((m) => m.lostPoints > 0)
    .sort((a, b) => b.lostPoints - a.lostPoints || a.mark - b.mark)
    .slice(0, 5);

  return {
    totalPoints: round2(totalPoints),
    maxPoints,

    percentage: round2((totalPoints / maxPoints) * 100),
    averageMark: round2(averageMark),
    averageLabel: labelForMark(averageMark),
    weakest,
  };
}

export function medianScore(scores: number[]): number {
  if (scores.length === 0) throw new Error("Keine Noten übergeben.");
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : round2((sorted[mid - 1]! + sorted[mid]!) / 2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
