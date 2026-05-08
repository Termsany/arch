import { normalizeApiLanguage, type ApiLanguage } from "../i18n/messages";

const validationMessages = {
  ar: {
    email: "البريد الإلكتروني غير صحيح",
    passwordRequired: "كلمة المرور مطلوبة",
    passwordMin: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
    currentPasswordRequired: "كلمة المرور الحالية مطلوبة",
    newPasswordMin: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل",
    phoneRequired: "رقم الهاتف مطلوب",
    invalidDate: "تاريخ غير صحيح، استخدم صيغة YYYY-MM-DD",
  },
  en: {
    email: "Invalid email address",
    passwordRequired: "Password is required",
    passwordMin: "Password must be at least 8 characters",
    currentPasswordRequired: "Current password is required",
    newPasswordMin: "New password must be at least 8 characters",
    phoneRequired: "Phone number is required",
    invalidDate: "Invalid date, use YYYY-MM-DD",
  },
  fr: {
    email: "Adresse e-mail invalide",
    passwordRequired: "Le mot de passe est requis",
    passwordMin: "Le mot de passe doit contenir au moins 8 caractères",
    currentPasswordRequired: "Le mot de passe actuel est requis",
    newPasswordMin: "Le nouveau mot de passe doit contenir au moins 8 caractères",
    phoneRequired: "Le numéro de téléphone est requis",
    invalidDate: "Date invalide, utilisez YYYY-MM-DD",
  },
} as const;

export type ValidationMessageKey = keyof typeof validationMessages.ar;

export function validationMessage(language: string | null | undefined, key: ValidationMessageKey): string {
  const normalized = normalizeApiLanguage(language) as ApiLanguage;
  return validationMessages[normalized][key] ?? validationMessages.ar[key];
}
