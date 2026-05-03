import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, projectsTable, subscriptionPlansTable, officesTable, projectStagesTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const [
      totalClientsRes,
      totalProjectsRes,
      activeProjectsRes,
      waitingApprovalRes,
      completedProjectsRes,
      totalPlansRes,
      activePlansRes,
      totalOfficesRes,
      activeSubscriptionsRes,
    ] = await Promise.all([
      db.select({ count: count() }).from(clientsTable),
      db.select({ count: count() }).from(projectsTable),
      db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.projectStatus, "جاري")),
      db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.projectStatus, "في انتظار موافقة العميل")),
      db.select({ count: count() }).from(projectsTable).where(eq(projectsTable.projectStatus, "مكتمل")),
      db.select({ count: count() }).from(subscriptionPlansTable),
      db.select({ count: count() }).from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true)),
      db.select({ count: count() }).from(officesTable),
      db.select({ count: count() }).from(officesTable).where(eq(officesTable.subscriptionStatus, "active")),
    ]);

    res.json({
      totalClients: Number(totalClientsRes[0]?.count ?? 0),
      totalProjects: Number(totalProjectsRes[0]?.count ?? 0),
      activeProjects: Number(activeProjectsRes[0]?.count ?? 0),
      projectsWaitingApproval: Number(waitingApprovalRes[0]?.count ?? 0),
      completedProjects: Number(completedProjectsRes[0]?.count ?? 0),
      totalPlans: Number(totalPlansRes[0]?.count ?? 0),
      activePlans: Number(activePlansRes[0]?.count ?? 0),
      totalOffices: Number(totalOfficesRes[0]?.count ?? 0),
      activeSubscriptions: Number(activeSubscriptionsRes[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/dashboard/recent-projects", authMiddleware, async (req, res) => {
  try {
    const projects = await db
      .select({
        id: projectsTable.id,
        clientId: projectsTable.clientId,
        clientName: clientsTable.name,
        projectName: projectsTable.projectName,
        designType: projectsTable.designType,
        areaMeters: projectsTable.areaMeters,
        pricePerMeter: projectsTable.pricePerMeter,
        totalDesignPrice: projectsTable.totalDesignPrice,
        projectStatus: projectsTable.projectStatus,
        startDate: projectsTable.startDate,
        notes: projectsTable.notes,
        createdAt: projectsTable.createdAt,
        updatedAt: projectsTable.updatedAt,
      })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .orderBy(sql`${projectsTable.createdAt} DESC`)
      .limit(5);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/dashboard/recent-offices", authMiddleware, async (req, res) => {
  try {
    const offices = await db
      .select()
      .from(officesTable)
      .orderBy(sql`${officesTable.createdAt} DESC`)
      .limit(5);
    res.json(offices);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/dashboard/pending-approvals", authMiddleware, async (req, res) => {
  try {
    const projects = await db
      .select({
        id: projectsTable.id,
        clientId: projectsTable.clientId,
        clientName: clientsTable.name,
        projectName: projectsTable.projectName,
        designType: projectsTable.designType,
        areaMeters: projectsTable.areaMeters,
        pricePerMeter: projectsTable.pricePerMeter,
        totalDesignPrice: projectsTable.totalDesignPrice,
        projectStatus: projectsTable.projectStatus,
        startDate: projectsTable.startDate,
        notes: projectsTable.notes,
        createdAt: projectsTable.createdAt,
        updatedAt: projectsTable.updatedAt,
      })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(projectsTable.projectStatus, "في انتظار موافقة العميل"))
      .orderBy(sql`${projectsTable.updatedAt} DESC`);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
