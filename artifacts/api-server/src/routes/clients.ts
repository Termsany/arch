import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/clients", authMiddleware, async (req, res) => {
  try {
    const clients = await db.select().from(clientsTable).orderBy(clientsTable.createdAt);
    res.json(clients);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/clients", authMiddleware, async (req, res) => {
  try {
    const { name, phone, email, address, notes } = req.body as {
      name: string; phone?: string; email?: string; address?: string; notes?: string;
    };
    if (!name) {
      res.status(400).json({ error: "اسم العميل مطلوب" });
      return;
    }
    const [client] = await db.insert(clientsTable).values({ name, phone, email, address, notes }).returning();
    res.status(201).json(client);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/clients/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const clients = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!clients[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    res.json(clients[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/clients/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { name, phone, email, address, notes } = req.body as {
      name: string; phone?: string; email?: string; address?: string; notes?: string;
    };
    const [updated] = await db
      .update(clientsTable)
      .set({ name, phone, email, address, notes, updatedAt: new Date() })
      .where(eq(clientsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/clients/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db.delete(clientsTable).where(eq(clientsTable.id, id));
    res.json({ success: true, message: "تم حذف العميل بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
