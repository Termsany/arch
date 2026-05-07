import { Router } from "express";
import { db, clientsTable, invoicesTable, projectsTable } from "@workspace/db";
import { whatsappMessagesTable, whatsappTemplatesTable } from "@workspace/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";
import { asyncHandler, fail, ok, validateBody } from "../lib/http";
import { normalizePhoneNumber, sendWhatsAppMessage, WHATSAPP_MESSAGE_TYPES } from "../lib/whatsapp";
import { whatsappSendSchema, whatsappTemplateSchema } from "../lib/validation";
import { logAudit } from "../lib/audit";

const router = Router();

const manageTemplateRoles = new Set(["super_admin", "office_admin"]);
const sendRoles = new Set(["super_admin", "office_admin", "project_manager", "accountant"]);

function parseId(value: string | string[] | undefined): number | null {
  const id = parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function canManageTemplates(user: AuthUser) {
  return manageTemplateRoles.has(user.role);
}

function canSend(user: AuthUser, messageType?: string) {
  if (!sendRoles.has(user.role)) return false;
  if (user.role === "accountant") return ["invoice_created", "payment_reminder", "general"].includes(messageType || "general");
  return true;
}

function scopedOfficeId(user: AuthUser, requested?: number | null) {
  if (user.role === "super_admin") return requested ?? null;
  return user.officeId ?? null;
}

async function ensureOfficeContext(user: AuthUser, input: { projectId?: number | null; clientId?: number | null; invoiceId?: number | null }) {
  if (input.invoiceId) {
    const rows = await db.select({ officeId: invoicesTable.officeId, projectId: invoicesTable.projectId, clientId: invoicesTable.clientId }).from(invoicesTable).where(eq(invoicesTable.id, input.invoiceId)).limit(1);
    const invoice = rows[0];
    if (!invoice) return { officeId: null, status: 404 as const, message: "الفاتورة غير موجودة" };
    if (user.role !== "super_admin" && invoice.officeId !== user.officeId) return { officeId: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذه الفاتورة" };
    return { officeId: invoice.officeId, projectId: invoice.projectId, clientId: invoice.clientId, status: 200 as const, message: "" };
  }
  if (input.projectId) {
    const rows = await db.select({ officeId: projectsTable.officeId, clientId: projectsTable.clientId }).from(projectsTable).where(eq(projectsTable.id, input.projectId)).limit(1);
    const project = rows[0];
    if (!project?.officeId) return { officeId: null, status: 404 as const, message: "المشروع غير موجود" };
    if (user.role !== "super_admin" && project.officeId !== user.officeId) return { officeId: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا المشروع" };
    return { officeId: project.officeId, projectId: input.projectId, clientId: input.clientId ?? project.clientId, status: 200 as const, message: "" };
  }
  if (input.clientId) {
    const rows = await db.select({ officeId: clientsTable.officeId }).from(clientsTable).where(eq(clientsTable.id, input.clientId)).limit(1);
    const client = rows[0];
    if (!client?.officeId) return { officeId: null, status: 404 as const, message: "العميل غير موجود" };
    if (user.role !== "super_admin" && client.officeId !== user.officeId) return { officeId: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا العميل" };
    return { officeId: client.officeId, clientId: input.clientId, status: 200 as const, message: "" };
  }
  if (!user.officeId && user.role !== "super_admin") return { officeId: null, status: 403 as const, message: "لا يوجد مكتب مرتبط بالمستخدم" };
  return { officeId: user.officeId ?? 1, status: 200 as const, message: "" };
}

router.use(authMiddleware);

router.get("/whatsapp/status", asyncHandler(async (_req, res) => {
  ok(res, {
    enabled: process.env["WHATSAPP_ENABLED"] === "true",
    provider: process.env["WHATSAPP_PROVIDER"] || "simulation",
    simulationMode: process.env["WHATSAPP_ENABLED"] !== "true" || (process.env["WHATSAPP_PROVIDER"] || "simulation") === "simulation",
  });
}));

router.get("/whatsapp/templates", asyncHandler(async (req, res) => {
  const user = getUser(req);
  const rows = await db
    .select()
    .from(whatsappTemplatesTable)
    .where(user.role === "super_admin" ? undefined : or(eq(whatsappTemplatesTable.officeId, user.officeId!), isNull(whatsappTemplatesTable.officeId)))
    .orderBy(desc(whatsappTemplatesTable.createdAt));
  ok(res, rows);
}));

router.get("/whatsapp/templates/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف القالب غير صحيح");
  const rows = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id)).limit(1);
  const template = rows[0];
  if (!template) return fail(res, 404, "القالب غير موجود");
  if (user.role !== "super_admin" && template.officeId !== user.officeId && template.officeId !== null) return fail(res, 403, "ليس لديك صلاحية الوصول لهذا القالب");
  ok(res, template);
}));

