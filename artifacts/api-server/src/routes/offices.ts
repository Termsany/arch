import { randomBytes } from "node:crypto";
import { Router } from "express";
import { db } from "@workspace/db";
import {
  boqCategoriesTable,
  officeSettingsTable,
  officesTable,
  subscriptionPlansTable,
  usersTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, getUser, hashPassword } from "../lib/auth";
import { fail, validateBody } from "../lib/http";
import { officeSchema } from "../lib/validation";
import { logAudit } from "../lib/audit";
import { DEFAULT_BOQ_CATEGORIES } from "../lib/defaults";
import { createInviteToken } from "../lib/invites";
import { tApi } from "../i18n/messages";

const router = Router();

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

router.get("/offices", authMiddleware, async (req, res) => {
  try {
    const offices = await db
      .select({
        id: officesTable.id,
        officeName: officesTable.officeName,
        ownerName: officesTable.ownerName,
        phone: officesTable.phone,
        email: officesTable.email,
        address: officesTable.address,
        planId: officesTable.planId,
        planName: subscriptionPlansTable.nameAr,
        subscriptionStatus: officesTable.subscriptionStatus,
        subscriptionStart: officesTable.subscriptionStart,
        subscriptionEnd: officesTable.subscriptionEnd,
        createdAt: officesTable.createdAt,
        updatedAt: officesTable.updatedAt,
      })
      .from(officesTable)
      .leftJoin(subscriptionPlansTable, eq(officesTable.planId, subscriptionPlansTable.id))
      .orderBy(sql`${officesTable.createdAt} DESC`);
    res.json(offices);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/offices", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const rawBody = req.body as Record<string, unknown>;
    const result = officeSchema.safeParse(rawBody);

    if (!result.success) {
      fail(res, 400, tApi(req, "VALIDATION.INVALID_INPUT"), { code: "VALIDATION.INVALID_INPUT", ...result.error.flatten() });
      return;
    }

    const body = result.data as Record<string, unknown>;
    const adminEmail = normalizeEmail(body["email"]);
    const adminName = typeof body["ownerName"] === "string" ? body["ownerName"].trim() : "";

    if (!adminName) {
      fail(res, 400, "اسم المالك / المدير مطلوب لإنشاء حساب مدير المكتب");
      return;
    }

    if (!adminEmail) {
      fail(res, 400, "البريد الإلكتروني مطلوب لإنشاء حساب مدير المكتب");
      return;
    }

    const existingUser = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (existingUser[0]) {
      fail(res, 409, "البريد الإلكتروني مستخدم بالفعل");
      return;
    }

    const existingOffice = await db.select({ id: officesTable.id }).from(officesTable).where(eq(officesTable.email, adminEmail)).limit(1);
    if (existingOffice[0]) {
      fail(res, 409, "البريد الإلكتروني مستخدم بالفعل");
      return;
    }

    const subscriptionStatus = (body["subscriptionStatus"] as string) || "trial";
    const subscriptionStart = (body["subscriptionStart"] as string | null) || toDateString(new Date());
    const subscriptionEnd = (body["subscriptionEnd"] as string | null) || (subscriptionStatus === "trial" ? addDays(subscriptionStart, 14) : null);
    const invite = createInviteToken();
    const temporaryPasswordHash = await hashPassword(randomBytes(32).toString("base64url"));

    const created = await db.transaction(async (tx) => {
      const [office] = await tx
        .insert(officesTable)
        .values({
          officeName: body["officeName"] as string,
          ownerName: adminName,
          phone: (body["phone"] as string) || null,
          email: adminEmail,
          address: (body["address"] as string) || null,
          planId: body["planId"] ? Number(body["planId"]) : null,
          subscriptionStatus,
          subscriptionStart,
          subscriptionEnd,
        })
        .returning();

      const [officeAdmin] = await tx
        .insert(usersTable)
        .values({
          name: adminName,
          email: adminEmail,
          passwordHash: temporaryPasswordHash,
          role: "office_admin",
          status: "pending_invite",
          inviteTokenHash: invite.tokenHash,
          inviteExpiresAt: invite.expiresAt,
          officeId: office!.id,
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
          officeId: usersTable.officeId,
          status: usersTable.status,
          inviteExpiresAt: usersTable.inviteExpiresAt,
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

      return { office: office!, officeAdmin: officeAdmin! };
    });

    await logAudit({
      office_id: created.office.id,
      user_id: user.id,
      action: "office.create_invite",
      entity_type: "office",
      entity_id: created.office.id,
      new_value: { office: created.office, officeAdmin: created.officeAdmin, inviteExpiresAt: invite.expiresAt },
      req,
    });

    res.status(201).json({
      office: created.office,
      officeAdmin: created.officeAdmin,
      inviteUrl: invite.inviteUrl,
      inviteExpiresAt: invite.expiresAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ code: "COMMON.SERVER_ERROR", error: tApi(req, "COMMON.SERVER_ERROR") });
  }
});

router.get("/offices/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const offices = await db
      .select({
        id: officesTable.id,
        officeName: officesTable.officeName,
        ownerName: officesTable.ownerName,
        phone: officesTable.phone,
        email: officesTable.email,
        address: officesTable.address,
        planId: officesTable.planId,
        planName: subscriptionPlansTable.nameAr,
        subscriptionStatus: officesTable.subscriptionStatus,
        subscriptionStart: officesTable.subscriptionStart,
        subscriptionEnd: officesTable.subscriptionEnd,
        createdAt: officesTable.createdAt,
        updatedAt: officesTable.updatedAt,
      })
      .from(officesTable)
      .leftJoin(subscriptionPlansTable, eq(officesTable.planId, subscriptionPlansTable.id))
      .where(eq(officesTable.id, id))
      .limit(1);
    if (!offices[0]) {
      res.status(404).json({ code: "COMMON.NOT_FOUND", error: tApi(req, "COMMON.NOT_FOUND") });
      return;
    }
    res.json(offices[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ code: "COMMON.SERVER_ERROR", error: tApi(req, "COMMON.SERVER_ERROR") });
  }
});

