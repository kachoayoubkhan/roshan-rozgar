"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { isLanguage, languageLocale, translate, translateError, translateLabel, type Language, type TranslationKey, type Values } from "@/lib/i18n/core";

const storageKey = "roshan-rozgar.language";
const changeEvent = "roshan-language-change";
const defaultLanguage: Language = "ur";

function snapshot(): Language {
  try {
    const stored = localStorage.getItem(storageKey);
    return isLanguage(stored) ? stored : defaultLanguage;
  } catch { return defaultLanguage; }
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) listener(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, listener);
  };
}

type I18n = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, values?: Values) => string;
  label: (value: string) => string;
  error: (value: string) => string;
  locale: string;
};
const Context = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribe, snapshot, () => defaultLanguage);
  const [override, setOverride] = useState<Language>();
  const language = override ?? stored;
  const setLanguage = useCallback((next: Language) => {
    setOverride(next);
    try { localStorage.setItem(storageKey, next); } catch { /* In-memory preference works when storage is blocked. */ }
    document.documentElement.lang = next === "roman" ? "ur-Latn" : next;
    document.documentElement.dir = next === "ur" ? "rtl" : "ltr";
    document.cookie = `rr_language=${next};path=/;max-age=31536000;SameSite=Lax`;
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "roman" ? "ur-Latn" : language;
    document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
  }, [language]);
  const value = useMemo<I18n>(() => ({
    language, setLanguage, locale: languageLocale[language],
    t: (key, values) => translate(language, key, values),
    label: (text) => translateLabel(language, text),
    error: (text) => translateError(language, text),
  }), [language, setLanguage]);
  return <Context value={value}>
    <div className="contents" onInvalidCapture={(event) => {
      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;
      field.setCustomValidity("");
      if (field.validity.valueMissing) field.setCustomValidity(value.t("Please complete the required fields."));
      else if (field instanceof HTMLInputElement && (field.validity.rangeOverflow || field.validity.rangeUnderflow || field.validity.stepMismatch)) {
        field.setCustomValidity(value.t("Enter a whole number from {min} to {max}.", {min: field.min, max: field.max}));
      } else if (!field.validity.valid) field.setCustomValidity(value.t("Enter a valid value."));
    }} onInputCapture={(event) => {
      const field = event.target;
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) field.setCustomValidity("");
    }}>{children}</div>
  </Context>;
}

export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("LanguageProvider is required.");
  return value;
}

export function Text({ k, values }: { k: TranslationKey; values?: Values }) {
  return useI18n().t(k, values);
}

export function Label({ value }: { value: string }) {
  return useI18n().label(value);
}

export function ErrorText({ message }: { message: string }) {
  return useI18n().error(message);
}

export function DateText({ value }: { value: string }) {
  const { locale } = useI18n();
  return <bdi>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value))}</bdi>;
}
