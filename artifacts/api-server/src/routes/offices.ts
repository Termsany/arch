import { Router } from "express";
import { db } from "@workspace/db";
import { officesTable, subscriptionPlansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

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
    const body = req.body as Record<string, unknown>;
    const [office] = await db
      .insert(officesTable)
      .values({
        officeName: body["officeName"] as string,
        ownerName: (body["ownerName"] as string) || null,
        phone: (body["phone"] as string) || null,
        email: (body["email"] as string) || null,
        address: (body["address"] as string) || null,
        planId: body["planId"] ? Number(body["planId"]) : null,
        subscriptionStatus: (body["subscriptionStatus"] as string) || "trial",
        subscriptionStart: (body["subscriptionStart"] as string) || null,
        subscriptionEnd: (body["subscriptionEnd"] as string) || null,
      })
      .returning();
    res.status(201).json(office);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/offices/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
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
      res.status(404).json({ error: "المكتب غير موجود" });
      return;
    }
    res.json(offices[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/offices/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const body = req.body as Record<string, unknown>;
    const [updated] = await db
      .update(officesTable)
      .set({
        officeName: body["officeName"] as string,
        ownerName: (body["ownerName"] as string) || null,
        phone: (body["phone"] as string) || null,
        email: (body["email"] as string) || null,
        address: (body["address"] as string) || null,
        planId: body["planId"] ? Number(body["planId"]) : null,
        subscriptionStatus: (body["subscriptionStatus"] as string) || "trial",
        subscriptionStart: (body["subscriptionStart"] as string) || null,
        subscriptionEnd: (body["subscriptionEnd"] as string) || null,
        updatedAt: new Date(),
      })
      .where(eq(officesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "المكتب غير موجود" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/offices/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db.delete(officesTable).where(eq(officesTable.id, id));
    res.json({ success: true, message: "تم حذف المكتب بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