router.post("/offices/:id/regenerate-invite", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const officeUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.officeId, id));
    const officeAdmin = officeUsers.find((row) => row.role === "office_admin");

    if (!officeAdmin) {
      fail(res, 404, tApi(req, "COMMON.NOT_FOUND"), { code: "COMMON.NOT_FOUND" });
      return;
    }

    if (user.role !== "super_admin" && user.officeId !== id) {
      fail(res, 403, tApi(req, "AUTH.FORBIDDEN"), { code: "AUTH.FORBIDDEN" });
      return;
    }

    const invite = createInviteToken();
    const [updated] = await db
      .update(usersTable)
      .set({
        status: "pending_invite",
        inviteTokenHash: invite.tokenHash,
        inviteExpiresAt: invite.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, officeAdmin.id))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        role: usersTable.role,
        officeId: usersTable.officeId,
        status: usersTable.status,
        inviteExpiresAt: usersTable.inviteExpiresAt,
      });

    await logAudit({
      office_id: id,
      user_id: user.id,
      action: "office.regenerate_invite",
      entity_type: "user",
      entity_id: updated?.id ?? officeAdmin.id,
      new_value: { email: updated?.email, inviteExpiresAt: invite.expiresAt },
      req,
    });

    res.json({ user: updated, inviteUrl: invite.inviteUrl, inviteExpiresAt: invite.expiresAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ code: "COMMON.SERVER_ERROR", error: tApi(req, "COMMON.SERVER_ERROR") });
  }
});

router.put("/offices/:id", authMiddleware, validateBody(officeSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const body = req.body as Record<string, unknown>;
    const existing = await db.select().from(officesTable).where(eq(officesTable.id, id)).limit(1);
    const subscriptionStatus = (body["subscriptionStatus"] as string) || existing[0]?.subscriptionStatus || "trial";
    const subscriptionStart = (body["subscriptionStart"] as string | null) || existing[0]?.subscriptionStart || toDateString(new Date());
    const subscriptionEnd = (body["subscriptionEnd"] as string | null) || (subscriptionStatus === "trial" ? addDays(subscriptionStart, 14) : existing[0]?.subscriptionEnd ?? null);
    const [updated] = await db
      .update(officesTable)
      .set({
        officeName: body["officeName"] as string,
        ownerName: (body["ownerName"] as string) || null,
        phone: (body["phone"] as string) || null,
        email: normalizeEmail(body["email"]) || null,
        address: (body["address"] as string) || null,
        planId: body["planId"] ? Number(body["planId"]) : null,
        subscriptionStatus,
        subscriptionStart,
        subscriptionEnd,
        updatedAt: new Date(),
      })
      .where(eq(officesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ code: "COMMON.NOT_FOUND", error: tApi(req, "COMMON.NOT_FOUND") });
      return;
    }
    await logAudit({
      office_id: id,
      user_id: user.id,
      action: "office.update",
      entity_type: "office",
      entity_id: id,
      old_value: existing[0] ?? null,
      new_value: updated,
      req,
    });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ code: "COMMON.SERVER_ERROR", error: tApi(req, "COMMON.SERVER_ERROR") });
  }
});

router.delete("/offices/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const existing = await db.select().from(officesTable).where(eq(officesTable.id, id)).limit(1);
    await db.delete(officesTable).where(eq(officesTable.id, id));
    await logAudit({
      office_id: id,
      user_id: user.id,
      action: "office.delete",
      entity_type: "office",
      entity_id: id,
      old_value: existing[0] ?? null,
      req,
    });
    res.json({ success: true, message: "تم حذف المكتب بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ code: "COMMON.SERVER_ERROR", error: tApi(req, "COMMON.SERVER_ERROR") });
  }
});

export default router;
