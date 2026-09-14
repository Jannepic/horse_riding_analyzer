/** Flags suspicious input without rewriting it. */

const PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /ignor(e|iere)\s+(all\s+)?(previous|prior|above|vorherige|obige)/i,
    label: "Anweisung, vorherige Instruktionen zu ignorieren" },
  { pattern: /\b(system\s*prompt|systemprompt|deine\s+anweisungen)\b/i,
    label: "Frage nach dem Systemprompt" },
  { pattern: /\b(du bist (jetzt|ab sofort)|you are now|act as if|verhalte dich als)\b/i,
    label: "Versuch, die Rolle zu überschreiben" },
  { pattern: /\b(disregard|vergiss)\s+(the\s+|die\s+)?(rules|instructions|regeln|anweisungen)/i,
    label: "Anweisung, Regeln zu verwerfen" },
  { pattern: /<\s*\/?\s*(system|instruction|s>)/i,
    label: "Versuch, eine System-Markierung einzuschleusen" },
];

export type GuardResult = {
  suspicious: boolean;

  findings: string[];
};

export function inspectInput(text: string): GuardResult {
  const findings = PATTERNS.filter((p) => p.pattern.test(text)).map((p) => p.label);
  return { suspicious: findings.length > 0, findings };
}
