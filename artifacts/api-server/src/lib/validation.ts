import { z } from "zod/v4";
import { validationMessage } from "./validation-messages";

const trimString = (min = 1, max = 255) => z.string().trim().min(min).max(max);
const optionalText = (max = 2000) => z.string().trim().max(max).optional().nullable();
const optionalHttpUrl = z
  .preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value !== "string") return value;
    return value.trim();
  }, z.union([
    z.null(),
    z.string().url("رابط غير صالح").refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "يجب أن يبدأ الرابط بـ http أو https"),
  ]))
  .optional()
  .nullable();
const optionalBrandColor = z
  .preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value !== "string") return value;
    return value.trim();
  }, z.string().regex(/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/, "لون العلامة التجارية غير صالح").optional())
  .optional();
const optionalEmail = z
  .union([z.literal(""), z.email().max(150)])
  .optional()
  .nullable()
  .transform((value) => value || null);
const optionalDate = z
  .preprocess((value) => {
    if (value === "" || value === null) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString().slice(0, 10);
  }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, validationMessage("ar", "invalidDate")))
  .optional()
  .nullable();
const numeric = z.coerce.number().finite();
const optionalNumeric = numeric.optional().nullable();
const optionalInt = z.coerce.number().int().positive().optional().nullable();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const loginSchema = z.object({
  email: z.email(validationMessage("ar", "email")).max(150),
  password: z.string().min(1, validationMessage("ar", "passwordRequired")).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, validationMessage("ar", "currentPasswordRequired")).max(200),
  newPassword: z.string().min(8, validationMessage("ar", "newPasswordMin")).max(200),
});

export const resetPasswordSchema = z.object({
  email: z.email(validationMessage("ar", "email")).max(150),
});

export const createOfficeOnboardingSchema = z.object({
  office_name: trimString(1, 150),
  owner_name: trimString(1, 150),
  phone: z.string().trim().min(5, validationMessage("ar", "phoneRequired")).max(50),
  email: z.email(validationMessage("ar", "email")).max(150),
  password: z.string().min(8, validationMessage("ar", "passwordMin")).max(200),
  plan_id: z.coerce.number().int().positive(),
});

export const clientSchema = z.object({
  name: trimString(1, 150),
  phone: z.string().trim().max(50).optional().nullable(),
  email: optionalEmail,
  address: optionalText(1000),
  notes: optionalText(2000),
  officeId: optionalInt,
});

export const portalUserSchema = z.object({
  email: z.email(validationMessage("ar", "email")).max(150),
  password: z.string().min(8, validationMessage("ar", "passwordMin")).max(200),
});

export const projectSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  projectName: trimString(1, 200),
  designType: trimString(1, 100),
  areaMeters: optionalNumeric,
  pricePerMeter: optionalNumeric,
  projectStatus: z.string().trim().max(100).optional().default("جديد"),
  startDate: optionalDate,
  notes: optionalText(2000),
  officeId: optionalInt,
});

export const officeSchema = z.object({
  officeName: trimString(1, 150),
  ownerName: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  email: optionalEmail,
  address: optionalText(1000),
  planId: optionalInt,
  subscriptionStatus: z.enum(["trial", "active", "past_due", "cancelled", "inactive"]).optional().default("trial"),
  subscriptionStart: optionalDate,
  subscriptionEnd: optionalDate,
  logoUrl: optionalHttpUrl,
  darkLogoUrl: optionalHttpUrl,
  faviconUrl: optionalHttpUrl,
  brandColor: optionalBrandColor,
});

