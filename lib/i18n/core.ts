import { messages } from "./messages";

export const languages = ["roman", "ur", "en"] as const;
export type Language = (typeof languages)[number];
export type TranslationKey = keyof typeof messages;
export type Values = Record<string, string | number>;

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}
export const languageLocale = { roman: "en-PK", ur: "ur-PK", en: "en-PK" } as const;
export const speechLanguage = (language: Language) => language === "en" ? "en" : "ur";

export function translate(language: Language, key: TranslationKey, values: Values = {}) {
  return messages[key][language].replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match));
}

// For server-supplied status labels and known API errors. Never use on user-authored content.
export function translateLabel(language: Language, value: string) {
  return Object.hasOwn(messages, value) ? translate(language, value as TranslationKey) : value;
}

export function translateError(language: Language, value: string) {
  if (!value) return "";
  const confirmation = /^No details were saved\. Say “([^”]+)” clearly, or tap the save button\.$/.exec(value);
  if (confirmation) return translate(language, "No details were saved. Say “{phrase}” clearly, or tap the save button.", {
    phrase: language === "en" ? confirmation[1] : translate(language, /profile/i.test(confirmation[1]) ? "Profile save karein" : "Request save karein"),
  });
  return Object.hasOwn(messages, value) ? translate(language, value as TranslationKey)
    : translate(language, "Something went wrong. Please try again.");
}
