import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CURRENCY,
  DEFAULT_TIMEZONE,
  formatCurrency as formatCurrencyValue,
  formatDate as formatDateValue,
  formatNumber as formatNumberValue,
  formatRelativeDate as formatRelativeDateValue,
} from "./formatters";
import {
  defaultLanguage,
  isLanguageCode,
  languages,
  translations,
  type Direction,
  type LanguageCode,
  type TranslationKey,
} from "./translations";
import { resolveRuntimeLocale } from "@/lib/runtime-locale";

const STORAGE_KEY = "archsaas_language";

type LanguageContextValue = {
  language: LanguageCode;
  locale: string;
  direction: Direction;
  languages: typeof languages;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  formatCurrency: (value: number | string | null | undefined, currency?: string) => string;
  formatNumber: (value: number | string | null | undefined) => string;
  formatDate: (value: Date | string | number | null | undefined, timezone?: string) => string;
  formatRelativeDate: (value: Date | string | number | null | undefined) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): LanguageCode {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (isLanguageCode(saved)) return saved;

  const browserLanguage = navigator.language.split("-")[0];
  if (isLanguageCode(browserLanguage)) return browserLanguage;

  return defaultLanguage;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);
  const runtimeLocale = resolveRuntimeLocale({ savedLanguage: language, browserLanguage: navigator.language });
  const direction = runtimeLocale.direction;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  };

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: runtimeLocale.locale,
    direction,
    languages,
    setLanguage,
    t: (key) => translations[language][key] ?? translations[defaultLanguage][key] ?? key,
    formatCurrency: (valueToFormat, currency = DEFAULT_CURRENCY) =>
      formatCurrencyValue(valueToFormat, runtimeLocale.locale, currency),
    formatNumber: (valueToFormat) => formatNumberValue(valueToFormat, runtimeLocale.locale),
    formatDate: (valueToFormat, timezone = DEFAULT_TIMEZONE) =>
      formatDateValue(valueToFormat, runtimeLocale.locale, timezone),
    formatRelativeDate: (valueToFormat) => formatRelativeDateValue(valueToFormat, runtimeLocale.locale),
  }), [language, runtimeLocale.locale, direction]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return context;
}
