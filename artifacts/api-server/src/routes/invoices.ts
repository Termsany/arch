import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientsTable,
  invoiceItemsTable,
  invoicesTable,
  officesTable,
  paymentsTable,
  projectDocumentsTable,
  projectsTable,
} from "@workspace/db";
import { and, count, desc, eq, lt, ne, sql, sum } from "drizzle-orm";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";
import { asyncHandler, fail, ok, validateBody } from "../lib/http";
import { createNotification } from "../lib/notifications";
import { invoiceCreateSchema, invoiceItemSchema, invoiceStatusSchema, invoiceUpdateSchema, paymentSchema } from "../lib/validation";
import { renderWhatsAppTemplateByKey, sendWhatsAppMessage } from "../lib/whatsapp";

const router = Router();

const viewRoles = new Set(["super_admin", "office_admin", "accountant", "project_manager"]);
const manageRoles = new Set(["super_admin", "office_admin", "accountant"]);
type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";

function parseId(value: string | string[] | undefined): number | null {
  const id = parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): string {
  return value.toFixed(2);
}

function hasViewAccess(user: AuthUser) {
  return viewRoles.has(user.role);
}

function hasManageAccess(user: AuthUser) {
  return manageRoles.has(user.role);
}

function hasOfficeAccess(user: AuthUser, officeId: number | null) {
  if (user.role === "super_admin") return true;
  return Boolean(user.officeId && officeId && user.officeId === officeId);
}

function statusFromTotals(current: InvoiceStatus, dueDate: string | null, total: number, paid: number): InvoiceStatus {
  if (current === "cancelled") return "cancelled";
  if (paid >= total && total > 0) return "paid";
  if (paid > 0 && paid < total) return "partially_paid";
  if (dueDate && dueDate < todayString() && paid < total) return "overdue";
  if (current === "draft") return "draft";
  return "sent";
}