export const planSchema = z.object({
  nameAr: trimString(1, 100),
  nameEn: z.string().trim().max(100).optional().nullable(),
  descriptionAr: optionalText(2000),
  monthlyPrice: numeric.min(0),
  yearlyPrice: numeric.min(0),
  maxUsers: z.coerce.number().int().min(1),
  maxProjects: z.coerce.number().int().min(0),
  maxClients: z.coerce.number().int().min(0),
  storageLimitMb: z.coerce.number().int().min(0),
  hasClientPortal: z.coerce.boolean().optional().default(false),
  hasWhatsappNotifications: z.coerce.boolean().optional().default(false),
  hasPdfReports: z.coerce.boolean().optional().default(false),
  hasTeamRoles: z.coerce.boolean().optional().default(false),
  hasAdvancedEstimates: z.coerce.boolean().optional().default(false),
  isRecommended: z.coerce.boolean().optional().default(false),
  isActive: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const estimateSchema = z.object({
  phaseName: trimString(1, 100),
  itemName: trimString(1, 200),
  quantity: numeric.positive(),
  unit: z.string().trim().max(50).optional().nullable(),
  notes: optionalText(2000),
  categoryId: optionalInt,
  materialUnitCost: numeric.min(0).optional().default(0),
  laborUnitCost: numeric.min(0).optional().default(0),
  wastePercentage: numeric.min(0).max(100).optional().default(0),
  profitMargin: numeric.min(0).max(1000).optional().default(0),
});

export const stageUpdateSchema = z.object({
  status: z.string().trim().max(100).optional(),
  notes: optionalText(2000),
  clientFeedback: optionalText(2000),
});

export const taskSchema = z.object({
  title: trimString(1, 200),
  description: optionalText(2000),
  projectId: z.coerce.number().int().positive(),
  stageId: optionalInt,
  assignedTo: optionalInt,
  status: z.enum(["todo", "in_progress", "review", "done"]).optional().default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  dueDate: optionalDate,
});

export const taskUpdateSchema = taskSchema.partial().extend({
  title: z.string().trim().min(1).max(200).optional(),
});

export const taskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]),
});

export const invoiceSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  projectId: optionalInt,
  amount: numeric.positive(),
  status: z.string().trim().max(100).optional(),
  dueDate: optionalDate,
});

export const invoiceCreateSchema = z.object({
  invoiceNumber: z.string().trim().max(50).optional().nullable(),
  issueDate: optionalDate,
  dueDate: optionalDate,
  taxAmount: numeric.min(0).optional().default(0),
  discountAmount: numeric.min(0).optional().default(0),
  notes: optionalText(2000),
  status: z.enum(["draft", "sent"]).optional().default("draft"),
});

export const invoiceUpdateSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(50).optional(),
  issueDate: optionalDate,
  dueDate: optionalDate,
  taxAmount: numeric.min(0).optional(),
  discountAmount: numeric.min(0).optional(),
  notes: optionalText(2000),
});

export const invoiceStatusSchema = z.object({
  status: z.enum(["draft", "sent", "cancelled"]),
});

export const invoiceItemSchema = z.object({
  itemName: trimString(1, 200),
  description: optionalText(2000),
  quantity: numeric.positive(),
  unitPrice: numeric.min(0),
});

export const paymentSchema = z.object({
  amount: numeric.positive(),
  paymentDate: optionalDate,
  paymentMethod: z.string().trim().max(100).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notes: optionalText(2000),
});

export const whatsappMessageTypes = [
  "client_approval_request",
  "client_revision_update",
  "file_uploaded",
  "quotation_created",
  "invoice_created",
  "payment_reminder",
  "appointment_reminder",
  "general",
] as const;

export const whatsappTemplateSchema = z.object({
  officeId: optionalInt,
  templateKey: z.string().trim().min(1).max(100),
  nameAr: trimString(1, 200),
  messageBody: trimString(1, 5000),
  isActive: z.coerce.boolean().optional().default(true),
});

export const whatsappSendSchema = z.object({
  phone: z.string().trim().min(5).max(50),
  messageBody: trimString(1, 5000),
  messageType: z.enum(whatsappMessageTypes).default("general"),
  projectId: optionalInt,
  clientId: optionalInt,
  invoiceId: optionalInt,
});
