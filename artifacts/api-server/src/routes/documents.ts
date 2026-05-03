import { Router } from "express";
import { db } from "@workspace/db";
import {
  boqCategoriesTable,
  clientFeedbackTable,
  clientsTable,
  officesTable,
  projectDocumentsTable,
  projectEstimatesTable,
  projectFilesTable,
  projectStagesTable,
  projectsTable,
  stageApprovalsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";
import { requireActiveSubscription } from "../lib/subscription";
import { createNotification } from "../lib/notifications";

const router = Router();

const quotationRoles = new Set(["super_admin", "office_admin", "project_manager", "accountant"]);
const reportRoles = new Set(["super_admin", "office_admin", "project_manager"]);
const manageDocumentRoles = new Set(["super_admin", "office_admin", "project_manager", "accountant"]);

function parseId(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
}

function isValidId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown): string {
  return amount(value).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date | string = new Date()): string {
  return new Date(value).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function getProjectContext(projectId: number) {
  const rows = await db
    .select({
      projectId: projectsTable.id,
      officeId: projectsTable.officeId,
      projectName: projectsTable.projectName,
      designType: projectsTable.designType,
      areaMeters: projectsTable.areaMeters,
      projectStatus: projectsTable.projectStatus,
      projectNotes: projectsTable.notes,
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

function hasOfficeAccess(user: AuthUser, officeId: number | null): boolean {
  if (user.role === "super_admin") return true;
  return Boolean(user.officeId && officeId && user.officeId === officeId);
}

async function requireProjectAccess(projectId: number, user: AuthUser) {
  if (!isValidId(projectId)) {
    return { context: null, status: 400 as const, message: "معرّف المشروع غير صحيح" };
  }
  const context = await getProjectContext(projectId);
  if (!context) return { context: null, status: 404 as const, message: "المشروع غير موجود" };
  if (!hasOfficeAccess(user, context.officeId)) {
    return { context: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا المشروع" };
  }
  return { context, status: 200 as const, message: "" };
}

async function canGeneratePrintableDocument(user: AuthUser, officeId: number): Promise<{ allowed: boolean; message?: string }> {
  if (user.role === "super_admin") return { allowed: true };

  try {
    const subscription = await requireActiveSubscription(officeId);
    if (!subscription.hasPdfReports) {
      return { allowed: false, message: "ميزة التقارير والمستندات غير متاحة في الخطة الحالية" };
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: false, message: err instanceof Error ? err.message : "الاشتراك غير نشط" };
  }
}

async function getEstimateItems(projectId: number) {
  return db
    .select({
      id: projectEstimatesTable.id,
      categoryName: boqCategoriesTable.name,
      phaseName: projectEstimatesTable.phaseName,
      itemName: projectEstimatesTable.itemName,
      quantity: projectEstimatesTable.quantity,
      unit: projectEstimatesTable.unit,
      unitPrice: projectEstimatesTable.unitPrice,
      totalPrice: projectEstimatesTable.totalPrice,
      notes: projectEstimatesTable.notes,
    })
    .from(projectEstimatesTable)
    .leftJoin(boqCategoriesTable, eq(projectEstimatesTable.categoryId, boqCategoriesTable.id))
    .where(eq(projectEstimatesTable.projectId, projectId))
    .orderBy(projectEstimatesTable.createdAt);
}

function documentShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f3f4f6; color: #111827; font-family: Tahoma, Arial, sans-serif; direction: rtl; }
    .document { width: 210mm; min-height: 297mm; margin: 24px auto; padding: 18mm; background: #fff; box-shadow: 0 10px 30px rgba(15,23,42,.12); }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 18px; margin-bottom: 22px; }
    .office { font-size: 22px; font-weight: 700; }
    .meta { text-align: left; color: #4b5563; line-height: 1.8; font-size: 13px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 22px 0 10px; font-size: 17px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; }
    .field { color: #4b5563; line-height: 1.7; }
    .field strong { display: inline-block; min-width: 120px; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #d1d5db; padding: 9px 10px; vertical-align: top; text-align: right; }
    th { background: #f3f4f6; font-weight: 700; }
    .number { direction: ltr; text-align: left; white-space: nowrap; }
    .total { margin-top: 18px; display: flex; justify-content: flex-start; }
    .total-box { min-width: 260px; border: 2px solid #111827; padding: 14px 16px; font-size: 18px; font-weight: 700; display: flex; justify-content: space-between; gap: 20px; }
    .empty { border: 1px dashed #d1d5db; padding: 18px; color: #6b7280; text-align: center; margin-top: 10px; }
    .notes { white-space: pre-wrap; line-height: 1.8; color: #374151; }
    @page { size: A4; margin: 12mm; }
    @media print {
      body { background: #fff; }
      .document { width: auto; min-height: auto; margin: 0; padding: 0; box-shadow: none; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <main class="document">${body}</main>
</body>
</html>`;
}

function quotationHtml(context: NonNullable<Awaited<ReturnType<typeof getProjectContext>>>, items: Awaited<ReturnType<typeof getEstimateItems>>) {
  const total = items.reduce((sum, item) => sum + amount(item.totalPrice), 0);
  const rows = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.categoryName || item.phaseName)}</td>
      <td>${escapeHtml(item.itemName)}</td>
      <td class="number">${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(item.unit || "-")}</td>
      <td class="number">${formatMoney(item.unitPrice)}</td>
      <td class="number">${formatMoney(item.totalPrice)}</td>
      <td>${escapeHtml(item.notes || "")}</td>
    </tr>
  `).join("");

  return documentShell("عرض سعر", `
    <section class="header">
      <div>
        <div class="office">${escapeHtml(context.officeName || "مكتب التصميم")}</div>
        <div class="field">${escapeHtml(context.officePhone || "")}</div>
        <div class="field">${escapeHtml(context.officeEmail || "")}</div>
      </div>
      <div class="meta">
        <h1>عرض سعر</h1>
        <div><strong>تاريخ الإنشاء:</strong> ${formatDate()}</div>
      </div>
    </section>

    <h2>بيانات العميل</h2>
    <div class="grid">
      <div class="field"><strong>اسم العميل:</strong> ${escapeHtml(context.clientName)}</div>
      <div class="field"><strong>رقم الهاتف:</strong> ${escapeHtml(context.clientPhone || "-")}</div>
    </div>

    <h2>بيانات المشروع</h2>
    <div class="grid">
      <div class="field"><strong>اسم المشروع:</strong> ${escapeHtml(context.projectName)}</div>
      <div class="field"><strong>نوع التصميم:</strong> ${escapeHtml(context.designType)}</div>
      <div class="field"><strong>المساحة:</strong> ${escapeHtml(context.areaMeters || "-")} م²</div>
      <div class="field"><strong>الحالة:</strong> ${escapeHtml(context.projectStatus)}</div>
    </div>

    <h2>البنود</h2>
    ${items.length ? `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>التصنيف</th>
            <th>البند</th>
            <th>الكمية</th>
            <th>الوحدة</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    ` : `<div class="empty">لا توجد بنود مقايسة بعد. يمكن طباعة العرض لاحقًا بعد إضافة البنود.</div>`}

    <div class="total">
      <div class="total-box">
        <span>إجمالي العرض</span>
        <span class="number">${formatMoney(total)} ر.س</span>
      </div>
    </div>

    ${context.projectNotes ? `<h2>ملاحظات</h2><div class="notes">${escapeHtml(context.projectNotes)}</div>` : ""}
  `);
}

async function projectReportHtml(context: NonNullable<Awaited<ReturnType<typeof getProjectContext>>>) {
  const [stages, feedbacks, approvals, files, items] = await Promise.all([
    db.select().from(projectStagesTable).where(eq(projectStagesTable.projectId, context.projectId)).orderBy(projectStagesTable.stageOrder),
    db
      .select({
        feedbackText: clientFeedbackTable.feedbackText,
        feedbackType: clientFeedbackTable.feedbackType,
        createdAt: clientFeedbackTable.createdAt,
        stageName: projectStagesTable.stageName,
      })
      .from(clientFeedbackTable)
      .leftJoin(projectStagesTable, eq(clientFeedbackTable.stageId, projectStagesTable.id))
      .where(eq(clientFeedbackTable.projectId, context.projectId))
      .orderBy(desc(clientFeedbackTable.createdAt))
      .limit(5),
    db
      .select({
        approvalStatus: stageApprovalsTable.approvalStatus,
        comment: stageApprovalsTable.comment,
        stageName: projectStagesTable.stageName,
      })
      .from(stageApprovalsTable)
      .leftJoin(projectStagesTable, eq(stageApprovalsTable.stageId, projectStagesTable.id))
      .where(and(eq(stageApprovalsTable.projectId, context.projectId), eq(stageApprovalsTable.approvalStatus, "pending"))),
    db.select().from(projectFilesTable).where(eq(projectFilesTable.projectId, context.projectId)),
    getEstimateItems(context.projectId),
  ]);
  const boqTotal = items.reduce((sum, item) => sum + amount(item.totalPrice), 0);
  const clientVisibleFiles = files.filter((file) => file.visibility === "client_visible").length;
  const approvedFiles = files.filter((file) => file.isApprovedVersion).length;

  return documentShell("تقرير حالة المشروع", `
    <section class="header">
      <div>
        <div class="office">${escapeHtml(context.officeName || "مكتب التصميم")}</div>
        <div class="field">${escapeHtml(context.officePhone || "")}</div>
        <div class="field">${escapeHtml(context.officeEmail || "")}</div>
      </div>
      <div class="meta">
        <h1>تقرير حالة المشروع</h1>
        <div><strong>تاريخ الإنشاء:</strong> ${formatDate()}</div>
      </div>
    </section>

    <h2>بيانات المشروع</h2>
    <div class="grid">
      <div class="field"><strong>اسم العميل:</strong> ${escapeHtml(context.clientName)}</div>
      <div class="field"><strong>اسم المشروع:</strong> ${escapeHtml(context.projectName)}</div>
      <div class="field"><strong>نوع التصميم:</strong> ${escapeHtml(context.designType)}</div>
      <div class="field"><strong>حالة المشروع:</strong> ${escapeHtml(context.projectStatus)}</div>
      <div class="field"><strong>إجمالي المقايسة:</strong> <span class="number">${formatMoney(boqTotal)} ر.س</span></div>
      <div class="field"><strong>عدد الملفات:</strong> ${files.length} ملف (${clientVisibleFiles} مرئي للعميل، ${approvedFiles} معتمد)</div>
    </div>

    <h2>مراحل العمل</h2>
    ${stages.length ? `
      <table>
        <thead><tr><th>#</th><th>المرحلة</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
        <tbody>
          ${stages.map((stage) => `
            <tr>
              <td>${stage.stageOrder}</td>
              <td>${escapeHtml(stage.stageName)}</td>
              <td>${escapeHtml(stage.status)}</td>
              <td>${escapeHtml(stage.notes || stage.clientFeedback || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div class="empty">لا توجد مراحل مسجلة.</div>`}

    <h2>الموافقات المعلقة</h2>
    ${approvals.length ? `
      <table>
        <thead><tr><th>المرحلة</th><th>الحالة</th><th>تعليق</th></tr></thead>
        <tbody>
          ${approvals.map((approval) => `
            <tr>
              <td>${escapeHtml(approval.stageName || "-")}</td>
              <td>${escapeHtml(approval.approvalStatus)}</td>
              <td>${escapeHtml(approval.comment || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div class="empty">لا توجد موافقات معلقة.</div>`}

    <h2>آخر ملاحظات العميل</h2>
    ${feedbacks.length ? `
      <table>
        <thead><tr><th>النوع</th><th>المرحلة</th><th>الملاحظة</th><th>التاريخ</th></tr></thead>
        <tbody>
          ${feedbacks.map((feedback) => `
            <tr>
              <td>${escapeHtml(feedback.feedbackType)}</td>
              <td>${escapeHtml(feedback.stageName || "-")}</td>
              <td>${escapeHtml(feedback.feedbackText)}</td>
              <td>${formatDate(feedback.createdAt)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div class="empty">لا توجد ملاحظات مسجلة.</div>`}
  `);
}

router.get("/projects/:id/documents", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const projectId = parseId(req.params["id"]);
  const access = await requireProjectAccess(projectId, user);
  if (!access.context) {
    fail(res, access.status, access.message);
    return;
  }

  const filter = user.role === "super_admin"
    ? eq(projectDocumentsTable.projectId, projectId)
    : and(eq(projectDocumentsTable.projectId, projectId), eq(projectDocumentsTable.officeId, user.officeId!));

  const documents = await db
    .select({
      id: projectDocumentsTable.id,
      officeId: projectDocumentsTable.officeId,
      projectId: projectDocumentsTable.projectId,
      documentType: projectDocumentsTable.documentType,
      title: projectDocumentsTable.title,
      createdBy: projectDocumentsTable.createdBy,
      createdAt: projectDocumentsTable.createdAt,
      updatedAt: projectDocumentsTable.updatedAt,
    })
    .from(projectDocumentsTable)
    .where(filter)
    .orderBy(sql`${projectDocumentsTable.createdAt} DESC`);

  ok(res, documents);
}));

router.post("/projects/:id/documents/quotation", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!quotationRoles.has(user.role)) {
    fail(res, 403, "ليس لديك صلاحية إنشاء عرض سعر");
    return;
  }

  const projectId = parseId(req.params["id"]);
  const access = await requireProjectAccess(projectId, user);
  if (!access.context) {
    fail(res, access.status, access.message);
    return;
  }
  if (!access.context.officeId) {
    fail(res, 400, "لا يوجد مكتب مرتبط بهذا المشروع");
    return;
  }
  const feature = await canGeneratePrintableDocument(user, access.context.officeId);
  if (!feature.allowed) {
    fail(res, 403, feature.message || "ليس لديك صلاحية إنشاء مستند");
    return;
  }

  const items = await getEstimateItems(projectId);
  const title = `عرض سعر - ${access.context.projectName}`;
  const htmlContent = quotationHtml(access.context, items);
  const [document] = await db.insert(projectDocumentsTable).values({
    officeId: access.context.officeId!,
    projectId,
    documentType: "quotation",
    title,
    htmlContent,
    createdBy: user.id,
  }).returning();

  await createNotification({
    officeId: access.context.officeId,
    projectId,
    title: "تم إنشاء عرض سعر",
    message: `تم إنشاء عرض سعر لمشروع "${access.context.projectName}".`,
    notificationType: "quotation_generated",
  });

  ok(res, document, 201, "تم إنشاء مستند عرض السعر");
}));

router.post("/projects/:id/documents/project-report", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!reportRoles.has(user.role)) {
    fail(res, 403, "ليس لديك صلاحية إنشاء تقرير حالة المشروع");
    return;
  }

  const projectId = parseId(req.params["id"]);
  const access = await requireProjectAccess(projectId, user);
  if (!access.context) {
    fail(res, access.status, access.message);
    return;
  }
  if (!access.context.officeId) {
    fail(res, 400, "لا يوجد مكتب مرتبط بهذا المشروع");
    return;
  }
  const feature = await canGeneratePrintableDocument(user, access.context.officeId);
  if (!feature.allowed) {
    fail(res, 403, feature.message || "ليس لديك صلاحية إنشاء مستند");
    return;
  }

  const title = `تقرير حالة المشروع - ${access.context.projectName}`;
  const htmlContent = await projectReportHtml(access.context);
  const [document] = await db.insert(projectDocumentsTable).values({
    officeId: access.context.officeId!,
    projectId,
    documentType: "project_report",
    title,
    htmlContent,
    createdBy: user.id,
  }).returning();

  ok(res, document, 201, "تم إنشاء تقرير حالة المشروع");
}));

router.get("/documents/:id", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const documentId = parseId(req.params["id"]);
  if (!isValidId(documentId)) {
    fail(res, 400, "معرّف المستند غير صحيح");
    return;
  }
  const rows = await db.select().from(projectDocumentsTable).where(eq(projectDocumentsTable.id, documentId)).limit(1);
  const document = rows[0];
  if (!document) {
    fail(res, 404, "المستند غير موجود");
    return;
  }
  if (!hasOfficeAccess(user, document.officeId)) {
    fail(res, 403, "ليس لديك صلاحية الوصول لهذا المستند");
    return;
  }

  ok(res, document);
}));

router.delete("/documents/:id", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const documentId = parseId(req.params["id"]);
  if (!isValidId(documentId)) {
    fail(res, 400, "معرّف المستند غير صحيح");
    return;
  }
  if (!manageDocumentRoles.has(user.role)) {
    fail(res, 403, "ليس لديك صلاحية حذف هذا المستند");
    return;
  }
  const rows = await db.select().from(projectDocumentsTable).where(eq(projectDocumentsTable.id, documentId)).limit(1);
  const document = rows[0];
  if (!document) {
    fail(res, 404, "المستند غير موجود");
    return;
  }
  if (!hasOfficeAccess(user, document.officeId)) {
    fail(res, 403, "ليس لديك صلاحية حذف هذا المستند");
    return;
  }

  await db.delete(projectDocumentsTable).where(eq(projectDocumentsTable.id, documentId));
  ok(res, { id: documentId }, 200, "تم حذف المستند");
}));

export default router;