async function getProjectContext(projectId: number) {
  const rows = await db
    .select({
      projectId: projectsTable.id,
      officeId: projectsTable.officeId,
      projectName: projectsTable.projectName,
      clientId: clientsTable.id,
      clientName: clientsTable.name,
      clientPhone: clientsTable.phone,
      officeName: officesTable.officeName,
      officePhone: officesTable.phone,
      officeEmail: officesTable.email,
    })
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .leftJoin(officesTable, eq(projectsTable.officeId, officesTable.id))
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

async function requireProjectAccess(projectId: number, user: AuthUser) {
  const context = await getProjectContext(projectId);
  if (!context) return { context: null, status: 404 as const, message: "المشروع غير موجود" };
  if (!hasOfficeAccess(user, context.officeId)) return { context: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا المشروع" };
  return { context, status: 200 as const, message: "" };
}

async function getInvoice(invoiceId: number) {
  const rows = await db
    .select({
      id: invoicesTable.id,
      officeId: invoicesTable.officeId,
      projectId: invoicesTable.projectId,
      clientId: invoicesTable.clientId,
      invoiceNumber: invoicesTable.invoiceNumber,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      subtotal: invoicesTable.subtotal,
      taxAmount: invoicesTable.taxAmount,
      discountAmount: invoicesTable.discountAmount,
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      status: invoicesTable.status,
      notes: invoicesTable.notes,
      createdBy: invoicesTable.createdBy,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
      projectName: projectsTable.projectName,
      clientName: clientsTable.name,
      clientPhone: clientsTable.phone,
      officeName: officesTable.officeName,
    })
    .from(invoicesTable)
    .leftJoin(projectsTable, eq(invoicesTable.projectId, projectsTable.id))
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .leftJoin(officesTable, eq(invoicesTable.officeId, officesTable.id))
    .where(eq(invoicesTable.id, invoiceId))
    .limit(1);
  const invoice = rows[0];
  if (!invoice) return null;
  return { ...invoice, remainingAmount: money(numberValue(invoice.totalAmount) - numberValue(invoice.paidAmount)) };
}

async function requireInvoiceAccess(invoiceId: number, user: AuthUser) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return { invoice: null, status: 404 as const, message: "الفاتورة غير موجودة" };
  if (!hasOfficeAccess(user, invoice.officeId)) return { invoice: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذه الفاتورة" };
  return { invoice, status: 200 as const, message: "" };
}

async function notifyOffice(invoice: { officeId: number; projectId: number; id: number; invoiceNumber: string }, title: string, message: string, type: string) {
  await createNotification({
    officeId: invoice.officeId,
    projectId: invoice.projectId,
    title,
    message,
    notificationType: type,
  });
}

async function recalculateInvoice(invoiceId: number) {
  const current = await getInvoice(invoiceId);
  if (!current) return null;
  const [itemsTotal] = await db
    .select({ total: sum(invoiceItemsTable.totalPrice) })
    .from(invoiceItemsTable)
    .where(eq(invoiceItemsTable.invoiceId, invoiceId));
  const [paymentsTotal] = await db
    .select({ total: sum(paymentsTable.amount) })
    .from(paymentsTable)
    .where(eq(paymentsTable.invoiceId, invoiceId));
  const subtotal = numberValue(itemsTotal?.total);
  const paid = numberValue(paymentsTotal?.total);
  const total = Math.max(0, subtotal + numberValue(current.taxAmount) - numberValue(current.discountAmount));
  const nextStatus = statusFromTotals(current.status as InvoiceStatus, current.dueDate, total, paid);
  const [updated] = await db
    .update(invoicesTable)
    .set({
      subtotal: money(subtotal),
      totalAmount: money(total),
      paidAmount: money(paid),
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(invoicesTable.id, invoiceId))
    .returning();
  if (updated && current.status !== "overdue" && nextStatus === "overdue") {
    await notifyOffice(updated, "فاتورة متأخرة", `أصبحت الفاتورة ${updated.invoiceNumber} متأخرة.`, "invoice_overdue");
  }
  return updated ? getInvoice(invoiceId) : null;
}

async function refreshVisibleInvoices(user: AuthUser) {
  const filters = [];
  if (user.role !== "super_admin") {
    if (!user.officeId) return;
    filters.push(eq(invoicesTable.officeId, user.officeId));
  }
  const rows = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(and(...filters, ne(invoicesTable.status, "cancelled"), ne(invoicesTable.status, "paid"), lt(invoicesTable.dueDate, todayString())));
  await Promise.all(rows.map((row) => recalculateInvoice(row.id)));
}

async function listInvoices(user: AuthUser, projectId?: number) {
  await refreshVisibleInvoices(user);
  const filters = [];
  if (user.role !== "super_admin") {
    if (!user.officeId) return [];
    filters.push(eq(invoicesTable.officeId, user.officeId));
  }
  if (projectId) filters.push(eq(invoicesTable.projectId, projectId));
  const rows = await db
    .select({
      id: invoicesTable.id,
      officeId: invoicesTable.officeId,
      projectId: invoicesTable.projectId,
      clientId: invoicesTable.clientId,
      invoiceNumber: invoicesTable.invoiceNumber,
      issueDate: invoicesTable.issueDate,
      dueDate: invoicesTable.dueDate,
      subtotal: invoicesTable.subtotal,
      taxAmount: invoicesTable.taxAmount,
      discountAmount: invoicesTable.discountAmount,
      totalAmount: invoicesTable.totalAmount,
      paidAmount: invoicesTable.paidAmount,
      status: invoicesTable.status,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
      projectName: projectsTable.projectName,
      clientName: clientsTable.name,
    })
    .from(invoicesTable)
    .leftJoin(projectsTable, eq(invoicesTable.projectId, projectsTable.id))
    .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoicesTable.createdAt));
  return rows.map((row) => ({ ...row, remainingAmount: money(numberValue(row.totalAmount) - numberValue(row.paidAmount)) }));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(value: unknown): string {
  return numberValue(value).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function documentShell(title: string, body: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>
    *{box-sizing:border-box} body{margin:0;background:#f3f4f6;color:#111827;font-family:Tahoma,Arial,sans-serif;direction:rtl}
    .document{width:210mm;min-height:297mm;margin:24px auto;padding:18mm;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.12)}
    .header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #111827;padding-bottom:18px;margin-bottom:22px}
    h1{margin:0 0 8px;font-size:28px}.office{font-size:22px;font-weight:700}.meta{text-align:left;color:#4b5563;line-height:1.8;font-size:13px}
    h2{margin:22px 0 10px;font-size:17px;border-bottom:1px solid #e5e7eb;padding-bottom:8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px}
    .field{color:#4b5563;line-height:1.7}.field strong{display:inline-block;min-width:120px;color:#111827}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}th,td{border:1px solid #d1d5db;padding:9px 10px;vertical-align:top;text-align:right}th{background:#f3f4f6;font-weight:700}
    .number{direction:ltr;text-align:left;white-space:nowrap}.totals{margin-top:18px;margin-right:auto;width:320px;border:2px solid #111827;padding:12px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:18px;font-weight:700;border-top:1px solid #111827;margin-top:6px;padding-top:10px}
    @page{size:A4;margin:12mm}@media print{body{background:#fff}.document{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}}
  </style></head><body><main class="document">${body}</main></body></html>`;
}

async function buildInvoiceHtml(invoiceId: number) {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) return null;
  const [items, payments] = await Promise.all([
    db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, invoiceId)).orderBy(invoiceItemsTable.id),
    db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, invoiceId)).orderBy(paymentsTable.paymentDate),
  ]);
  const itemRows = items.map((item, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(item.itemName)}</td><td>${escapeHtml(item.description || "")}</td><td class="number">${escapeHtml(item.quantity)}</td><td class="number">${formatMoney(item.unitPrice)}</td><td class="number">${formatMoney(item.totalPrice)}</td></tr>`).join("");
  const paymentRows = payments.map((payment) => `<tr><td>${escapeHtml(payment.paymentDate)}</td><td>${escapeHtml(payment.paymentMethod || "-")}</td><td>${escapeHtml(payment.referenceNumber || "-")}</td><td class="number">${formatMoney(payment.amount)}</td></tr>`).join("");
  return {
    invoice,
    html: documentShell(`فاتورة ${invoice.invoiceNumber}`, `
      <section class="header"><div><div class="office">${escapeHtml(invoice.officeName || "مكتب التصميم")}</div></div><div class="meta"><h1>فاتورة</h1><div><strong>رقم الفاتورة:</strong> ${escapeHtml(invoice.invoiceNumber)}</div><div><strong>تاريخ الإصدار:</strong> ${escapeHtml(invoice.issueDate)}</div><div><strong>تاريخ الاستحقاق:</strong> ${escapeHtml(invoice.dueDate || "-")}</div></div></section>
      <h2>بيانات العميل والمشروع</h2><div class="grid"><div class="field"><strong>العميل:</strong> ${escapeHtml(invoice.clientName)}</div><div class="field"><strong>المشروع:</strong> ${escapeHtml(invoice.projectName)}</div></div>
      <h2>البنود</h2><table><thead><tr><th>#</th><th>البند</th><th>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${itemRows || `<tr><td colspan="6">لا توجد بنود</td></tr>`}</tbody></table>
      <div class="totals"><div><span>الإجمالي قبل الضريبة</span><span class="number">${formatMoney(invoice.subtotal)}</span></div><div><span>الضريبة</span><span class="number">${formatMoney(invoice.taxAmount)}</span></div><div><span>الخصم</span><span class="number">${formatMoney(invoice.discountAmount)}</span></div><div class="grand"><span>إجمالي الفاتورة</span><span class="number">${formatMoney(invoice.totalAmount)}</span></div><div><span>المدفوع</span><span class="number">${formatMoney(invoice.paidAmount)}</span></div><div><span>المتبقي</span><span class="number">${formatMoney(invoice.remainingAmount)}</span></div></div>
      <h2>المدفوعات</h2><table><thead><tr><th>تاريخ الدفعة</th><th>طريقة الدفع</th><th>رقم المرجع</th><th>مبلغ الدفعة</th></tr></thead><tbody>${paymentRows || `<tr><td colspan="4">لا توجد مدفوعات</td></tr>`}</tbody></table>
      ${invoice.notes ? `<h2>ملاحظات</h2><div>${escapeHtml(invoice.notes)}</div>` : ""}
    `),
  };
}

router.use(authMiddleware);

router.get("/invoices", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية الوصول للفواتير");
  ok(res, await listInvoices(user));
}));

router.get("/projects/:id/invoices", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية الوصول للفواتير");
  const projectId = parseId(req.params["id"]);
  if (!projectId) return fail(res, 400, "معرف المشروع غير صحيح");
  const access = await requireProjectAccess(projectId, user);
  if (!access.context) return fail(res, access.status, access.message);
  ok(res, await listInvoices(user, projectId));
}));

router.get("/invoices/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية الوصول للفواتير");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  await recalculateInvoice(id);
  const invoice = await getInvoice(id);
  const [items, payments] = await Promise.all([
    db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id)).orderBy(invoiceItemsTable.id),
    db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, id)).orderBy(desc(paymentsTable.paymentDate)),
  ]);
  ok(res, { ...invoice, items, payments });
}));

