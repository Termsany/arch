import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionPlansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

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

router.post("/plans", authMiddleware, async (req, res) => {
  try {
    const [plan] = await db.insert(subscriptionPlansTable).values(planFromBody(req.body as Record<string, unknown>)).returning();
    res.status(201).json(mapPlan(plan!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/plans/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
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

router.put("/plans/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const [updated] = await db
      .update(subscriptionPlansTable)
      .set({ ...planFromBody(req.body as Record<string, unknown>), updatedAt: new Date() })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    res.json(mapPlan(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/plans/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    res.json({ success: true, message: "تم حذف الخطة بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/plans/:id/toggle-active", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
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
    res.json(mapPlan(updated!));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/plans/:id/recommended", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
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
    res.json(mapPlan(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
