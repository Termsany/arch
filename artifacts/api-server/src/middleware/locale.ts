import type { NextFunction, Request, Response } from "express";
import type { Office } from "@workspace/db";
import { normalizeApiLanguage, type ApiLanguage } from "../i18n/messages";

const localeByLanguage: Record<ApiLanguage, string> = {
  ar: "ar-EG",
  en: "en-US",
  fr: "fr-FR",
};

declare global {
  namespace Express {
    interface Request {
      language?: ApiLanguage;
      locale?: string;
      currency?: string;
      timezone?: string;
    }
  }
}

function pickAcceptedLanguage(header: string | undefined): ApiLanguage {
  const first = header?.split(",")[0]?.trim();
  return normalizeApiLanguage(first);
}

export function applyUserLocale(req: Request, preferredLanguage?: string | null, office?: Pick<Office, "defaultLanguage" | "currency" | "timezone"> | null): void {
  const language = normalizeApiLanguage(preferredLanguage || office?.defaultLanguage || req.language);
  req.language = language;
  req.locale = localeByLanguage[language];
  req.currency = office?.currency || req.currency || "EGP";
  req.timezone = office?.timezone || req.timezone || "Africa/Cairo";
}

export function localeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const language = pickAcceptedLanguage(req.headers["accept-language"]);
  req.language = language;
  req.locale = localeByLanguage[language];
  req.currency = "EGP";
  req.timezone = "Africa/Cairo";
  next();
}
