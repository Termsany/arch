import { Router } from "express";
import { db, officesTable, pool } from "@workspace/db";
import { usersTable, type Office, type User } from "@workspace/db";
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
import { logAudit } from "../lib/audit";
import { tApi } from "../i18n/messages";
import { applyUserLocale } from "../middleware/locale";

const router = Router();

type SafeUser = User & { preferredLanguage: string };

type LegacyUserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  invite_token_hash: string | null;
  invite_expires_at: Date | null;
  password_set_at: Date | null;
  office_id: number | null;
  client_id: number | null;
  created_at: Date;
  updated_at: Date;
};

function isMissingPreferredLanguageColumn(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  return candidate?.code === "42703" || String(candidate?.message ?? "").includes("preferred_language");
}

function mapLegacyUser(row: LegacyUserRow): SafeUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    preferredLanguage: "ar",
    inviteTokenHash: row.invite_token_hash,
    inviteExpiresAt: row.invite_expires_at,
    passwordSetAt: row.password_set_at,
    officeId: row.office_id,
    clientId: row.client_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findUserByEmail(email: string): Promise<SafeUser | null> {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return (users[0] as SafeUser | undefined) ?? null;
  } catch (error) {
    if (!isMissingPreferredLanguageColumn(error)) throw error;
    const result = await pool.query<LegacyUserRow>(
      `SELECT id, name, email, password_hash, role, status, invite_token_hash, invite_expires_at,
              password_set_at, office_id, client_id, created_at, updated_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email],
    );
    return result.rows[0] ? mapLegacyUser(result.rows[0]) : null;
  }
}

async function findUserById(id: number): Promise<SafeUser | null> {
  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return (users[0] as SafeUser | undefined) ?? null;
  } catch (error) {
    if (!isMissingPreferredLanguageColumn(error)) throw error;
    const result = await pool.query<LegacyUserRow>(
      `SELECT id, name, email, password_hash, role, status, invite_token_hash, invite_expires_at,
              password_set_at, office_id, client_id, created_at, updated_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] ? mapLegacyUser(result.rows[0]) : null;
  }
}

function safeUserResponse(user: SafeUser, office?: Office | null) {
  const { passwordHash, inviteTokenHash, ...safe } = user;
  void passwordHash;
  void inviteTokenHash;
  return {
    ...safe,
    preferredLanguage: safe.preferredLanguage || "ar",
    office: office
      ? {
          id: office.id,
          region: office.region,
          defaultLanguage: office.defaultLanguage,
          timezone: office.timezone,
          currency: office.currency,
        }
      : null,
  };
}

async function getOfficeLocalization(officeId: number | null | undefined): Promise<Office | null> {
  if (!officeId) return null;
  const offices = await db.select().from(officesTable).where(eq(officesTable.id, officeId)).limit(1);
  return offices[0] ?? null;
}

router.post("/auth/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const user = await findUserByEmail(email);
    if (!user) {
      fail(res, 401, tApi(req, "AUTH.INVALID_CREDENTIALS"), { code: "AUTH.INVALID_CREDENTIALS" });
      return;
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      fail(res, 401, tApi(req, "AUTH.INVALID_CREDENTIALS"), { code: "AUTH.INVALID_CREDENTIALS" });
      return;
    }
    const office = await getOfficeLocalization(user.officeId);
    applyUserLocale(req, user.preferredLanguage, office);
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      officeId: user.officeId ?? null,
      clientId: user.clientId ?? null,
      preferredLanguage: user.preferredLanguage,
    });
    await logAudit({
      office_id: user.officeId,
      user_id: user.id,
      action: "user.login",
      entity_type: "user",
      entity_id: user.id,
      new_value: { email: user.email, role: user.role, officeId: user.officeId, clientId: user.clientId },
      req,
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
        preferredLanguage: user.preferredLanguage || "ar",
        office: office
          ? {
              id: office.id,
              region: office.region,
              defaultLanguage: office.defaultLanguage,
              timezone: office.timezone,
              currency: office.currency,
            }
          : null,
        createdAt: user.createdAt,
      },
    }, 200, "تم تسجيل الدخول بنجاح");
}));

router.get("/auth/me", authMiddleware, asyncHandler(async (req, res) => {
    const authUser = getUser(req);
    const user = await findUserById(authUser.id);
    if (!user) {
      fail(res, 404, tApi(req, "AUTH.USER_NOT_FOUND"), { code: "AUTH.USER_NOT_FOUND" });
      return;
    }
    const office = await getOfficeLocalization(user.officeId);
    ok(res, safeUserResponse(user, office));
}));

router.get("/auth/client-me", clientPortalMiddleware, asyncHandler(async (req, res) => {
    const authUser = getUser(req);
    const user = await findUserById(authUser.id);
    if (!user) {
      fail(res, 404, tApi(req, "AUTH.USER_NOT_FOUND"), { code: "AUTH.USER_NOT_FOUND" });
      return;
    }
    const office = await getOfficeLocalization(user.officeId);
    ok(res, safeUserResponse(user, office));
}));

router.patch("/me/preferences", anyAuthMiddleware, asyncHandler(async (req, res) => {
  const authUser = getUser(req);
  const preferredLanguage = typeof req.body?.preferredLanguage === "string" ? req.body.preferredLanguage.trim() : "";

  if (!["ar", "en", "fr"].includes(preferredLanguage)) {
    fail(res, 400, tApi(req, "VALIDATION.INVALID_INPUT"), { code: "VALIDATION.INVALID_INPUT" });
    return;
  }

  try {
    const [updated] = await db
      .update(usersTable)
      .set({ preferredLanguage, updatedAt: new Date() })
      .where(eq(usersTable.id, authUser.id))
      .returning();

    ok(res, { preferredLanguage: updated?.preferredLanguage ?? preferredLanguage }, 200, "تم تحديث التفضيلات");
  } catch (error) {
    if (!isMissingPreferredLanguageColumn(error)) throw error;
    ok(res, { preferredLanguage: "ar", persisted: false }, 200, "تم حفظ اللغة محلياً، وسيتم حفظها في قاعدة البيانات بعد تطبيق التحديثات");
  }
}));

router.put("/auth/change-password", anyAuthMiddleware, validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
  const authUser = getUser(req);
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await findUserById(authUser.id);

  if (!user) {
    fail(res, 404, tApi(req, "AUTH.USER_NOT_FOUND"), { code: "AUTH.USER_NOT_FOUND" });
    return;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    fail(res, 400, tApi(req, "AUTH.CURRENT_PASSWORD_INVALID"), { code: "AUTH.CURRENT_PASSWORD_INVALID" });
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
