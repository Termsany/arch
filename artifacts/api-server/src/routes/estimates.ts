import { Router } from "express";
import { db } from "@workspace/db";
import { projectEstimatesTable, projectsTable, boqCategoriesTable } from "@workspace/db";
import { eq, sum } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

function parseId(value: string | string[] | undefined): number {
  return parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
}

async function checkProjectAccess(projectId: number, user: { role: string; officeId: number | null }): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (!user.officeId) return false;
  const rows = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  return rows[0]?.officeId === user.officeId;
}

function calcBoq(params: { quantity: number; materialUnitCost: number; laborUnitCost: number; wastePercentage: number; profitMargin: number; }) {
  const { quantity, materialUnitCost, laborUnitCost, wastePercentage, profitMargin } = params;
  const unitCostBeforeProfit = materialUnitCost + laborUnitCost;
  const totalCostBeforeProfit = quantity * unitCostBeforeProfit * (1 + wastePercentage / 100);
  const totalPrice = totalCostBeforeProfit * (1 + profitMargin / 100);
  return { unitCostBeforeProfit, totalCostBeforeProfit, totalPrice };
}

router.get("/projects/:id/estimates", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseId(req.params["id"]);
    if (!(await checkProjectAccess(projectId, user))) { res.status(403).json({ error: "ليس لديك صلاحية الوصول لمقايسات هذا المشروع" }); return; }
    const items = await db.select({ id: projectEstimatesTable.id, projectId: projectEstimatesTable.projectId, categoryId: projectEstimatesTable.categoryId, categoryName: boqCategoriesTable.name, phaseName: projectEstimatesTable.phaseName, itemName: projectEstimatesTable.itemName, quantity: projectEstimatesTable.quantity, unit: projectEstimatesTable.unit, unitPrice: projectEstimatesTable.unitPrice, materialUnitCost: projectEstimatesTable.materialUnitCost, laborUnitCost: projectEstimatesTable.laborUnitCost, wastePercentage: projectEstimatesTable.wastePercentage, profitMargin: projectEstimatesTable.profitMargin, unitCostBeforeProfit: projectEstimatesTable.unitCostBeforeProfit, totalCostBeforeProfit: projectEstimatesTable.totalCostBeforeProfit, totalPrice: projectEstimatesTable.totalPrice, notes: projectEstimatesTable.notes, createdAt: projectEstimatesTable.createdAt }).from(projectEstimatesTable).leftJoin(boqCategoriesTable, eq(projectEstimatesTable.categoryId, boqCategoriesTable.id)).where(eq(projectEstimatesTable.projectId, projectId)).orderBy(projectEstimatesTable.createdAt);
    const totalRes = await db.select({ total: sum(projectEstimatesTable.totalPrice) }).from(projectEstimatesTable).where(eq(projectEstimatesTable.projectId, projectId));
    const totalMaterial = await db.select({ total: sum(projectEstimatesTable.totalCostBeforeProfit) }).from(projectEstimatesTable).where(eq(projectEstimatesTable.projectId, projectId));
    res.json({ items, totalCost: Number(totalRes[0]?.total ?? 0), totalCostBeforeProfit: Number(totalMaterial[0]?.total ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects/:id/estimates", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseId(req.params["id"]);
    if (!(await checkProjectAccess(projectId, user))) { res.status(403).json({ error: "ليس لديك صلاحية إضافة بنود لهذا المشروع" }); return; }
    const { phaseName, itemName, quantity, unit, notes, categoryId, materialUnitCost = 0, laborUnitCost = 0, wastePercentage = 0, profitMargin = 0 } = req.body as { phaseName: string; itemName: string; quantity: number; unit?: string; notes?: string; categoryId?: number; materialUnitCost?: number; laborUnitCost?: number; wastePercentage?: number; profitMargin?: number; };
    const { unitCostBeforeProfit, totalCostBeforeProfit, totalPrice } = calcBoq({ quantity, materialUnitCost, laborUnitCost, wastePercentage, profitMargin });
    const [item] = await db.insert(projectEstimatesTable).values({ projectId, categoryId: categoryId ?? null, phaseName, itemName, quantity: String(quantity), unit, unitPrice: String(unitCostBeforeProfit), materialUnitCost: String(materialUnitCost), laborUnitCost: String(laborUnitCost), wastePercentage: String(wastePercentage), profitMargin: String(profitMargin), unitCostBeforeProfit: String(unitCostBeforeProfit), totalCostBeforeProfit: String(totalCostBeforeProfit), totalPrice: String(totalPrice), notes }).returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/estimates/:estimateId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const estimateId = parseId(req.params["estimateId"]);
    const existing = await db.select().from(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId)).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "البند غير موجود" }); return; }
    if (!(await checkProjectAccess(existing[0].projectId, user))) { res.status(403).json({ error: "ليس لديك صلاحية تعديل هذا البند" }); return; }
    const { phaseName, itemName, quantity, unit, notes, categoryId, materialUnitCost = 0, laborUnitCost = 0, wastePercentage = 0, profitMargin = 0 } = req.body as { phaseName: string; itemName: string; quantity: number; unit?: string; notes?: string; categoryId?: number | null; materialUnitCost?: number; laborUnitCost?: number; wastePercentage?: number; profitMargin?: number; };
    const { unitCostBeforeProfit, totalCostBeforeProfit, totalPrice } = calcBoq({ quantity, materialUnitCost, laborUnitCost, wastePercentage, profitMargin });
    const [updated] = await db.update(projectEstimatesTable).set({ categoryId: categoryId !== undefined ? categoryId : existing[0].categoryId, phaseName, itemName, quantity: String(quantity), unit, unitPrice: String(unitCostBeforeProfit), materialUnitCost: String(materialUnitCost), laborUnitCost: String(laborUnitCost), wastePercentage: String(wastePercentage), profitMargin: String(profitMargin), unitCostBeforeProfit: String(unitCostBeforeProfit), totalCostBeforeProfit: String(totalCostBeforeProfit), totalPrice: String(totalPrice), notes, updatedAt: new Date() }).where(eq(projectEstimatesTable.id, estimateId)).returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/estimates/:estimateId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const estimateId = parseId(req.params["estimateId"]);
    const existing = await db.select().from(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId)).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "البند غير موجود" }); return; }
    if (!(await checkProjectAccess(existing[0].projectId, user))) { res.status(403).json({ error: "ليس لديك صلاحية حذف هذا البند" }); return; }
    await db.delete(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId));
    res.json({ success: true, message: "تم حذف البند بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
