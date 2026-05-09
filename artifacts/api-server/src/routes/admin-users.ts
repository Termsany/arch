import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, getUser, hashPassword } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";
import { logAudit } from "../lib/audit";

const router = Router();

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isStrongPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

router.post("/admin/users/password", authMiddleware, asyncHandler(async (req, res) => {
  const actor = getUser(req);

  if (actor.role !== "super_admin") {
    fail(res, 403, "ليس لديك صلاحية لتنفيذ هذا الإجراء");
    return;
  }

  const email = normalizeEmail((req.body as { email?: unknown } | null)?.email);
  const newPassword = (req.body as { newPassword?: unknown } | null)?.newPassword;
  const forceChange = Boolean((req.body as { forceChange?: unknown } | null)?.forceChange);

  if (!email) {
    fail(res, 400, "البريد الإلكتروني مطلوب");
    return;
  }

  if (!isStrongPassword(newPassword)) {
    fail(res, 400, "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم");
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const targetUser = users[0];

  if (!targetUser) {
    fail(res, 404, "المستخدم غير موجود");
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  const passwordChangedAt = new Date();
  const [updated] = await db
    .update(usersTable)
    .set({
      passwordHash,
      status: "active",
      inviteTokenHash: null,
      inviteExpiresAt: null,
      passwordSetAt: passwordChangedAt,
      passwordChangedAt,
      mustChangePassword: forceChange,
      updatedAt: passwordChangedAt,
    })
    .where(eq(usersTable.id, targetUser.id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      officeId: usersTable.officeId,
      status: usersTable.status,
      mustChangePassword: usersTable.mustChangePassword,
      passwordChangedAt: usersTable.passwordChangedAt,
    });

  await logAudit({
    office_id: targetUser.officeId,
    user_id: actor.id,
    action: "admin.user_password_reset",
    entity_type: "user",
    entity_id: targetUser.id,
    new_value: {
      email: targetUser.email,
      role: targetUser.role,
      officeId: targetUser.officeId,
      forceChange,
      passwordChangedAt,
    },
    req,
  });

  ok(res, updated ?? null, 200, "تم تحديث كلمة المرور بنجاح");
}));

export default router;
