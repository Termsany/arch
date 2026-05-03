import { Router } from "express";
import { db } from "@workspace/db";
import {
  boqCategoriesTable,
  officeSettingsTable,
  officesTable,
  subscriptionPlansTable,
  usersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, getUser, hashPassword } from "../lib/auth";
import { asyncHandler, fail, ok, validateBody } from "../lib/http";
import { DEFAULT_BOQ_CATEGORIES } from "../lib/defaults";
import { createOfficeOnboardingSchema } from "../lib/validation";

const router = Router();

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

router.post("/onboarding/create-office", validateBody(createOfficeOnboardingSchema), asyncHandler(async (req, res) => {
  const body = req.body as {
    office_name: string;
    owner_name: string;
    phone: string;
    email: string;
    password: string;
    plan_id: number;
  };

  const existingUser = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
  if (existingUser[0]) {
    fail(res, 409, "البريد الإلكتروني مستخدم بالفعل");
    return;
  }

  const existingOffice = await db.select({ id: officesTable.id }).from(officesTable).where(eq(officesTable.email, body.email)).limit(1);
  if (existingOffice[0]) {
    fail(res, 409, "البريد الإلكتروني مستخدم بالفعل");
    return;
  }

  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.id, body.plan_id))
    .limit(1);
  const plan = plans[0];

  if (!plan || !plan.isActive) {
    fail(res, 400, "الخطة المختارة غير متاحة");
    return;
  }

  const today = new Date();
  const trialEnd = new Date(today);
  trialEnd.setDate(trialEnd.getDate() + 14);
  const passwordHash = await hashPassword(body.password);

  const created = await db.transaction(async (tx) => {
    const [office] = await tx
      .insert(officesTable)
      .values({
        officeName: body.office_name,
        ownerName: body.owner_name,
        phone: body.phone,
        email: body.email,
        planId: plan.id,
        subscriptionStatus: "trial",
        subscriptionStart: toDateString(today),
        subscriptionEnd: toDateString(trialEnd),
      })
      .returning();

    const [user] = await tx
      .insert(usersTable)
      .values({
        name: body.owner_name,
        email: body.email,
        passwordHash,
        role: "office_admin",
        officeId: office!.id,
      })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        officeId: usersTable.officeId,
      });

    await tx.insert(officeSettingsTable).values({
      officeId: office!.id,
      onboardingCompleted: false,
    });

    await tx.insert(boqCategoriesTable).values(
      DEFAULT_BOQ_CATEGORIES.map((category, index) => ({
        officeId: office!.id,
        name: category.name,
        description: category.description,
        sortOrder: index + 1,
      })),
    );

    return { office: office!, user: user!, plan };
  });

  ok(
    res,
    {
      office: created.office,
      user: created.user,
      plan: created.plan,
      trialDays: 14,
    },
    201,
    "تم إنشاء حساب المكتب بنجاح",
  );
}));

router.get("/onboarding/status", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!user.officeId) {
    ok(res, { onboardingCompleted: true });
    return;
  }

  const rows = await db
    .select()
    .from(officeSettingsTable)
    .where(eq(officeSettingsTable.officeId, user.officeId))
    .limit(1);

  ok(res, { onboardingCompleted: rows[0]?.onboardingCompleted ?? true });
}));

router.patch("/onboarding/complete", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!user.officeId) {
    fail(res, 400, "لا يوجد مكتب مرتبط بهذا الحساب");
    return;
  }

  const rows = await db
    .select()
    .from(officeSettingsTable)
    .where(eq(officeSettingsTable.officeId, user.officeId))
    .limit(1);

  if (rows[0]) {
    await db
      .update(officeSettingsTable)
      .set({ onboardingCompleted: true, updatedAt: new Date() })
      .where(eq(officeSettingsTable.id, rows[0].id));
  } else {
    await db.insert(officeSettingsTable).values({
      officeId: user.officeId,
      onboardingCompleted: true,
    });
  }

  ok(res, { onboardingCompleted: true }, 200, "تم إنهاء قائمة البداية");
}));

export default router;
