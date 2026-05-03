import { Router } from "express";
import { db } from "@workspace/db";
import { projectEstimatesTable, projectsTable } from "@workspace/db";
import { eq, sum } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

async function checkProjectAccess(projectId: number, user: { role: string; officeId: number | null }): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (!user.officeId) return false;
  const rows = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  return rows[0]?.officeId === user.officeId;
}

router.get("/projects/:id/estimates", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);

    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لمقايسات هذا المشروع" });
      return;
    }

    const items = await db
      .select()
      .from(projectEstimatesTable)
      .where(eq(projectEstimatesTable.projectId, projectId))
      .orderBy(projectEstimatesTable.createdAt);

    const totalRes = await db
      .select({ total: sum(projectEstimatesTable.totalPrice) })
      .from(projectEstimatesTable)
      .where(eq(projectEstimatesTable.projectId, projectId));

    res.json({ items, totalCost: Number(totalRes[0]?.total ?? 0) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects/:id/estimates", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);

    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية إضافة بنود لهذا المشروع" });
      return;
    }

    const { phaseName, itemName, quantity, unit, unitPrice, notes } = req.body as {
      phaseName: string; itemName: string; quantity: number; unit?: string; unitPrice: number; notes?: string;
    };
    const totalPrice = String(quantity * unitPrice);
    const [item] = await db
      .insert(projectEstimatesTable)
      .values({
        projectId,
        phaseName,
        itemName,
        quantity: String(quantity),
        unit,
        unitPrice: String(unitPrice),
        totalPrice,
        notes,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/estimates/:estimateId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const estimateId = parseInt(req.params["estimateId"]!);

    const existing = await db.select().from(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "البند غير موجود" });
      return;
    }

    if (!(await checkProjectAccess(existing[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية تعديل هذا البند" });
      return;
    }

    const { phaseName, itemName, quantity, unit, unitPrice, notes } = req.body as {
      phaseName: string; itemName: string; quantity: number; unit?: string; unitPrice: number; notes?: string;
    };
    const totalPrice = String(quantity * unitPrice);
    const [updated] = await db
      .update(projectEstimatesTable)
      .set({ phaseName, itemName, quantity: String(quantity), unit, unitPrice: String(unitPrice), totalPrice, notes, updatedAt: new Date() })
      .where(eq(projectEstimatesTable.id, estimateId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/estimates/:estimateId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const estimateId = parseInt(req.params["estimateId"]!);

    const existing = await db.select().from(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "البند غير موجود" });
      return;
    }

    if (!(await checkProjectAccess(existing[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية حذف هذا البند" });
      return;
    }

    await db.delete(projectEstimatesTable).where(eq(projectEstimatesTable.id, estimateId));
    res.json({ success: true, message: "تم حذف البند بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
