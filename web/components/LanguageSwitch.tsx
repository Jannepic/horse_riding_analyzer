/** Language switch, bottom right; drives both the labels and the answer language. */

"use client";

import { LANGUAGES, type Language } from "@/lib/i18n";

export function LanguageSwitch({
  language,
  label,
  onChange,
}: {
  language: Language;
  label: string;
  onChange: (language: Language) => void;
}) {
  return (
    <div
      title={label}

      className="fixed bottom-28 right-2 z-40 flex overflow-hidden rounded-lg border
                 md:bottom-3 md:right-3
                 border-line bg-surface/95 text-[11px] shadow-sm backdrop-blur"
    >
      {LANGUAGES.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          aria-pressed={option === language}
          className={`px-2.5 py-1 uppercase transition-colors ${
            option === language
              ? "bg-accent/15 font-medium text-accent"
              : "text-muted hover:text-accent"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
