export const languages = [
  { code: "ar", label: "العربية", shortLabel: "AR", dir: "rtl" },
  { code: "en", label: "English", shortLabel: "EN", dir: "ltr" },
  { code: "fr", label: "Français", shortLabel: "FR", dir: "ltr" },
] as const;

export type LanguageCode = typeof languages[number]["code"];
export type Direction = typeof languages[number]["dir"];

export const defaultLanguage: LanguageCode = "ar";

export const translations = {
  ar: {
    "app.name": "ArchSaaS",
    "role.superAdmin": "مدير النظام",
    "role.officeAdmin": "مدير مكتب",
    "nav.dashboard": "لوحة التحكم",
    "nav.clients": "العملاء",
    "nav.projects": "المشاريع",
    "nav.tasks": "المهام",
    "nav.invoices": "الفواتير والمدفوعات",
    "nav.reports": "التقارير",
    "nav.auditLogs": "سجل النشاط / Audit Logs",
    "nav.whatsapp": "واتساب",
    "nav.boqLibrary": "مكتبة المقايسة",
    "nav.notifications": "الإشعارات",
    "nav.subscription": "اشتراكي",
    "nav.plans": "خطط الاشتراك",
    "nav.offices": "المكاتب",
    "nav.pricing": "صفحة الأسعار",
    "auth.logout": "تسجيل الخروج",
    "language.label": "اللغة",
    "language.ar": "العربية",
    "language.en": "English",
    "language.fr": "Français",
  },
  en: {
    "app.name": "ArchSaaS",
    "role.superAdmin": "System Admin",
    "role.officeAdmin": "Office Admin",
    "nav.dashboard": "Dashboard",
    "nav.clients": "Clients",
    "nav.projects": "Projects",
    "nav.tasks": "Tasks",
    "nav.invoices": "Invoices & Payments",
    "nav.reports": "Reports",
    "nav.auditLogs": "Audit Logs",
    "nav.whatsapp": "WhatsApp",
    "nav.boqLibrary": "BOQ Library",
    "nav.notifications": "Notifications",
    "nav.subscription": "My Subscription",
    "nav.plans": "Subscription Plans",
    "nav.offices": "Offices",
    "nav.pricing": "Pricing Page",
    "auth.logout": "Log out",
    "language.label": "Language",
    "language.ar": "Arabic",
    "language.en": "English",
    "language.fr": "French",
  },
  fr: {
    "app.name": "ArchSaaS",
    "role.superAdmin": "Administrateur système",
    "role.officeAdmin": "Administrateur bureau",
    "nav.dashboard": "Tableau de bord",
    "nav.clients": "Clients",
    "nav.projects": "Projets",
    "nav.tasks": "Tâches",
    "nav.invoices": "Factures et paiements",
    "nav.reports": "Rapports",
    "nav.auditLogs": "Journal d’audit",
    "nav.whatsapp": "WhatsApp",
    "nav.boqLibrary": "Bibliothèque BOQ",
    "nav.notifications": "Notifications",
    "nav.subscription": "Mon abonnement",
    "nav.plans": "Plans d’abonnement",
    "nav.offices": "Bureaux",
    "nav.pricing": "Page des prix",
    "auth.logout": "Se déconnecter",
    "language.label": "Langue",
    "language.ar": "Arabe",
    "language.en": "Anglais",
    "language.fr": "Français",
  },
} as const;

export type TranslationKey = keyof typeof translations[typeof defaultLanguage];

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return languages.some((language) => language.code === value);
}

export function getLanguageDirection(language: LanguageCode): Direction {
  return languages.find((item) => item.code === language)?.dir ?? "rtl";
}
