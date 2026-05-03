import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken, authMiddleware } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
      return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = (req as typeof req & { user: { id: number } }).user;
    const users = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (!users[0]) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const { passwordHash, ...safe } = users[0];
    void passwordHash;
    res.json(safe);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
