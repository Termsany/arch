import { Router } from "express";
import { db } from "@workspace/db";
import { boqCategoriesTable, boqItemsLibraryTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

function officeFilter(user: { role: string; officeId: number | null }) {
  if (user.role === "super_admin") return undefined;
  return user.officeId;
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

router.get("/boq/categories", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const oid = officeFilter(user);
    const rows = await db
      .select()
      .from(boqCategoriesTable)
      .where(oid !== undefined ? eq(boqCategoriesTable.officeId, oid) : undefined)
      .orderBy(asc(boqCategoriesTable.sortOrder), asc(boqCategoriesTable.name));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/boq/categories", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const { name, description, sortOrder } = req.body as { name: string; description?: string; sortOrder?: number };
    const officeId = user.role === "super_admin" ? (req.body.officeId ?? null) : user.officeId;
    const [row] = await db
      .insert(boqCategoriesTable)
      .values({ name, description, sortOrder: sortOrder ?? 0, officeId })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/boq/categories/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);
    const cat = await db.select().from(boqCategoriesTable).where(eq(boqCategoriesTable.id, id)).limit(1);
    if (!cat[0]) { res.status(404).json({ error: "التصنيف غير موجود" }); return; }
    if (user.role !== "super_admin" && cat[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية" }); return;
    }
    const { name, description, sortOrder } = req.body as { name?: string; description?: string; sortOrder?: number };
    const [updated] = await db
      .update(boqCategoriesTable)
      .set({ name: name ?? cat[0].name, description: description ?? cat[0].description, sortOrder: sortOrder ?? cat[0].sortOrder, updatedAt: new Date() })
      .where(eq(boqCategoriesTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/boq/categories/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);
    const cat = await db.select().from(boqCategoriesTable).where(eq(boqCategoriesTable.id, id)).limit(1);
    if (!cat[0]) { res.status(404).json({ error: "التصنيف غير موجود" }); return; }
    if (user.role !== "super_admin" && cat[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية" }); return;
    }
    await db.delete(boqCategoriesTable).where(eq(boqCategoriesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// ─── LIBRARY ITEMS ────────────────────────────────────────────────────────────

router.get("/boq/library", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const oid = officeFilter(user);
    const rows = await db
      .select({
        id: boqItemsLibraryTable.id,
        officeId: boqItemsLibraryTable.officeId,
        categoryId: boqItemsLibraryTable.categoryId,
        categoryName: boqCategoriesTable.name,
        itemName: boqItemsLibraryTable.itemName,
        defaultUnit: boqItemsLibraryTable.defaultUnit,
        defaultMaterialCost: boqItemsLibraryTable.defaultMaterialCost,
        defaultLaborCost: boqItemsLibraryTable.defaultLaborCost,
        defaultWastePercentage: boqItemsLibraryTable.defaultWastePercentage,
        defaultProfitMargin: boqItemsLibraryTable.defaultProfitMargin,
        notes: boqItemsLibraryTable.notes,
        createdAt: boqItemsLibraryTable.createdAt,
      })
      .from(boqItemsLibraryTable)
      .leftJoin(boqCategoriesTable, eq(boqItemsLibraryTable.categoryId, boqCategoriesTable.id))
      .where(oid !== undefined ? eq(boqItemsLibraryTable.officeId, oid) : undefined)
      .orderBy(asc(boqCategoriesTable.sortOrder), asc(boqItemsLibraryTable.itemName));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/boq/library", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const officeId = user.role === "super_admin" ? (req.body.officeId ?? null) : user.officeId;
    const { categoryId, itemName, defaultUnit, defaultMaterialCost, defaultLaborCost, defaultWastePercentage, defaultProfitMargin, notes } = req.body as {
      categoryId?: number; itemName: string; defaultUnit?: string;
      defaultMaterialCost?: number; defaultLaborCost?: number;
      defaultWastePercentage?: number; defaultProfitMargin?: number; notes?: string;
    };
    const [row] = await db
      .insert(boqItemsLibraryTable)
      .values({
        officeId,
        categoryId: categoryId ?? null,
        itemName,
        defaultUnit,
        defaultMaterialCost: String(defaultMaterialCost ?? 0),
        defaultLaborCost: String(defaultLaborCost ?? 0),
        defaultWastePercentage: String(defaultWastePercentage ?? 0),
        defaultProfitMargin: String(defaultProfitMargin ?? 0),
        notes,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/boq/library/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);
    const item = await db.select().from(boqItemsLibraryTable).where(eq(boqItemsLibraryTable.id, id)).limit(1);
    if (!item[0]) { res.status(404).json({ error: "البند غير موجود" }); return; }
    if (user.role !== "super_admin" && item[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية" }); return;
    }
    const { categoryId, itemName, defaultUnit, defaultMaterialCost, defaultLaborCost, defaultWastePercentage, defaultProfitMargin, notes } = req.body as {
      categoryId?: number | null; itemName?: string; defaultUnit?: string;
      defaultMaterialCost?: number; defaultLaborCost?: number;
      defaultWastePercentage?: number; defaultProfitMargin?: number; notes?: string;
    };
    const [updated] = await db
      .update(boqItemsLibraryTable)
      .set({
        categoryId: categoryId !== undefined ? categoryId : item[0].categoryId,
        itemName: itemName ?? item[0].itemName,
        defaultUnit: defaultUnit ?? item[0].defaultUnit,
        defaultMaterialCost: defaultMaterialCost !== undefined ? String(defaultMaterialCost) : item[0].defaultMaterialCost,
        defaultLaborCost: defaultLaborCost !== undefined ? String(defaultLaborCost) : item[0].defaultLaborCost,
        defaultWastePercentage: defaultWastePercentage !== undefined ? String(defaultWastePercentage) : item[0].defaultWastePercentage,
        defaultProfitMargin: defaultProfitMargin !== undefined ? String(defaultProfitMargin) : item[0].defaultProfitMargin,
        notes: notes ?? item[0].notes,
        updatedAt: new Date(),
      })
      .where(eq(boqItemsLibraryTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/boq/library/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);
    const item = await db.select().from(boqItemsLibraryTable).where(eq(boqItemsLibraryTable.id, id)).limit(1);
    if (!item[0]) { res.status(404).json({ error: "البند غير موجود" }); return; }
    if (user.role !== "super_admin" && item[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية" }); return;
    }
    await db.delete(boqItemsLibraryTable).where(eq(boqItemsLibraryTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
