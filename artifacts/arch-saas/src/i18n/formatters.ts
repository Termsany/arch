export const DEFAULT_LOCALE = "ar-EG";
export const DEFAULT_CURRENCY = "EGP";
export const DEFAULT_TIMEZONE = "Africa/Cairo";

type DateInput = Date | string | number | null | undefined;

export function parseSafeDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeLocale(locale?: string): string {
  return locale?.trim() || DEFAULT_LOCALE;
}

export function formatNumber(value: number | string | null | undefined, locale = DEFAULT_LOCALE): string {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return new Intl.NumberFormat(safeLocale(locale), { maximumFractionDigits: 2 }).format(safeValue);
}

export function formatCurrency(
  value: number | string | null | undefined,
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY,
): string {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat(safeLocale(locale), {
    style: "currency",
    currency: currency || DEFAULT_CURRENCY,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatDate(value: DateInput, locale = DEFAULT_LOCALE, timezone = DEFAULT_TIMEZONE): string {
  const date = parseSafeDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat(safeLocale(locale), {
    dateStyle: "medium",
    timeZone: timezone || DEFAULT_TIMEZONE,
  }).format(date);
}

export function formatRelativeDate(value: DateInput, locale = DEFAULT_LOCALE): string {
  const date = parseSafeDate(value);
  if (!date) return "-";

  const now = Date.now();
  const diffInSeconds = Math.round((date.getTime() - now) / 1000);
  const absSeconds = Math.abs(diffInSeconds);

  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  const [unit, seconds] = divisions.find(([, unitSeconds]) => absSeconds >= unitSeconds) ?? ["second", 1];
  const valueForUnit = Math.round(diffInSeconds / seconds);

  return new Intl.RelativeTimeFormat(safeLocale(locale), { numeric: "auto" }).format(valueForUnit, unit);
}
