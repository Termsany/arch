import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, clientsTable, projectStagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../lib/auth";

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

const PROJECT_COLS = {
  id: projectsTable.id,
  clientId: projectsTable.clientId,
  officeId: projectsTable.officeId,
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
};

const router = Router();

router.get("/projects", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const isSuperAdmin = user.role === "super_admin";

    if (!isSuperAdmin && !user.officeId) {
      res.json([]);
      return;
    }

    const projects = await db
      .select(PROJECT_COLS)
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(!isSuperAdmin ? eq(projectsTable.officeId, user.officeId!) : undefined)
      .orderBy(sql`${projectsTable.createdAt} DESC`);
    res.json(projects);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const { clientId, projectName, designType, areaMeters, pricePerMeter, projectStatus, startDate, notes } = req.body as {
      clientId: number; projectName: string; designType: string; areaMeters?: number;
      pricePerMeter?: number; projectStatus: string; startDate?: string; notes?: string;
    };

    const officeId = user.role === "super_admin" ? (req.body.officeId ?? null) : user.officeId;
    const totalDesignPrice = areaMeters && pricePerMeter ? String(areaMeters * pricePerMeter) : null;

    const [project] = await db
      .insert(projectsTable)
      .values({
        clientId,
        officeId,
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
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);
    const projects = await db
      .select(PROJECT_COLS)
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(projectsTable.id, id))
      .limit(1);

    if (!projects[0]) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && projects[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لهذا المشروع" });
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
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);

    const existing = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && existing[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية تعديل هذا المشروع" });
      return;
    }

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
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/projects/:id", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const id = parseInt(req.params["id"]!);

    const existing = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "المشروع غير موجود" });
      return;
    }
    if (user.role !== "super_admin" && existing[0].officeId !== user.officeId) {
      res.status(403).json({ error: "ليس لديك صلاحية حذف هذا المشروع" });
      return;
    }

    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.json({ success: true, message: "تم حذف المشروع بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
