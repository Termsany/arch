import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { anyAuthMiddleware, getUser } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";
import { markAllAsRead, markAsRead } from "../lib/notifications";

const router = Router();

function parseId(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
}

function isValidId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function notificationScope(user: ReturnType<typeof getUser>) {
  if (user.role === "super_admin") return undefined;
  if (user.role === "client") {
    if (!user.clientId) return eq(notificationsTable.id, -1);
    return eq(notificationsTable.clientId, user.clientId);
  }
  if (!user.officeId) return eq(notificationsTable.id, -1);
  return and(
    eq(notificationsTable.officeId, user.officeId),
    or(isNull(notificationsTable.userId), eq(notificationsTable.userId, user.id)),
    isNull(notificationsTable.clientId),
  );
}

async function canAccessNotification(notificationId: number, user: ReturnType<typeof getUser>) {
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.id, notificationId)).limit(1);
  const notification = rows[0];
  if (!notification) return { notification: null, status: 404 as const, message: "الإشعار غير موجود" };
  if (user.role === "super_admin") return { notification, status: 200 as const, message: "" };
  if (user.role === "client") {
    if (notification.clientId && notification.clientId === user.clientId) return { notification, status: 200 as const, message: "" };
    return { notification: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا الإشعار" };
  }
  if (notification.officeId !== user.officeId || notification.clientId) {
    return { notification: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا الإشعار" };
  }
  if (notification.userId && notification.userId !== user.id) {
    return { notification: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا الإشعار" };
  }
  return { notification, status: 200 as const, message: "" };
}

router.get("/notifications", anyAuthMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const requestedLimit = Number(req.query["limit"] ?? 20) || 20;
  const limit = Math.max(1, Math.min(requestedLimit, 50));
  const scope = notificationScope(user);

  const [notifications, unreadRows] = await Promise.all([
    db
      .select()
      .from(notificationsTable)
      .where(scope)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(limit),
    db
      .select({ total: count() })
      .from(notificationsTable)
      .where(scope ? and(scope, eq(notificationsTable.isRead, false)) : eq(notificationsTable.isRead, false)),
  ]);

  ok(res, {
    notifications,
    unreadCount: Number(unreadRows[0]?.total ?? 0),
  });
}));

router.patch("/notifications/:id/read", anyAuthMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!isValidId(id)) {
    fail(res, 400, "معرّف الإشعار غير صحيح");
    return;
  }
  const access = await canAccessNotification(id, user);
  if (!access.notification) {
    fail(res, access.status, access.message);
    return;
  }

  const notification = await markAsRead(id);
  ok(res, notification, 200, "تم تحديد الإشعار كمقروء");
}));

router.patch("/notifications/read-all", anyAuthMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  await markAllAsRead({
    officeId: user.officeId,
    userId: user.id,
    clientId: user.clientId,
    superAdmin: user.role === "super_admin",
  });
  ok(res, null, 200, "تم تحديد كل الإشعارات كمقروءة");
}));

router.delete("/notifications/:id", anyAuthMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!isValidId(id)) {
    fail(res, 400, "معرّف الإشعار غير صحيح");
    return;
  }
  const access = await canAccessNotification(id, user);
  if (!access.notification) {
    fail(res, access.status, access.message);
    return;
  }

  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  ok(res, { id }, 200, "تم حذف الإشعار");
}));

export default router;