router.post("/projects/:id/invoices", validateBody(invoiceCreateSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية إنشاء فاتورة");
  const projectId = parseId(req.params["id"]);
  if (!projectId) return fail(res, 400, "معرف المشروع غير صحيح");
  const access = await requireProjectAccess(projectId, user);
  if (!access.context) return fail(res, access.status, access.message);
  if (!access.context.officeId) return fail(res, 400, "لا يوجد مكتب مرتبط بهذا المشروع");
  const body = req.body as { invoiceNumber?: string | null; issueDate?: string | null; dueDate?: string | null; taxAmount: number; discountAmount: number; notes?: string | null; status: "draft" | "sent" };
  const [counter] = await db.select({ total: count() }).from(invoicesTable).where(eq(invoicesTable.officeId, access.context.officeId));
  const invoiceNumber = body.invoiceNumber || `INV-${String(access.context.officeId).padStart(3, "0")}-${String(Number(counter?.total ?? 0) + 1).padStart(5, "0")}`;
  const [invoice] = await db.insert(invoicesTable).values({
    officeId: access.context.officeId,
    projectId,
    clientId: access.context.clientId,
    invoiceNumber,
    issueDate: body.issueDate || todayString(),
    dueDate: body.dueDate ?? null,
    taxAmount: money(numberValue(body.taxAmount)),
    discountAmount: money(numberValue(body.discountAmount)),
    status: body.status,
    notes: body.notes ?? null,
    createdBy: user.id,
  }).returning();
  await notifyOffice(invoice!, "فاتورة جديدة", `تم إنشاء الفاتورة ${invoice!.invoiceNumber}.`, "invoice_created");
  if (access.context.clientPhone) {
    const totalAmount = Number(invoice!.totalAmount ?? 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const messageBody = await renderWhatsAppTemplateByKey(access.context.officeId, "invoice_created", {
      client_name: access.context.clientName,
      project_name: access.context.projectName,
      total_amount: totalAmount,
    });
    if (messageBody) {
      await sendWhatsAppMessage({
        officeId: access.context.officeId,
        phone: access.context.clientPhone,
        messageBody,
        messageType: "invoice_created",
        projectId,
        clientId: access.context.clientId,
        invoiceId: invoice!.id,
        sentBy: user.id,
      });
    }
  }
  ok(res, await recalculateInvoice(invoice!.id), 201, "تم إنشاء الفاتورة");
}));

