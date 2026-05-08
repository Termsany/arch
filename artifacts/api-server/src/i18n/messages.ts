import type { Request } from "express";

export type ApiLanguage = "ar" | "en" | "fr";

const fallbackLanguage: ApiLanguage = "ar";

const messages = {
  ar: {
    "COMMON.SERVER_ERROR": "حدث خطأ في الخادم",
    "COMMON.NOT_FOUND": "العنصر غير موجود",
    "AUTH.INVALID_CREDENTIALS": "بيانات الدخول غير صحيحة",
    "AUTH.PENDING_INVITE": "الحساب في انتظار تفعيل الدعوة",
    "AUTH.FORBIDDEN": "غير مصرح لك بتنفيذ هذا الإجراء",
    "AUTH.UNAUTHORIZED": "انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى",
    "AUTH.USER_NOT_FOUND": "المستخدم غير موجود",
    "AUTH.CURRENT_PASSWORD_INVALID": "كلمة المرور الحالية غير صحيحة",
    "INVITE.INVALID": "رابط الدعوة غير صحيح",
    "INVITE.EXPIRED": "رابط الدعوة منتهي أو غير صحيح",
    "VALIDATION.INVALID_INPUT": "البيانات المدخلة غير صحيحة",
  },
  en: {
    "COMMON.SERVER_ERROR": "Server error",
    "COMMON.NOT_FOUND": "Not found",
    "AUTH.INVALID_CREDENTIALS": "Invalid email or password",
    "AUTH.PENDING_INVITE": "The account is pending invite activation",
    "AUTH.FORBIDDEN": "You are not authorized to perform this action",
    "AUTH.UNAUTHORIZED": "Your session has expired, please log in again",
    "AUTH.USER_NOT_FOUND": "User not found",
    "AUTH.CURRENT_PASSWORD_INVALID": "Current password is incorrect",
    "INVITE.INVALID": "Invalid invitation link",
    "INVITE.EXPIRED": "Invitation link is expired or invalid",
    "VALIDATION.INVALID_INPUT": "Invalid input",
  },
  fr: {
    "COMMON.SERVER_ERROR": "Erreur serveur",
    "COMMON.NOT_FOUND": "Introuvable",
    "AUTH.INVALID_CREDENTIALS": "E-mail ou mot de passe invalide",
    "AUTH.PENDING_INVITE": "Le compte attend l’activation de l’invitation",
    "AUTH.FORBIDDEN": "Vous n’êtes pas autorisé à effectuer cette action",
    "AUTH.UNAUTHORIZED": "Votre session a expiré, veuillez vous reconnecter",
    "AUTH.USER_NOT_FOUND": "Utilisateur introuvable",
    "AUTH.CURRENT_PASSWORD_INVALID": "Le mot de passe actuel est incorrect",
    "INVITE.INVALID": "Lien d’invitation invalide",
    "INVITE.EXPIRED": "Lien d’invitation expiré ou invalide",
    "VALIDATION.INVALID_INPUT": "Entrée invalide",
  },
} as const;

export type ApiMessageKey = keyof typeof messages[typeof fallbackLanguage];

export function normalizeApiLanguage(value: string | null | undefined): ApiLanguage {
  const language = value?.trim().split("-")[0];
  return language === "en" || language === "fr" || language === "ar" ? language : fallbackLanguage;
}

export function tApi(req: Request, key: ApiMessageKey): string {
  const language = normalizeApiLanguage((req as Request & { language?: string }).language);
  return messages[language][key] ?? messages[fallbackLanguage][key] ?? key;
}
