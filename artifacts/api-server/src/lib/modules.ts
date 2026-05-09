export const ALL_APP_MODULES = [
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

export type AppModuleKey = typeof ALL_APP_MODULES[number];

export const SUPER_ADMIN_MODULES = ["plans", "offices", "credentials"] as const;

export const DEFAULT_OFFICE_MODULES: AppModuleKey[] = [
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
  "pricing",
];

const knownModules = new Set<string>(ALL_APP_MODULES);
const superAdminModules = new Set<string>(SUPER_ADMIN_MODULES);
const officeModules = new Set<string>(DEFAULT_OFFICE_MODULES);

export function normalizeOfficeModules(value: unknown): AppModuleKey[] {
  if (!Array.isArray(value)) return [...DEFAULT_OFFICE_MODULES];
  const unique = new Set<AppModuleKey>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    if (!officeModules.has(item)) continue;
    unique.add(item as AppModuleKey);
  }
  return unique.size > 0 ? [...unique] : [...DEFAULT_OFFICE_MODULES];
}

export function validateOfficeModules(value: unknown): { ok: true; modules: AppModuleKey[] } | { ok: false; invalid: string[] } {
  if (!Array.isArray(value)) return { ok: false, invalid: ["enabledModules"] };
  const invalid: string[] = [];
  const unique = new Set<AppModuleKey>();

  for (const item of value) {
    if (typeof item !== "string" || !knownModules.has(item) || superAdminModules.has(item) || !officeModules.has(item)) {
      invalid.push(String(item));
      continue;
    }
    unique.add(item as AppModuleKey);
  }

  if (invalid.length > 0) return { ok: false, invalid };
  return { ok: true, modules: [...unique] };
}
