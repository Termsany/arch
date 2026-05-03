import { Router } from "express";
import { db } from "@workspace/db";
import { officesTable, subscriptionPlansTable, clientsTable, projectsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

const router = Router();

router.get("/subscription/my", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);

    if (user.role === "super_admin") {
      res.json({ isSuperAdmin: true });
      return;
    }

    if (!user.officeId) {
      res.status(404).json({ error: "لم يتم تعيين مكتب لهذا الحساب" });
      return;
    }

    const rows = await db
      .select({
        officeId: officesTable.id,
        officeName: officesTable.officeName,
        subscriptionStatus: officesTable.subscriptionStatus,
        subscriptionStart: officesTable.subscriptionStart,
        subscriptionEnd: officesTable.subscriptionEnd,
        planId: officesTable.planId,
        planName: subscriptionPlansTable.nameAr,
        monthlyPrice: subscriptionPlansTable.monthlyPrice,
        maxUsers: subscriptionPlansTable.maxUsers,
        maxProjects: subscriptionPlansTable.maxProjects,
        maxClients: subscriptionPlansTable.maxClients,
        storageLimitMb: subscriptionPlansTable.storageLimitMb,
        hasClientPortal: subscriptionPlansTable.hasClientPortal,
        hasPdfReports: subscriptionPlansTable.hasPdfReports,
        hasTeamRoles: subscriptionPlansTable.hasTeamRoles,
        hasAdvancedEstimates: subscriptionPlansTable.hasAdvancedEstimates,
        hasWhatsappNotifications: subscriptionPlansTable.hasWhatsappNotifications,
      })
      .from(officesTable)
      .leftJoin(subscriptionPlansTable, eq(officesTable.planId, subscriptionPlansTable.id))
      .where(eq(officesTable.id, user.officeId))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "المكتب غير موجود" });
      return;
    }

    const [projectsCount, clientsCount] = await Promise.all([
      db.select({ total: count() }).from(projectsTable).where(eq(projectsTable.officeId, user.officeId)),
      db.select({ total: count() }).from(clientsTable).where(eq(clientsTable.officeId, user.officeId)),
    ]);

    res.json({
      isSuperAdmin: false,
      ...rows[0],
      currentProjects: projectsCount[0]?.total ?? 0,
      currentClients: clientsCount[0]?.total ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
