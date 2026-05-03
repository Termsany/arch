import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, clientsTable, projectStagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../lib/auth";

const DEFAULT_STAGES = [
  "الاتفاق مع العميل وتحديد نوع التصميم",
  "الاتفاق على سعر متر التصميم",
  "المعاينة ورفع المقاسات",
  "رسم Plan 2D",
  "Mood Board",
  "التصميم 3D",
  "إرسال التصميم للعميل وأخذ موافقة أو تعديل",
  "Shop Drawing واللوحات التنفيذية",
  "المقايسة على مراحل التنفيذ",
  "التنفيذ",
  "اختيار الفرش والمطبخ والحمام ومشتملات التشطيب",
  "التسليم النهائي",
];

const router = Router();

router.get("/projects", authMiddleware, async (req, res) => {
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
      .orderBy(sql`${projectsTable.createdAt} DESC`);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects", authMiddleware, async (req, res) => {
  try {
    const { clientId, projectName, designType, areaMeters, pricePerMeter, projectStatus, startDate, notes } = req.body as {
      clientId: number; projectName: string; designType: string; areaMeters?: number;
      pricePerMeter?: number; projectStatus: string; startDate?: string; notes?: string;
    };
    const totalDesignPrice = areaMeters && pricePerMeter ? String(areaMeters * pricePerMeter) : null;
    const [project] = await db
      .insert(projectsTable)
      .values({
        clientId,
        projectName,
        designType,
        areaMeters: areaMeters ? String(areaMeters) : null,
        pricePerMeter: pricePerMeter ? String(pricePerMeter) : null,
        totalDesignPrice,
        projectStatus: projectStatus || "جديد",
        startDate: startDate || null,
        notes,
      })
      .returning();

    // Create default workflow stages
    await db.insert(projectStagesTable).values(
      DEFAULT_STAGES.map((stageName, index) => ({
        projectId: project!.id,
        stageOrder: index + 1,
        stageName,
        status: "لم تبدأ",
      }))
    );

    res.status(201).json(project);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
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
      .where(eq(projectsTable.id, id))
      .limit(1);
    if (!projects[0]) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    res.json(projects[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    const { clientId, projectName, designType, areaMeters, pricePerMeter, projectStatus, startDate, notes } = req.body as {
      clientId: number; projectName: string; designType: string; areaMeters?: number;
      pricePerMeter?: number; projectStatus: string; startDate?: string; notes?: string;
    };
    const totalDesignPrice = areaMeters && pricePerMeter ? String(areaMeters * pricePerMeter) : null;
    const [updated] = await db
      .update(projectsTable)
      .set({
        clientId,
        projectName,
        designType,
        areaMeters: areaMeters ? String(areaMeters) : null,
        pricePerMeter: pricePerMeter ? String(pricePerMeter) : null,
        totalDesignPrice,
        projectStatus,
        startDate: startDate || null,
        notes,
        updatedAt: new Date(),
      })
      .where(eq(projectsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params["id"]!);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.json({ success: true, message: "تم حذف المشروع بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