router.put("/invoices/:id", validateBody(invoiceUpdateSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية تعديل الفاتورة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const body = req.body as Partial<{ invoiceNumber: string; issueDate: string | null; dueDate: string | null; taxAmount: number; discountAmount: number; notes: string | null }>;
  await db.update(invoicesTable).set({
    invoiceNumber: body.invoiceNumber ?? access.invoice.invoiceNumber,
    issueDate: body.issueDate !== undefined ? body.issueDate || todayString() : access.invoice.issueDate,
    dueDate: body.dueDate !== undefined ? body.dueDate : access.invoice.dueDate,
    taxAmount: body.taxAmount !== undefined ? money(numberValue(body.taxAmount)) : access.invoice.taxAmount,
    discountAmount: body.discountAmount !== undefined ? money(numberValue(body.discountAmount)) : access.invoice.discountAmount,
    notes: body.notes !== undefined ? body.notes : access.invoice.notes,
    updatedAt: new Date(),
  }).where(eq(invoicesTable.id, id));
  ok(res, await recalculateInvoice(id), 200, "تم تحديث الفاتورة");
}));

router.patch("/invoices/:id/status", validateBody(invoiceStatusSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية تعديل حالة الفاتورة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const { status } = req.body as { status: "draft" | "sent" | "cancelled" };
  await db.update(invoicesTable).set({ status, updatedAt: new Date() }).where(eq(invoicesTable.id, id));
  ok(res, await recalculateInvoice(id), 200, "تم تحديث حالة الفاتورة");
}));

