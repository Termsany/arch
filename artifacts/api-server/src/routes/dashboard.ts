import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable, projectsTable, subscriptionPlansTable, officesTable } from "@workspace/db";
import { eq, count, sql, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

router.get("/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const isSuperAdmin = user.role === "super_admin";
    const officeId = user.officeId;

    const clientFilter = !isSuperAdmin && officeId ? eq(clientsTable.officeId, officeId) : undefined;
    const projectFilter = !isSuperAdmin && officeId ? eq(projectsTable.officeId, officeId) : undefined;

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
      db.select({ count: count() }).from(clientsTable).where(clientFilter),
      db.select({ count: count() }).from(projectsTable).where(projectFilter),
      db.select({ count: count() }).from(projectsTable).where(
        and(eq(projectsTable.projectStatus, "جاري"), projectFilter)
      ),
      db.select({ count: count() }).from(projectsTable).where(
        and(eq(projectsTable.projectStatus, "في انتظار موافقة العميل"), projectFilter)
      ),
      db.select({ count: count() }).from(projectsTable).where(
        and(eq(projectsTable.projectStatus, "مكتمل"), projectFilter)
      ),
      isSuperAdmin ? db.select({ count: count() }).from(subscriptionPlansTable) : Promise.resolve([{ count: 0 }]),
      isSuperAdmin ? db.select({ count: count() }).from(subscriptionPlansTable).where(eq(subscriptionPlansTable.isActive, true)) : Promise.resolve([{ count: 0 }]),
      isSuperAdmin ? db.select({ count: count() }).from(officesTable) : Promise.resolve([{ count: 0 }]),
      isSuperAdmin ? db.select({ count: count() }).from(officesTable).where(eq(officesTable.subscriptionStatus, "active")) : Promise.resolve([{ count: 0 }]),
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
    const user = getUser(req);
    const isSuperAdmin = user.role === "super_admin";
    const projectFilter = !isSuperAdmin && user.officeId ? eq(projectsTable.officeId, user.officeId) : undefined;

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
      .where(projectFilter)
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
    const user = getUser(req);
    if (user.role !== "super_admin") {
      res.json([]);
      return;
    }
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
    const user = getUser(req);
    const isSuperAdmin = user.role === "super_admin";
    const projectFilter = !isSuperAdmin && user.officeId ? eq(projectsTable.officeId, user.officeId) : undefined;

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
      .where(and(eq(projectsTable.projectStatus, "في انتظار موافقة العميل"), projectFilter))
      .orderBy(sql`${projectsTable.updatedAt} DESC`);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
