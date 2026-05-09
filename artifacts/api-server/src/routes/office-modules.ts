import { Router } from "express";
import { db, officeSettingsTable, officesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";
import {
  ALL_APP_MODULES,
  DEFAULT_OFFICE_MODULES,
  normalizeOfficeModules,
  validateOfficeModules,
} from "../lib/modules";

const router = Router();

async function ensureOfficeSettings(officeId: number) {
  const existing = await db
    .select()
    .from(officeSettingsTable)
    .where(eq(officeSettingsTable.officeId, officeId))
    .limit(1);

  if (existing[0]) return existing[0];

  const office = await db.select({ id: officesTable.id }).from(officesTable).where(eq(officesTable.id, officeId)).limit(1);
  if (!office[0]) return null;

  const [created] = await db
    .insert(officeSettingsTable)
    .values({
      officeId,
      onboardingCompleted: false,
      enabledModules: [...DEFAULT_OFFICE_MODULES],
    })
    .returning();

  return created ?? null;
}

router.get("/me/modules", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);

  if (user.role === "super_admin") {
    ok(res, { enabledModules: [...ALL_APP_MODULES] });
    return;
  }

  if (!user.officeId) {
    ok(res, { enabledModules: ["dashboard"] });
    return;
  }

  const settings = await ensureOfficeSettings(user.officeId);
  ok(res, {
    officeId: user.officeId,
    enabledModules: normalizeOfficeModules(settings?.enabledModules),
  });
}));

router.get("/offices/:id/modules", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const officeId = Number(req.params["id"]);

  if (!Number.isFinite(officeId)) {
    fail(res, 400, "Invalid office id");
    return;
  }

  if (user.role !== "super_admin" && user.officeId !== officeId) {
    fail(res, 403, "ليس لديك صلاحية لتنفيذ هذا الإجراء");
    return;
  }

  const settings = await ensureOfficeSettings(officeId);
  if (!settings) {
    fail(res, 404, "المكتب غير موجود");
    return;
  }

  ok(res, {
    officeId,
    enabledModules: normalizeOfficeModules(settings.enabledModules),
  });
}));

router.patch("/offices/:id/modules", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const officeId = Number(req.params["id"]);

  if (!Number.isFinite(officeId)) {
    fail(res, 400, "Invalid office id");
    return;
  }

  if (user.role !== "super_admin") {
    fail(res, 403, "ليس لديك صلاحية لتنفيذ هذا الإجراء");
    return;
  }

  const validation = validateOfficeModules((req.body as { enabledModules?: unknown } | null)?.enabledModules);
  if (!validation.ok) {
    fail(res, 400, "قائمة الصلاحيات تحتوي على موديولات غير صحيحة", { invalidModules: validation.invalid });
    return;
  }

  const settings = await ensureOfficeSettings(officeId);
  if (!settings) {
    fail(res, 404, "المكتب غير موجود");
    return;
  }

  const [updated] = await db
    .update(officeSettingsTable)
    .set({
      enabledModules: validation.modules,
      updatedAt: new Date(),
    })
    .where(eq(officeSettingsTable.id, settings.id))
    .returning();

  ok(res, {
    officeId,
    enabledModules: normalizeOfficeModules(updated?.enabledModules),
  });
}));

export default router;