router.delete("/invoices/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية حذف الفاتورة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
  ok(res, { id }, 200, "تم حذف الفاتورة");
}));

router.post("/invoices/:id/items", validateBody(invoiceItemSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية تعديل بنود الفاتورة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const body = req.body as { itemName: string; description?: string | null; quantity: number; unitPrice: number };
  const totalPrice = numberValue(body.quantity) * numberValue(body.unitPrice);
  await db.insert(invoiceItemsTable).values({
    invoiceId: id,
    itemName: body.itemName,
    description: body.description ?? null,
    quantity: money(numberValue(body.quantity)),
    unitPrice: money(numberValue(body.unitPrice)),
    totalPrice: money(totalPrice),
  });
  ok(res, await recalculateInvoice(id), 201, "تم إضافة البند");
}));

router.put("/invoice-items/:itemId", validateBody(invoiceItemSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية تعديل بنود الفاتورة");
  const itemId = parseId(req.params["itemId"]);
  if (!itemId) return fail(res, 400, "معرف البند غير صحيح");
  const rows = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.id, itemId)).limit(1);
  const item = rows[0];
  if (!item) return fail(res, 404, "البند غير موجود");
  const access = await requireInvoiceAccess(item.invoiceId, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const body = req.body as { itemName: string; description?: string | null; quantity: number; unitPrice: number };
  await db.update(invoiceItemsTable).set({
    itemName: body.itemName,
    description: body.description ?? null,
    quantity: money(numberValue(body.quantity)),
    unitPrice: money(numberValue(body.unitPrice)),
    totalPrice: money(numberValue(body.quantity) * numberValue(body.unitPrice)),
    updatedAt: new Date(),
  }).where(eq(invoiceItemsTable.id, itemId));
  ok(res, await recalculateInvoice(item.invoiceId), 200, "تم تحديث البند");
}));

router.delete("/invoice-items/:itemId", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية حذف بنود الفاتورة");
  const itemId = parseId(req.params["itemId"]);
  if (!itemId) return fail(res, 400, "معرف البند غير صحيح");
  const rows = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.id, itemId)).limit(1);
  const item = rows[0];
  if (!item) return fail(res, 404, "البند غير موجود");
  const access = await requireInvoiceAccess(item.invoiceId, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.id, itemId));
  ok(res, await recalculateInvoice(item.invoiceId), 200, "تم حذف البند");
}));

