"use client";

import { useI18n } from "./provider";
import { languages } from "@/lib/i18n/core";

const labels = { roman: "Roman Urdu", ur: "اردو", en: "English" } as const;

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div role="group" aria-label={t("Language")} className="language-switcher" dir="ltr">
      {languages.map((value) => (
        <button type="button" key={value} lang={value === "roman" ? "ur-Latn" : value}
          aria-pressed={language === value} onClick={() => setLanguage(value)}
          className={language === value ? "language-active" : undefined}>
          {labels[value]}
        </button>
      ))}
    </div>
  );
}
