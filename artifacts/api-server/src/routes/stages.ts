import { Router } from "express";
import { db } from "@workspace/db";
import { projectStagesTable, projectsTable, stageApprovalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

async function checkProjectAccess(projectId: number, userId: { role: string; officeId: number | null }): Promise<boolean> {
  if (userId.role === "super_admin") return true;
  if (!userId.officeId) return false;
  const rows = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  return rows[0]?.officeId === userId.officeId;
}

router.get("/projects/:id/stages", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);

    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لمراحل هذا المشروع" });
      return;
    }

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

router.get("/projects/:id/approvals", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);

    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }

    const approvals = await db
      .select()
      .from(stageApprovalsTable)
      .where(eq(stageApprovalsTable.projectId, projectId));
    res.json(approvals);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/stages/:stageId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const stageId = parseInt(req.params["stageId"]!);

    const stage = await db.select().from(projectStagesTable).where(eq(projectStagesTable.id, stageId)).limit(1);
    if (!stage[0]) {
      res.status(404).json({ error: "المرحلة غير موجودة" });
      return;
    }

    if (!(await checkProjectAccess(stage[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية تعديل هذه المرحلة" });
      return;
    }

    const { status, notes, clientFeedback } = req.body as {
      status?: string; notes?: string; clientFeedback?: string;
    };
    const [updated] = await db
      .update(projectStagesTable)
      .set({ status, notes, clientFeedback, updatedAt: new Date() })
      .where(eq(projectStagesTable.id, stageId))
      .returning();

    if (status === "في انتظار موافقة العميل") {
      const project = await db
        .select({ clientId: projectsTable.clientId })
        .from(projectsTable)
        .where(eq(projectsTable.id, stage[0].projectId))
        .limit(1);

      const clientId = project[0]?.clientId;
      if (clientId) {
        const existing = await db
          .select({ id: stageApprovalsTable.id })
          .from(stageApprovalsTable)
          .where(and(eq(stageApprovalsTable.stageId, stageId), eq(stageApprovalsTable.clientId, clientId)))
          .limit(1);

        if (!existing[0]) {
          await db.insert(stageApprovalsTable).values({
            projectId: stage[0].projectId,
            stageId,
            clientId,
            approvalStatus: "pending",
          });
        } else {
          await db
            .update(stageApprovalsTable)
            .set({ approvalStatus: "pending", approvedAt: null, comment: null, updatedAt: new Date() })
            .where(eq(stageApprovalsTable.id, existing[0].id));
        }
      }
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