router.get("/invoices/:id/payments", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية الوصول للمدفوعات");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  ok(res, await db.select().from(paymentsTable).where(eq(paymentsTable.invoiceId, id)).orderBy(desc(paymentsTable.paymentDate)));
}));

router.post("/invoices/:id/payments", validateBody(paymentSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية تسجيل دفعة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const body = req.body as { amount: number; paymentDate?: string | null; paymentMethod?: string | null; referenceNumber?: string | null; notes?: string | null };
  await db.insert(paymentsTable).values({
    officeId: access.invoice.officeId,
    invoiceId: id,
    projectId: access.invoice.projectId,
    clientId: access.invoice.clientId,
    amount: money(numberValue(body.amount)),
    paymentDate: body.paymentDate || todayString(),
    paymentMethod: body.paymentMethod ?? null,
    referenceNumber: body.referenceNumber ?? null,
    notes: body.notes ?? null,
    createdBy: user.id,
  });
  await notifyOffice(access.invoice, "تم تسجيل دفعة", `تم تسجيل دفعة على الفاتورة ${access.invoice.invoiceNumber}.`, "payment_recorded");
  ok(res, await recalculateInvoice(id), 201, "تم تسجيل الدفعة");
}));

router.delete("/payments/:id", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasManageAccess(user)) return fail(res, 403, "ليس لديك صلاحية حذف الدفعة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الدفعة غير صحيح");
  const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id)).limit(1);
  const payment = rows[0];
  if (!payment) return fail(res, 404, "الدفعة غير موجودة");
  const access = await requireInvoiceAccess(payment.invoiceId, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  ok(res, await recalculateInvoice(payment.invoiceId), 200, "تم حذف الدفعة");
}));

router.post("/invoices/:id/document", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية طباعة الفاتورة");
  const id = parseId(req.params["id"]);
  if (!id) return fail(res, 400, "معرف الفاتورة غير صحيح");
  const access = await requireInvoiceAccess(id, user);
  if (!access.invoice) return fail(res, access.status, access.message);
  const built = await buildInvoiceHtml(id);
  if (!built) return fail(res, 404, "الفاتورة غير موجودة");
  const [document] = await db.insert(projectDocumentsTable).values({
    officeId: built.invoice.officeId,
    projectId: built.invoice.projectId,
    documentType: "invoice",
    title: `فاتورة ${built.invoice.invoiceNumber}`,
    htmlContent: built.html,
    createdBy: user.id,
  }).returning();
  ok(res, document, 201, "تم إنشاء مستند الفاتورة");
}));

router.get("/dashboard/finance-stats", asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!hasViewAccess(user)) return fail(res, 403, "ليس لديك صلاحية الوصول للبيانات المالية");
  await refreshVisibleInvoices(user);
  const filters = [];
  if (user.role !== "super_admin") {
    if (!user.officeId) return ok(res, { totalInvoices: 0, totalPaid: 0, totalDue: 0, overdueInvoices: 0 });
    filters.push(eq(invoicesTable.officeId, user.officeId));
  }
  const [totals] = await db.select({
    totalInvoices: sum(invoicesTable.totalAmount),
    totalPaid: sum(invoicesTable.paidAmount),
  }).from(invoicesTable).where(filters.length ? and(...filters) : undefined);
  const [overdue] = await db.select({ total: count() }).from(invoicesTable).where(and(...filters, eq(invoicesTable.status, "overdue")));
  const totalInvoices = numberValue(totals?.totalInvoices);
  const totalPaid = numberValue(totals?.totalPaid);
  ok(res, {
    totalInvoices,
    totalPaid,
    totalDue: Math.max(0, totalInvoices - totalPaid),
    overdueInvoices: Number(overdue?.total ?? 0),
  });
}));

export default router;