router.post("/whatsapp/templates", validateBody(whatsappTemplateSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canManageTemplates(user)) return fail(res, 403, "ليس لديك صلاحية إدارة قوالب واتساب");
  const body = req.body as { officeId?: number | null; templateKey: string; nameAr: string; messageBody: string; isActive: boolean };
  const officeId = scopedOfficeId(user, body.officeId);
  const existing = await db
    .select({ id: whatsappTemplatesTable.id })
    .from(whatsappTemplatesTable)
    .where(and(officeId ? eq(whatsappTemplatesTable.officeId, officeId) : isNull(whatsappTemplatesTable.officeId), eq(whatsappTemplatesTable.templateKey, body.templateKey)))
    .limit(1);
  if (existing[0]) return fail(res, 409, "مفتاح القالب موجود بالفعل");
  const [template] = await db.insert(whatsappTemplatesTable).values({ officeId, templateKey: body.templateKey, nameAr: body.nameAr, messageBody: body.messageBody, isActive: body.isActive }).returning();
  ok(res, template, 201, "تم إنشاء القالب");
}));

router.put("/whatsapp/templates/:id", validateBody(whatsappTemplateSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canManageTemplates(user)) return fail(res, 403, "ليس لديك صلاحية إدارة قوالب واتساب");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف القالب غير صحيح");
  const rows = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id)).limit(1);
  const template = rows[0];
  if (!template) return fail(res, 404, "القالب غير موجود");
  if (user.role !== "super_admin" && template.officeId !== user.officeId) return fail(res, 403, "ليس لديك صلاحية تعديل هذا القالب");
  const body = req.body as { templateKey: string; nameAr: string; messageBody: string; isActive: boolean };
  const [updated] = await db.update(whatsappTemplatesTable).set({ templateKey: body.templateKey, nameAr: body.nameAr, messageBody: body.messageBody, isActive: body.isActive, updatedAt: new Date() }).where(eq(whatsappTemplatesTable.id, id)).returning();
  ok(res, updated, 200, "تم تحديث القالب");
}));

router.patch("/whatsapp/templates/:id/toggle-active", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canManageTemplates(user)) return fail(res, 403, "ليس لديك صلاحية إدارة قوالب واتساب");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف القالب غير صحيح");
  const rows = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id)).limit(1);
  const template = rows[0];
  if (!template) return fail(res, 404, "القالب غير موجود");
  if (user.role !== "super_admin" && template.officeId !== user.officeId) return fail(res, 403, "ليس لديك صلاحية تعديل هذا القالب");
  const [updated] = await db.update(whatsappTemplatesTable).set({ isActive: !template.isActive, updatedAt: new Date() }).where(eq(whatsappTemplatesTable.id, id)).returning();
  ok(res, updated, 200, "تم تحديث حالة القالب");
}));

router.delete("/whatsapp/templates/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canManageTemplates(user)) return fail(res, 403, "ليس لديك صلاحية إدارة قوالب واتساب");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف القالب غير صحيح");
  const rows = await db.select().from(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id)).limit(1);
  const template = rows[0];
  if (!template) return fail(res, 404, "القالب غير موجود");
  if (user.role !== "super_admin" && template.officeId !== user.officeId) return fail(res, 403, "ليس لديك صلاحية حذف هذا القالب");
  await db.delete(whatsappTemplatesTable).where(eq(whatsappTemplatesTable.id, id));
  ok(res, { id }, 200, "تم حذف القالب");
}));

router.get("/whatsapp/messages", asyncHandler(async (req, res) => {
  const user = getUser(req);
  const status = String(req.query["status"] ?? "");
  const messageType = String(req.query["message_type"] ?? "");
  const filters = [];
  if (user.role !== "super_admin") filters.push(eq(whatsappMessagesTable.officeId, user.officeId!));
  if (status) filters.push(eq(whatsappMessagesTable.status, status as "pending" | "sent" | "failed" | "simulated"));
  if (messageType) filters.push(eq(whatsappMessagesTable.messageType, messageType));
  const rows = await db.select().from(whatsappMessagesTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(whatsappMessagesTable.createdAt)).limit(100);
  ok(res, rows);
}));

router.get("/whatsapp/messages/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الرسالة غير صحيح");
  const rows = await db.select().from(whatsappMessagesTable).where(eq(whatsappMessagesTable.id, id)).limit(1);
  const message = rows[0];
  if (!message) return fail(res, 404, "الرسالة غير موجودة");
  if (user.role !== "super_admin" && message.officeId !== user.officeId) return fail(res, 403, "ليس لديك صلاحية الوصول لهذه الرسالة");
  ok(res, message);
}));

router.post("/whatsapp/send", validateBody(whatsappSendSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const body = req.body as { phone: string; messageBody: string; messageType: typeof WHATSAPP_MESSAGE_TYPES[number]; projectId?: number | null; clientId?: number | null; invoiceId?: number | null };
  if (!canSend(user, body.messageType)) return fail(res, 403, "ليس لديك صلاحية إرسال رسائل واتساب");
  const context = await ensureOfficeContext(user, body);
  if (!context.officeId) return fail(res, context.status, context.message);
  const message = await sendWhatsAppMessage({
    officeId: context.officeId,
    phone: normalizePhoneNumber(body.phone),
    messageBody: body.messageBody,
    messageType: body.messageType,
    projectId: body.projectId ?? context.projectId ?? null,
    clientId: body.clientId ?? context.clientId ?? null,
    invoiceId: body.invoiceId ?? null,
    sentBy: user.id,
  });
  await logAudit({
    office_id: context.officeId,
    user_id: user.id,
    action: "whatsapp.send",
    entity_type: "whatsapp_message",
    entity_id: message?.id ?? null,
    new_value: message ?? { phone: body.phone, messageType: body.messageType },
    req,
  });
  ok(res, message, 201, "تم تسجيل رسالة واتساب");
}));

export default router;
