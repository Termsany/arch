import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  anyAuthMiddleware,
  authMiddleware,
  clientPortalMiddleware,
  comparePassword,
  getUser,
  hashPassword,
  signToken,
} from "../lib/auth";
import { asyncHandler, fail, ok, validateBody } from "../lib/http";
import { changePasswordSchema, loginSchema, resetPasswordSchema } from "../lib/validation";

const router = Router();

router.post("/auth/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = users[0];
    if (!user) {
      fail(res, 401, "بيانات الدخول غير صحيحة");
      return;
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      fail(res, 401, "بيانات الدخول غير صحيحة");
      return;
    }
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      officeId: user.officeId ?? null,
      clientId: user.clientId ?? null,
    });
    ok(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        officeId: user.officeId ?? null,
        clientId: user.clientId ?? null,
        createdAt: user.createdAt,
      },
    }, 200, "تم تسجيل الدخول بنجاح");
}));

router.get("/auth/me", authMiddleware, asyncHandler(async (req, res) => {
    const authUser = getUser(req);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id)).limit(1);
    if (!users[0]) {
      fail(res, 404, "المستخدم غير موجود");
      return;
    }
    const { passwordHash, ...safe } = users[0];
    void passwordHash;
    ok(res, safe);
}));

router.get("/auth/client-me", clientPortalMiddleware, asyncHandler(async (req, res) => {
    const authUser = getUser(req);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id)).limit(1);
    if (!users[0]) {
      fail(res, 404, "المستخدم غير موجود");
      return;
    }
    const { passwordHash, ...safe } = users[0];
    void passwordHash;
    ok(res, safe);
}));

router.put("/auth/change-password", anyAuthMiddleware, validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  const authUser = getUser(req);
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const users = await db.select().from(usersTable).where(eq(usersTable.id, authUser.id)).limit(1);
  const user = users[0];

  if (!user) {
    fail(res, 404, "المستخدم غير موجود");
    return;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    fail(res, 400, "كلمة المرور الحالية غير صحيحة");
    return;
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, authUser.id));
  ok(res, null, 200, "تم تغيير كلمة المرور بنجاح");
}));

router.post("/auth/reset-password", validateBody(resetPasswordSchema), asyncHandler(async (_req, res) => {
  ok(res, null, 202, "إذا كان البريد مسجلاً سيتم إرسال تعليمات إعادة التعيين لاحقاً");
}));

router.post("/auth/logout", (_req, res) => {
  ok(res, null, 200, "تم تسجيل الخروج بنجاح");
});

export default router;
