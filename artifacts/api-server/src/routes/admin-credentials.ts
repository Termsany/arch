import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, getUser, hashPassword } from "../lib/auth";
import { fail } from "../lib/http";
import { logAudit } from "../lib/audit";

const router = Router();

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

router.post("/admin/credentials", authMiddleware, async (req, res) => {
  try {
    const actor = getUser(req);
    const body = req.body as Record<string, unknown>;
    const email = normalizeEmail(body["email"]);
    const newSecret = typeof body["newSecret"] === "string" ? body["newSecret"] : "";

    if (actor.role !== "super_admin") {
      fail(res, 403, "هذا الإجراء متاح للسوبر أدمن فقط");
      return;
    }

    if (!email) {
      fail(res, 400, "البريد الإلكتروني مطلوب");
      return;
    }

    if (newSecret.length < 8) {
      fail(res, 400, "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const targetUser = users[0];

    if (!targetUser) {
      fail(res, 404, "المستخدم غير موجود");
      return;
    }

    const secretHash = await hashPassword(newSecret);
    const [updated] = await db
      .update(usersTable)
      .set({
        passwordHash: secretHash,
        status: "active",
        inviteTokenHash: null,
        inviteExpiresAt: null,
        passwordSetAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, targetUser.id))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        officeId: usersTable.officeId,
        status: usersTable.status,
        passwordSetAt: usersTable.passwordSetAt,
      });

    await logAudit({
      office_id: updated?.officeId ?? null,
      user_id: actor.id,
      action: "admin.credentials_update",
      entity_type: "user",
      entity_id: updated?.id ?? targetUser.id,
      new_value: { email: updated?.email, role: updated?.role, status: updated?.status },
      req,
    });

    res.json({ user: updated, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
