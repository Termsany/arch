import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, projectStagesTable, projectsTable, stageApprovalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";
import { validateBody } from "../lib/http";
import { stageUpdateSchema } from "../lib/validation";
import { createNotification } from "../lib/notifications";
import { renderWhatsAppTemplateByKey, sendWhatsAppMessage } from "../lib/whatsapp";

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
    const projectId = parseInt(String(req.params["id"]));

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
    const projectId = parseInt(String(req.params["id"]));

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

router.put("/stages/:stageId", authMiddleware, validateBody(stageUpdateSchema), async (req, res) => {
  try {
    const user = getUser(req);
    const stageId = parseInt(String(req.params["stageId"]));

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
        .select({ clientId: projectsTable.clientId, officeId: projectsTable.officeId, projectName: projectsTable.projectName, clientName: clientsTable.name, clientPhone: clientsTable.phone })
        .from(projectsTable)
        .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
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
        await createNotification({
          officeId: project[0]?.officeId ?? null,
          clientId,
          projectId: stage[0].projectId,
          title: "موافقة مطلوبة",
          message: `مرحلة "${stage[0].stageName}" في مشروع "${project[0]?.projectName ?? ""}" تنتظر موافقتك.`,
          notificationType: "stage_waiting_client",
        });
        const officeId = project[0]?.officeId ?? null;
        const phone = project[0]?.clientPhone;
        if (officeId && phone) {
          const body = await renderWhatsAppTemplateByKey(officeId, "client_approval_request", {
            client_name: project[0]?.clientName,
            stage_name: stage[0].stageName,
            project_name: project[0]?.projectName,
            portal_link: `${process.env["FRONTEND_URL"]?.split(",")[0] || "http://localhost:5173"}/client/projects/${stage[0].projectId}`,
          });
          if (body) {
            await sendWhatsAppMessage({
              officeId,
              phone,
              messageBody: body,
              messageType: "client_approval_request",
              projectId: stage[0].projectId,
              clientId,
              sentBy: user.id,
            }).catch(() => undefined);
          }
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
