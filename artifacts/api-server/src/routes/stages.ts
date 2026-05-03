import { Router } from "express";
import { db } from "@workspace/db";
import { projectStagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/projects/:id/stages", authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params["id"]!);
    const stages = await db
      .select()
      .from(projectStagesTable)
      .where(eq(projectStagesTable.projectId, projectId))
      .orderBy(projectStagesTable.stageOrder);
    res.json(stages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/stages/:stageId", authMiddleware, async (req, res) => {
  try {
    const stageId = parseInt(req.params["stageId"]!);
    const { status, notes, clientFeedback } = req.body as {
      status?: string; notes?: string; clientFeedback?: string;
    };
    const [updated] = await db
      .update(projectStagesTable)
      .set({ status, notes, clientFeedback, updatedAt: new Date() })
      .where(eq(projectStagesTable.id, stageId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "المرحلة غير موجودة" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
