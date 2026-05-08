import {
  defaultLanguage,
  getLanguageDirection,
  getLanguageLocale,
  isLanguageCode,
  type Direction,
  type LanguageCode,
} from "@/i18n/translations";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/i18n/formatters";

export type RuntimeLocale = {
  language: LanguageCode;
  locale: string;
  direction: Direction;
  region: string;
  timezone: string;
  currency: string;
};

type RuntimeLocaleInput = {
  user?: {
    preferredLanguage?: string | null;
  } | null;
  office?: {
    defaultLanguage?: string | null;
    region?: string | null;
    timezone?: string | null;
    currency?: string | null;
  } | null;
  savedLanguage?: string | null;
  browserLanguage?: string | null;
};

function normalizeLanguage(value: string | null | undefined): LanguageCode | null {
  if (!value) return null;
  const candidate = value.trim().split("-")[0];
  return isLanguageCode(candidate) ? candidate : null;
}

export function resolveRuntimeLocale(input: RuntimeLocaleInput = {}): RuntimeLocale {
  const language =
    normalizeLanguage(input.user?.preferredLanguage) ??
    normalizeLanguage(input.office?.defaultLanguage) ??
    normalizeLanguage(input.savedLanguage) ??
    normalizeLanguage(input.browserLanguage) ??
    defaultLanguage;

  return {
    language,
    locale: getLanguageLocale(language),
    direction: getLanguageDirection(language),
    region: input.office?.region?.trim() || "EG",
    timezone: input.office?.timezone?.trim() || DEFAULT_TIMEZONE,
    currency: input.office?.currency?.trim() || DEFAULT_CURRENCY,
  };
}
