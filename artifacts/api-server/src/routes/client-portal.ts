import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectsTable,
  clientsTable,
  projectStagesTable,
  clientFeedbackTable,
  stageApprovalsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { clientPortalMiddleware, getUser } from "../lib/auth";

const router = Router();

async function assertClientOwnsProject(projectId: number, clientId: number): Promise<boolean> {
  const rows = await db
    .select({ clientId: projectsTable.clientId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  return rows[0]?.clientId === clientId;
}

router.get("/client-portal/projects", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    if (!user.clientId) {
      res.status(403).json({ error: "حساب العميل غير مرتبط بعميل" });
      return;
    }
    const projects = await db
      .select({
        id: projectsTable.id,
        projectName: projectsTable.projectName,
        designType: projectsTable.designType,
        projectStatus: projectsTable.projectStatus,
        startDate: projectsTable.startDate,
        areaMeters: projectsTable.areaMeters,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .where(eq(projectsTable.clientId, user.clientId))
      .orderBy(sql`${projectsTable.createdAt} DESC`);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/client-portal/projects/:id", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);
    if (!user.clientId || !(await assertClientOwnsProject(projectId, user.clientId))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لهذا المشروع" });
      return;
    }
    const rows = await db
      .select({
        id: projectsTable.id,
        projectName: projectsTable.projectName,
        designType: projectsTable.designType,
        projectStatus: projectsTable.projectStatus,
        startDate: projectsTable.startDate,
        areaMeters: projectsTable.areaMeters,
        createdAt: projectsTable.createdAt,
      })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/client-portal/projects/:id/stages", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);
    if (!user.clientId || !(await assertClientOwnsProject(projectId, user.clientId))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const stages = await db
      .select({
        id: projectStagesTable.id,
        projectId: projectStagesTable.projectId,
        stageOrder: projectStagesTable.stageOrder,
        stageName: projectStagesTable.stageName,
        status: projectStagesTable.status,
        updatedAt: projectStagesTable.updatedAt,
        approvalId: stageApprovalsTable.id,
        approvalStatus: stageApprovalsTable.approvalStatus,
        approvalComment: stageApprovalsTable.comment,
        approvedAt: stageApprovalsTable.approvedAt,
      })
      .from(projectStagesTable)
      .leftJoin(
        stageApprovalsTable,
        and(
          eq(stageApprovalsTable.stageId, projectStagesTable.id),
          eq(stageApprovalsTable.clientId, user.clientId)
        )
      )
      .where(eq(projectStagesTable.projectId, projectId))
      .orderBy(projectStagesTable.stageOrder);
    res.json(stages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/client-portal/projects/:id/feedback", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);
    if (!user.clientId || !(await assertClientOwnsProject(projectId, user.clientId))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
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

router.post("/client-portal/stages/:stageId/approve", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const stageId = parseInt(req.params["stageId"]!);
    const { comment } = req.body as { comment?: string };

    if (!user.clientId) {
      res.status(403).json({ error: "حساب العميل غير مرتبط" });
      return;
    }

    const stage = await db.select().from(projectStagesTable).where(eq(projectStagesTable.id, stageId)).limit(1);
    if (!stage[0]) {
      res.status(404).json({ error: "المرحلة غير موجودة" });
      return;
    }
    if (!(await assertClientOwnsProject(stage[0].projectId, user.clientId))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }

    const existing = await db
      .select()
      .from(stageApprovalsTable)
      .where(and(eq(stageApprovalsTable.stageId, stageId), eq(stageApprovalsTable.clientId, user.clientId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(stageApprovalsTable)
        .set({ approvalStatus: "approved", comment: comment || null, approvedAt: new Date(), updatedAt: new Date() })
        .where(eq(stageApprovalsTable.id, existing[0].id));
    } else {
      await db.insert(stageApprovalsTable).values({
        projectId: stage[0].projectId,
        stageId,
        clientId: user.clientId,
        approvalStatus: "approved",
        comment: comment || null,
        approvedAt: new Date(),
      });
    }

    await db
      .update(projectStagesTable)
      .set({ status: "تمت الموافقة", updatedAt: new Date() })
      .where(eq(projectStagesTable.id, stageId));

    await db.insert(clientFeedbackTable).values({
      projectId: stage[0].projectId,
      stageId,
      feedbackText: comment || "تمت الموافقة على المرحلة",
      feedbackType: "موافقة",
    });

    res.json({ success: true, message: "تمت الموافقة على المرحلة بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/client-portal/stages/:stageId/request-revision", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const stageId = parseInt(req.params["stageId"]!);
    const { comment } = req.body as { comment: string };

    if (!user.clientId) {
      res.status(403).json({ error: "حساب العميل غير مرتبط" });
      return;
    }
    if (!comment?.trim()) {
      res.status(400).json({ error: "يرجى كتابة ملاحظة التعديل" });
      return;
    }

    const stage = await db.select().from(projectStagesTable).where(eq(projectStagesTable.id, stageId)).limit(1);
    if (!stage[0]) {
      res.status(404).json({ error: "المرحلة غير موجودة" });
      return;
    }
    if (!(await assertClientOwnsProject(stage[0].projectId, user.clientId))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }

    const existing = await db
      .select()
      .from(stageApprovalsTable)
      .where(and(eq(stageApprovalsTable.stageId, stageId), eq(stageApprovalsTable.clientId, user.clientId)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(stageApprovalsTable)
        .set({ approvalStatus: "revision_requested", comment, approvedAt: null, updatedAt: new Date() })
        .where(eq(stageApprovalsTable.id, existing[0].id));
    } else {
      await db.insert(stageApprovalsTable).values({
        projectId: stage[0].projectId,
        stageId,
        clientId: user.clientId,
        approvalStatus: "revision_requested",
        comment,
      });
    }

    await db
      .update(projectStagesTable)
      .set({ status: "يحتاج تعديل", updatedAt: new Date() })
      .where(eq(projectStagesTable.id, stageId));

    await db.insert(clientFeedbackTable).values({
      projectId: stage[0].projectId,
      stageId,
      feedbackText: comment,
      feedbackType: "تعديل",
    });

    res.json({ success: true, message: "تم إرسال طلب التعديل بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
