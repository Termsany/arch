import type { TranslationKey } from "@/i18n/translations";

export const APP_MODULE_KEYS = [
  "dashboard",
  "clients",
  "projects",
  "tasks",
  "invoices",
  "reports",
  "audit_logs",
  "whatsapp",
  "boq_library",
  "notifications",
  "subscription",
  "plans",
  "offices",
  "credentials",
  "pricing",
] as const;

export type AppModuleKey = typeof APP_MODULE_KEYS[number];

export type AppModule = {
  key: AppModuleKey;
  href: string;
  labelKey: TranslationKey;
  superAdminOnly: boolean;
  officeOnly: boolean;
  adminOnly?: boolean;
};

export const APP_MODULES: AppModule[] = [
  { key: "dashboard", href: "/dashboard", labelKey: "modules.dashboard", superAdminOnly: false, officeOnly: false },
  { key: "clients", href: "/clients", labelKey: "modules.clients", superAdminOnly: false, officeOnly: false },
  { key: "projects", href: "/projects", labelKey: "modules.projects", superAdminOnly: false, officeOnly: false },
  { key: "tasks", href: "/tasks", labelKey: "modules.tasks", superAdminOnly: false, officeOnly: false },
  { key: "invoices", href: "/invoices", labelKey: "modules.invoices", superAdminOnly: false, officeOnly: false },
  { key: "reports", href: "/reports", labelKey: "modules.reports", superAdminOnly: false, officeOnly: false },
  { key: "audit_logs", href: "/audit-logs", labelKey: "modules.auditLogs", superAdminOnly: false, officeOnly: false, adminOnly: true },
  { key: "whatsapp", href: "/whatsapp", labelKey: "modules.whatsapp", superAdminOnly: false, officeOnly: false },
  { key: "boq_library", href: "/boq-library", labelKey: "modules.boqLibrary", superAdminOnly: false, officeOnly: false },
  { key: "notifications", href: "/notifications", labelKey: "modules.notifications", superAdminOnly: false, officeOnly: false },
  { key: "subscription", href: "/subscription", labelKey: "modules.subscription", superAdminOnly: false, officeOnly: true },
  { key: "plans", href: "/plans", labelKey: "nav.plans", superAdminOnly: true, officeOnly: false },
  { key: "offices", href: "/offices", labelKey: "nav.offices", superAdminOnly: true, officeOnly: false },
  { key: "credentials", href: "/admin/credentials", labelKey: "nav.credentials", superAdminOnly: true, officeOnly: false },
  { key: "pricing", href: "/pricing", labelKey: "modules.pricing", superAdminOnly: false, officeOnly: false },
];

export const OFFICE_CONTROLLED_MODULES = APP_MODULES.filter((module) => !module.superAdminOnly).map((module) => module.key);

export function getModuleByPath(path: string): AppModule | undefined {
  return APP_MODULES
    .filter((module) => path === module.href || path.startsWith(`${module.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function canAccessModule(path: string, enabledModules: string[], role?: string | null): boolean {
  const module = getModuleByPath(path);
  if (!module) return true;
  if (role === "super_admin") return true;
  if (module.superAdminOnly) return false;
  if (module.adminOnly && role !== "office_admin") return false;
  return enabledModules.includes(module.key);
}
