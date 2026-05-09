import type { TranslationKey } from "@/i18n/translations";

export const PROJECT_STATUSES = [
  { value: "جديد", labelKey: "project.status.new" },
  { value: "جاري", labelKey: "project.status.inProgress" },
  { value: "في انتظار موافقة العميل", labelKey: "project.status.waitingApproval" },
  { value: "يحتاج تعديل", labelKey: "project.status.needsRevision" },
  { value: "مكتمل", labelKey: "project.status.completed" },
] satisfies Array<{ value: string; labelKey: TranslationKey }>;

export const DESIGN_TYPES = [
  { value: "تصميم داخلي", labelKey: "project.design.interior" },
  { value: "تصميم معماري", labelKey: "project.design.architecture" },
  { value: "تصميم واجهات", labelKey: "project.design.facades" },
  { value: "تصميم وتنفيذ كامل", labelKey: "project.design.fullDesignBuild" },
  { value: "تشطيب كامل", labelKey: "project.design.fullFinishing" },
] satisfies Array<{ value: string; labelKey: TranslationKey }>;

export const DEFAULT_PROJECT_STATUS = PROJECT_STATUSES[0]!.value;
export const DEFAULT_DESIGN_TYPE = DESIGN_TYPES[0]!.value;
