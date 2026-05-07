import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPlansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { validateBody } from "../lib/http";
import { planSchema } from "../lib/validation";
import { logAudit } from "../lib/audit";

const router = Router();

const planFromBody = (body: Record<string, unknown>) => ({
  nameAr: body["nameAr"] as string,
  nameEn: (body["nameEn"] as string) || null,
  descriptionAr: (body["descriptionAr"] as string) || null,
  monthlyPrice: String(body["monthlyPrice"] ?? 0),
  yearlyPrice: String(body["yearlyPrice"] ?? 0),
  maxUsers: Number(body["maxUsers"] ?? 1),
  maxProjects: Number(body["maxProjects"] ?? 0),
  maxClients: Number(body["maxClients"] ?? 0),
  storageLimitMb: Number(body["storageLimitMb"] ?? 0),
  hasClientPortal: Boolean(body["hasClientPortal"]),
  hasWhatsappNotifications: Boolean(body["hasWhatsappNotifications"]),
  hasPdfReports: Boolean(body["hasPdfReports"]),
  hasTeamRoles: Boolean(body["hasTeamRoles"]),
  hasAdvancedEstimates: Boolean(body["hasAdvancedEstimates"]),
  isRecommended: Boolean(body["isRecommended"]),
  isActive: Boolean(body["isActive"]),
  sortOrder: Number(body["sortOrder"] ?? 0),
});

const mapPlan = (p: typeof subscriptionPlansTable.$inferSelect) => ({
  ...p,
  monthlyPrice: Number(p.monthlyPrice),
  yearlyPrice: Number(p.yearlyPrice),
});

router.get("/plans/active", async (req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.isActive, true))
      .orderBy(subscriptionPlansTable.sortOrder);
    res.json(plans.map(mapPlan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/plans", authMiddleware, async (req, res) => {
  try {
    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .orderBy(subscriptionPlansTable.sortOrder);
    res.json(plans.map(mapPlan));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/plans", authMiddleware, validateBody(planSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const [plan] = await db.insert(subscriptionPlansTable).values(planFromBody(req.body as Record<string, unknown>)).returning();
    await logAudit({
      office_id: null,
      user_id: user.id,
      action: "subscription_plan.create",
      entity_type: "subscription_plan",
      entity_id: plan?.id ?? null,
      new_value: plan,
      req,
    });
    res.status(201).json(mapPlan(plan!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/plans/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params["id"]);
    const plans = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).limit(1);
    if (!plans[0]) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    res.json(mapPlan(plans[0]));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/plans/:id", authMiddleware, validateBody(planSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const existing = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).limit(1);
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({ ...planFromBody(req.body as Record<string, unknown>), updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    await logAudit({
      office_id: null,
      user_id: user.id,
      action: "subscription_plan.update",
      entity_type: "subscription_plan",
      entity_id: id,
      old_value: existing[0] ?? null,
      new_value: updated,
      req,
    });
    res.json(mapPlan(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/plans/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const existing = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).limit(1);
    await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    await logAudit({
      office_id: null,
      user_id: user.id,
      action: "subscription_plan.delete",
      entity_type: "subscription_plan",
      entity_id: id,
      old_value: existing[0] ?? null,
      req,
    });
    res.json({ success: true, message: "تم حذف الخطة بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/plans/:id/toggle-active", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const current = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).limit(1);
    if (!current[0]) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({ isActive: !current[0].isActive, updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    await logAudit({
      office_id: null,
      user_id: user.id,
      action: "subscription_plan.status_update",
      entity_type: "subscription_plan",
      entity_id: id,
      old_value: current[0],
      new_value: updated,
      req,
    });
    res.json(mapPlan(updated!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/plans/:id/recommended", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const existing = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id)).limit(1);
    // Unset all recommended first
    await db.update(subscriptionPlansTable).set({ isRecommended: false, updatedAt: new Date() });
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({ isRecommended: true, updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    await logAudit({
      office_id: null,
      user_id: user.id,
      action: "subscription_plan.update",
      entity_type: "subscription_plan",
      entity_id: id,
      old_value: existing[0] ?? null,
      new_value: updated,
      req,
    });
    res.json(mapPlan(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
