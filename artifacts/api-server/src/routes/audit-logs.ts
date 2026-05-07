import { Router } from "express";
import { auditLogsTable, db, officesTable, usersTable } from "@workspace/db";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";

const router = Router();

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseOptionalInt(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(String(Array.isArray(value) ? value[0] : value));
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/audit-logs", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const isSuperAdmin = user.role === "super_admin";
  const isOfficeAdmin = user.role === "office_admin";
  if (!isSuperAdmin && !isOfficeAdmin) {
    return fail(res, 403, "ليس لديك صلاحية الوصول لسجل النشاط");
  }

  const page = parsePositiveInt(req.query["page"], 1);
  const limit = Math.min(parsePositiveInt(req.query["limit"], 25), 100);
  const filters = [];

  const officeId = parseOptionalInt(req.query["office_id"]);
  const userId = parseOptionalInt(req.query["user_id"]);
  const entityId = parseOptionalInt(req.query["entity_id"]);
  const fromDate = parseOptionalDate(req.query["from_date"]);
  const toDate = parseOptionalDate(req.query["to_date"]);

  if (isSuperAdmin && officeId) {
    filters.push(eq(auditLogsTable.officeId, officeId));
  } else if (!isSuperAdmin) {
    if (!user.officeId) return fail(res, 403, "لا يوجد مكتب مرتبط بالمستخدم");
    filters.push(eq(auditLogsTable.officeId, user.officeId));
  }

  if (userId) filters.push(eq(auditLogsTable.userId, userId));
  if (req.query["action"]) filters.push(eq(auditLogsTable.action, String(req.query["action"])));
  if (req.query["entity_type"]) filters.push(eq(auditLogsTable.entityType, String(req.query["entity_type"])));
  if (entityId) filters.push(eq(auditLogsTable.entityId, entityId));
  if (fromDate) filters.push(gte(auditLogsTable.createdAt, fromDate));
  if (toDate) filters.push(lte(auditLogsTable.createdAt, toDate));

  const where = filters.length ? and(...filters) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(auditLogsTable).where(where);
  const items = await db
    .select({
      id: auditLogsTable.id,
      officeId: auditLogsTable.officeId,
      officeName: officesTable.officeName,
      userId: auditLogsTable.userId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      action: auditLogsTable.action,
      entityType: auditLogsTable.entityType,
      entityId: auditLogsTable.entityId,
      oldValue: auditLogsTable.oldValue,
      newValue: auditLogsTable.newValue,
      ipAddress: auditLogsTable.ipAddress,
      userAgent: auditLogsTable.userAgent,
      createdAt: auditLogsTable.createdAt,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.userId, usersTable.id))
    .leftJoin(officesTable, eq(auditLogsTable.officeId, officesTable.id))
    .where(where)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return ok(res, { items, page, limit, total: Number(total ?? 0) });
}));

export default router;
