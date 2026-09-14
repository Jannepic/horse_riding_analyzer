/** German and English UI strings, plus the language rule handed to the model. */

export const LANGUAGES = ["de", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

const de = {
  headline: "Frag die Reitlehre.",
  intro:
    "Beschreib ein Problem in eigenen Worten. Die Antwort wird gegen FEI- und " +
    "DOKR-Quellen geerdet, und jede Aussage trägt ihre Fundstelle — nachlesbar, " +
    "nicht geraten.",
  tryIt: "Zum Ausprobieren",
  examples: [
    "Welche Hufschlagfolge hat der Galopp?",
    "Mein Pferd verhaspelt sich im Galopp — woran liegt das?",
    "Ich hatte 7, 6 und 8, die letzte mit Koeffizient 2. Wie viel Prozent?",
    "Wozu dient das Schulterherein?",
  ],
  ask: "Fragen",
  placeholder: "Frage stellen… (gilt auch für ein Video)",
  inputHint:
    "Enter sendet, Shift+Enter fügt eine neue Zeile ein. Wer ein Video " +
    "analysieren will, schreibt die Frage zuerst hier hinein.",
  exportLabel: "Export:",
  noHorse: "kein bestimmtes Pferd",
  horseLabel: "Pferd",
  levelPrefix: "Klasse",
  unfinished:
    "Diese Anfrage wurde nicht abgeschlossen — es gibt keine Antwort dazu. " +
    "Stell die Frage erneut; die Beobachtungen aus dem Video bleiben oben erhalten.",
  newChat: "+ Neuer Chat",
  horses: "Pferde",
  allHorses: "← alle Pferde",
  history: "Verlauf",
  historyEmpty: "Noch nichts gespeichert. Sobald du eine Frage stellst, erscheint sie hier.",
  untitled: "ohne Titel",
  hasVideo: "enthält ein Video",
  deleteChat: "Chat und zugehörige Videos löschen",
  deleteConfirm: "Diesen Chat samt gespeicherten Videos löschen?",
  openHistory: "Verlauf öffnen",
  closeSidebar: "Seitenleiste schließen",
  toolRetrieve: "sucht in der Reitlehre",
  toolScore: "rechnet das Ergebnis",
  toolMatch: "prüft die Eignung",
  toolLoad: "wertet Trainingsdaten aus",
  phaseVideo: "schaut sich das Video an",
  phaseReading: "liest die Frage",
  phaseSearching: "sucht in den Quellen",
  phaseWriting: "formuliert die Antwort",
  usageCalls: "Modellaufrufe",
  usageTokens: "Tokens",
  usageReasoning: "davon",
  language: "Sprache",
  tagline: "Reitlehre mit Quellenangabe",
  profile: "Profil",
  signOut: "abmelden",
  questionAbout: "Frage betrifft",
  watchVideo: "Video ansehen",
  openInTab: "in einem eigenen Tab öffnen",
  attachVideo: "+ Video anhängen",
  attachHint:
    "Zur Analyse wird der Clip einmalig an das Sprachmodell übertragen. Gespeichert " +
    "wird er nur auf diesem Rechner, unter web/data/videos/ — ein Ordner je Chat, " +
    "angelegt von der Anwendung. Wird der Chat gelöscht, verschwindet der Ordner mit ihm.",
  cardScore: "Berechnetes Ergebnis",
  cardMatch: "Eignungsprüfung",
  cardLoad: "Trainingsbelastung",
  cardVideo: "Beobachtungen aus dem Video",
  cardVideoError: "Videoanalyse",
  cardSearched: "Gesucht wurde nach",
  rowAverage: "Durchschnittsnote",
  rowLosses: "Grösste Punktverluste",
  rowHorseLevel: "Pferd steht auf",
  rowSource: "Quelle",
  rowSessions: "Einheiten",
  rowSessionsValue: (n: number, days: number) => `${n} in ${days} Tagen`,
  rowLoad: "Last letzte / Vorwoche",
  rowGait: "Gangart",
  deviation: "Abweichung",
  deviationTitle: "Abweichung von der Norm",
  notAssessable: "Nicht beurteilbar",
  evidenceOne: "Beleg",
  evidenceMany: "Belege",
  removeAttachment: "Anhang entfernen",
  attachTitle:
    "Clip anhängen. Er wird im Browser auf 720p verkleinert; analysiert wird er " +
    "erst beim Senden — deine Frage steuert dann, worauf das Modell schaut.",
  unknownError: "Unbekannter Fehler",
  videoFailed: "Videoanalyse fehlgeschlagen",
  defaultVideoQuestion: (name: string) =>
    `Was fällt an meinem Ritt im Video "${name}" auf? Was weicht von der Reitlehre ` +
    `ab und was sollte ich zuerst verbessern?`,
};

export type Dict = typeof de;

const en: Dict = {
  headline: "Ask the classical doctrine.",
  intro:
    "Describe a problem in your own words. Every answer is grounded in FEI and " +
    "DOKR sources, and each claim carries its citation — checkable, not guessed.",
  tryIt: "Try one of these",
  examples: [
    "What is the footfall sequence of the canter?",
    "My horse gets muddled in canter — what causes that?",
    "I scored 7, 6 and 8, the last one with coefficient 2. What percentage?",
    "What is shoulder-in for?",
  ],
  ask: "Ask",
  placeholder: "Ask a question… (also used for a video)",
  inputHint:
    "Enter sends, Shift+Enter adds a line break. To analyse a video, type your " +
    "question here first.",
  exportLabel: "Export:",
  noHorse: "no particular horse",
  horseLabel: "Horse",
  levelPrefix: "Level",
  unfinished:
    "This request did not complete — there is no answer for it. Ask again; the " +
    "observations from the video stay above.",
  newChat: "+ New chat",
  horses: "Horses",
  allHorses: "← all horses",
  history: "History",
  historyEmpty: "Nothing saved yet. Your first question will show up here.",
  untitled: "untitled",
  hasVideo: "contains a video",
  deleteChat: "Delete this chat and its videos",
  deleteConfirm: "Delete this chat including its stored videos?",
  openHistory: "Open history",
  closeSidebar: "Close sidebar",
  toolRetrieve: "searching the doctrine",
  toolScore: "computing the score",
  toolMatch: "checking readiness",
  toolLoad: "analysing training data",
  phaseVideo: "watching the video",
  phaseReading: "reading the question",
  phaseSearching: "searching the sources",
  phaseWriting: "writing the answer",
  usageCalls: "model calls",
  usageTokens: "tokens",
  usageReasoning: "of which",
  language: "Language",
  tagline: "classical doctrine, with citations",
  profile: "Profile",
  signOut: "sign out",
  questionAbout: "Question is about",
  watchVideo: "Watch video",
  openInTab: "open in its own tab",
  attachVideo: "+ Attach video",
  attachHint:
    "For the analysis the clip is sent to the language model once. It is stored only " +
    "on this machine, under web/data/videos/ — one folder per chat, created by the " +
    "application. Delete the chat and the folder goes with it.",
  cardScore: "Calculated result",
  cardMatch: "Readiness check",
  cardLoad: "Training load",
  cardVideo: "Observations from the video",
  cardVideoError: "Video analysis",
  cardSearched: "Searched for",
  rowAverage: "Average mark",
  rowLosses: "Largest point losses",
  rowHorseLevel: "Horse is at",
  rowSource: "Source",
  rowSessions: "Sessions",
  rowSessionsValue: (n: number, days: number) => `${n} in ${days} days`,
  rowLoad: "Load last / previous week",
  rowGait: "Gait",
  deviation: "Deviation",
  deviationTitle: "Deviation from the norm",
  notAssessable: "Not assessable",
  evidenceOne: "source",
  evidenceMany: "sources",
  removeAttachment: "Remove attachment",
  attachTitle:
    "Attach a clip. It is downscaled to 720p in the browser; the analysis runs when " +
    "you send — your question then steers what the model looks at.",
  unknownError: "Unknown error",
  videoFailed: "Video analysis failed",
  defaultVideoQuestion: (name: string) =>
    `What stands out about my riding in the video "${name}"? What deviates from ` +
    `the classical doctrine, and what should I fix first?`,
};

const DICTS: Record<Language, Dict> = { de, en };

export function dict(language: Language): Dict {
  return DICTS[language];
}

export function languageInstruction(language: Language): string {
  const target = language === "en" ? "ENGLISH" : "GERMAN";
  return (
    `\n\nLANGUAGE — TAKES PRECEDENCE OVER EVERYTHING ELSE\n` +
    `Answer exclusively in ${target}. This holds even when the question is asked ` +
    `in a different language and when the evidence is in a different language. ` +
    `Translate technical terms into the target language and keep the original ` +
    `term in parentheses when it appears that way in the evidence.`
  );
}
