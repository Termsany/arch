import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword as hashSecret } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";
import { hashInviteToken } from "../lib/invites";
import { logAudit } from "../lib/audit";

const router = Router();

router.post("/invites/accept", asyncHandler(async (req, res) => {
  const body = req.body as { inviteCode?: unknown; newSecret?: unknown };
  const inviteCode = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
  const newSecret = typeof body.newSecret === "string" ? body.newSecret : "";

  if (!inviteCode) {
    fail(res, 400, "رابط الدعوة غير صحيح");
    return;
  }

  if (newSecret.length < 8) {
    fail(res, 400, "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    return;
  }

  const inviteHash = hashInviteToken(inviteCode);
  const rows = await db.select().from(usersTable).where(eq(usersTable.inviteTokenHash, inviteHash)).limit(1);
  const invitedUser = rows[0];

  if (!invitedUser || !invitedUser.inviteExpiresAt || invitedUser.inviteExpiresAt.getTime() < Date.now()) {
    fail(res, 400, "رابط الدعوة منتهي أو غير صحيح");
    return;
  }

  const secretHash = await hashSecret(newSecret);
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
    .where(eq(usersTable.id, invitedUser.id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      officeId: usersTable.officeId,
    });

  await logAudit({
    office_id: updated?.officeId ?? null,
    user_id: updated?.id ?? null,
    action: "invite.accept",
    entity_type: "user",
    entity_id: updated?.id ?? null,
    new_value: { email: updated?.email, role: updated?.role },
    req,
  });

  ok(res, updated, 200, "تم تفعيل الحساب بنجاح");
}));

export default router;
