import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  defaultLanguage,
  getLanguageDirection,
  isLanguageCode,
  languages,
  translations,
  type Direction,
  type LanguageCode,
  type TranslationKey,
} from "./translations";

const STORAGE_KEY = "archsaas_language";

type LanguageContextValue = {
  language: LanguageCode;
  direction: Direction;
  languages: typeof languages;
  setLanguage: (language: LanguageCode) => void;
  t: (key: TranslationKey) => string;
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
  const direction = getLanguageDirection(language);

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
    direction,
    languages,
    setLanguage,
    t: (key) => translations[language][key] ?? translations[defaultLanguage][key] ?? key,
  }), [language, direction]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within LanguageProvider");
  }
  return context;
}
