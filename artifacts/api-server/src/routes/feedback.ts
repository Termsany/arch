import { Router } from "express";
import { db } from "@workspace/db";
import { clientFeedbackTable, projectStagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/projects/:id/feedback", authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params["id"]!);
    const feedbacks = await db
      .select({
        id: clientFeedbackTable.id,
        projectId: clientFeedbackTable.projectId,
        stageId: clientFeedbackTable.stageId,
        stageName: projectStagesTable.stageName,
        feedbackText: clientFeedbackTable.feedbackText,
        feedbackType: clientFeedbackTable.feedbackType,
        createdAt: clientFeedbackTable.createdAt,
      })
      .from(clientFeedbackTable)
      .leftJoin(projectStagesTable, eq(clientFeedbackTable.stageId, projectStagesTable.id))
      .where(eq(clientFeedbackTable.projectId, projectId))
      .orderBy(sql`${clientFeedbackTable.createdAt} DESC`);
    res.json(feedbacks);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects/:id/feedback", authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params["id"]!);
    const { stageId, feedbackText, feedbackType } = req.body as {
      stageId?: number; feedbackText: string; feedbackType: string;
    };
    if (!feedbackText || !feedbackType) {
      res.status(400).json({ error: "نص الملاحظة ونوعها مطلوبان" });
      return;
    }
    const [feedback] = await db
      .insert(clientFeedbackTable)
      .values({ projectId, stageId: stageId || null, feedbackText, feedbackType })
      .returning();
    res.status(201).json(feedback);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
