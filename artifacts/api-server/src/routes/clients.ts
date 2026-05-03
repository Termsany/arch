import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authMiddleware, getUser, hashPassword } from "../lib/auth";
import { getOfficeSubscription } from "../lib/subscription";
import { validateBody } from "../lib/http";
import { clientSchema, portalUserSchema } from "../lib/validation";
import { createNotification } from "../lib/notifications";

const router = Router();

router.get("/clients", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const isSuperAdmin = user.role === "super_admin";

    if (!isSuperAdmin && !user.officeId) {
      res.json([]);
      return;
    }

    const clients = await db
      .select()
      .from(clientsTable)
      .where(!isSuperAdmin ? eq(clientsTable.officeId, user.officeId!) : undefined)
      .orderBy(clientsTable.createdAt);
    res.json(clients);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/clients", authMiddleware, validateBody(clientSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const { name, phone, email, address, notes } = req.body as {
      name: string; phone?: string; email?: string; address?: string; notes?: string;
    };
    const officeId = user.role === "super_admin" ? (req.body.officeId ?? null) : user.officeId;

    if (user.role !== "super_admin" && officeId) {
      const sub = await getOfficeSubscription(officeId);
      if (sub) {
        if (sub.subscriptionStatus !== "active" && sub.subscriptionStatus !== "trial") {
          res.status(403).json({ error: "اشتراكك غير نشط. يرجى تجديد الاشتراك لإضافة عملاء جدد." });
          return;
        }
        if (sub.maxClients && sub.maxClients > 0) {
          const [{ total }] = await db.select({ total: count() }).from(clientsTable).where(eq(clientsTable.officeId, officeId));
          if (total >= sub.maxClients) {
            await createNotification({
              officeId,
              title: "حد الاشتراك",
              message: `وصل المكتب إلى الحد الأقصى للعملاء في الخطة الحالية (${sub.maxClients} عملاء).`,
              notificationType: "subscription_limit",
            });
            res.status(403).json({ error: `وصلت إلى الحد الأقصى للعملاء في خطتك (${sub.maxClients} عملاء). يرجى الترقية للحصول على مزيد من العملاء.` });
            return;
          }
        }
      }
    }
    const [client] = await db
      .insert(clientsTable)
      .values({ name, phone, email, address, notes, officeId })
      .returning();
    res.status(201).json(client);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/clients/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);
    const clients = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!clients[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && clients[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لهذا العميل" });
      return;
    }
    res.json(clients[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/clients/:id", authMiddleware, validateBody(clientSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);

    const existing = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && existing[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية تعديل هذا العميل" });
      return;
    }

    const { name, phone, email, address, notes } = req.body as {
      name: string; phone?: string; email?: string; address?: string; notes?: string;
    };
    const [updated] = await db
      .update(clientsTable)
      .set({ name, phone, email, address, notes, updatedAt: new Date() })
      .where(eq(clientsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/clients/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = Number(req.params["id"]);

    const existing = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && existing[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية حذف هذا العميل" });
      return;
    }

    await db.delete(clientsTable).where(eq(clientsTable.id, id));
    res.json({ success: true, message: "تم حذف العميل بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/clients/:id/portal-user", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const clientId = Number(req.params["id"]);

    const client = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (!client[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && client[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }

    const portalUsers = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.clientId, clientId))
      .limit(1);

    res.json(portalUsers[0] ?? null);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/clients/:id/portal-user", authMiddleware, validateBody(portalUserSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const clientId = Number(req.params["id"]);
    const { email, password } = req.body as { email: string; password: string };

    const client = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (!client[0]) {
      res.status(404).json({ error: "العميل غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && client[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clientId, clientId))
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(usersTable)
        .set({ email, passwordHash, updatedAt: new Date() })
        .where(eq(usersTable.id, existing[0].id))
        .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role });
      res.json({ success: true, user: updated, isNew: false });
    } else {
      const [created] = await db
        .insert(usersTable)
        .values({
          name: client[0].name,
          email,
          passwordHash,
          role: "client",
          officeId: client[0].officeId,
          clientId,
        })
        .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, role: usersTable.role });
      res.status(201).json({ success: true, user: created, isNew: true });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
