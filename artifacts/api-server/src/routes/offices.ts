import { Router } from "express";
import { db } from "@workspace/db";
import { officesTable, subscriptionPlansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { validateBody } from "../lib/http";
import { officeSchema } from "../lib/validation";
import { logAudit } from "../lib/audit";

const router = Router();

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
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

router.post("/offices", authMiddleware, validateBody(officeSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const body = req.body as Record<string, unknown>;
    const subscriptionStatus = (body["subscriptionStatus"] as string) || "trial";
    const subscriptionStart = (body["subscriptionStart"] as string | null) || toDateString(new Date());
    const subscriptionEnd = (body["subscriptionEnd"] as string | null) || (subscriptionStatus === "trial" ? addDays(subscriptionStart, 14) : null);
    const [office] = await db
      .insert(officesTable)
      .values({
        officeName: body["officeName"] as string,
        ownerName: (body["ownerName"] as string) || null,
        phone: (body["phone"] as string) || null,
        email: (body["email"] as string) || null,
        address: (body["address"] as string) || null,
        planId: body["planId"] ? Number(body["planId"]) : null,
        subscriptionStatus,
        subscriptionStart,
        subscriptionEnd,
      })
      .returning();
    await logAudit({
      office_id: office?.id ?? null,
      user_id: user.id,
      action: "office.create",
      entity_type: "office",
      entity_id: office?.id ?? null,
      new_value: office,
      req,
    });
    res.status(201).json(office);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
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
      res.status(404).json({ error: "المكتب غير موجود" });
      return;
    }
    res.json(offices[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
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
        email: (body["email"] as string) || null,
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
      res.status(404).json({ error: "المكتب غير موجود" });
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
    res.status(500).json({ error: "حدث خطأ في الخادم" });
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
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
