import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { clientsTable, projectFilesTable, projectsTable, projectStagesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, clientPortalMiddleware, getUser } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { deleteStoredFile, saveUploadedFile, UPLOADS_DIR } from "../lib/storage";
import { renderWhatsAppTemplateByKey, sendWhatsAppMessage } from "../lib/whatsapp";
import { logAudit } from "../lib/audit";

const MAX_FILE_SIZE_MB = parseInt(process.env["MAX_FILE_SIZE_MB"] || "25", 10);

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

const ALLOWED_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp",
  ".pdf", ".dwg", ".dxf",
  ".zip", ".rar",
  ".docx", ".xlsx",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTS.has(ext) || ALLOWED_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`نوع الملف غير مسموح به: ${ext}`));
    }
  },
});

function uploadSingleFile(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "تعذر رفع الملف" });
      return;
    }
    next();
  });
}

const router = Router();

async function checkProjectAccess(projectId: number, user: { role: string; officeId: number | null }): Promise<boolean> {
  if (user.role === "super_admin") return true;
  if (!user.officeId) return false;
  const rows = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  return rows[0]?.officeId === user.officeId;
}

async function getProjectOfficeId(projectId: number): Promise<number | null> {
  const rows = await db.select({ officeId: projectsTable.officeId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  return rows[0]?.officeId ?? null;
}

async function getProjectNotificationContext(projectId: number) {
  const rows = await db
    .select({
      officeId: projectsTable.officeId,
      clientId: projectsTable.clientId,
      projectName: projectsTable.projectName,
      clientName: clientsTable.name,
      clientPhone: clientsTable.phone,
    })
    .from(projectsTable)
    .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  return rows[0] ?? null;
}

async function sendClientVisibleFileWhatsApp(input: {
  officeId: number | null;
  clientId: number | null;
  clientName: string | null;
  clientPhone: string | null;
  projectId: number;
  projectName: string;
  sentBy: number;
}) {
  if (!input.officeId || !input.clientId || !input.clientPhone) return;
  const frontendUrl = (process.env["FRONTEND_URL"] || "http://localhost:3000").split(",")[0]?.trim() || "http://localhost:3000";
  const messageBody = await renderWhatsAppTemplateByKey(input.officeId, "file_uploaded", {
    client_name: input.clientName || "عميلنا",
    project_name: input.projectName,
    portal_link: `${frontendUrl}/client/projects/${input.projectId}`,
  });
  if (!messageBody) return;
  await sendWhatsAppMessage({
    officeId: input.officeId,
    phone: input.clientPhone,
    messageBody,
    messageType: "file_uploaded",
    projectId: input.projectId,
    clientId: input.clientId,
    sentBy: input.sentBy,
  });
}

router.get("/uploads/:filename", (req, res) => {
  const filename = req.params["filename"]!;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "الملف غير موجود" });
    return;
  }
  res.sendFile(filePath);
});

router.get("/projects/:id/files", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = Number(req.params["id"]);
    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const files = await db
      .select({
        id: projectFilesTable.id,
        projectId: projectFilesTable.projectId,
        stageId: projectFilesTable.stageId,
        stageName: projectStagesTable.stageName,
        fileName: projectFilesTable.fileName,
        originalName: projectFilesTable.originalName,
        filePath: projectFilesTable.filePath,
        fileUrl: projectFilesTable.fileUrl,
        storageProvider: projectFilesTable.storageProvider,
        fileType: projectFilesTable.fileType,
        fileSize: projectFilesTable.fileSize,
        versionNumber: projectFilesTable.versionNumber,
        visibility: projectFilesTable.visibility,
        fileCategory: projectFilesTable.fileCategory,
        notes: projectFilesTable.notes,
        isApprovedVersion: projectFilesTable.isApprovedVersion,
        createdAt: projectFilesTable.createdAt,
      })
      .from(projectFilesTable)
      .leftJoin(projectStagesTable, eq(projectFilesTable.stageId, projectStagesTable.id))
      .where(eq(projectFilesTable.projectId, projectId))
      .orderBy(sql`${projectFilesTable.createdAt} DESC`);
    res.json(files);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/stages/:stageId/files", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const stageId = Number(req.params["stageId"]);
    const stage = await db.select().from(projectStagesTable).where(eq(projectStagesTable.id, stageId)).limit(1);
    if (!stage[0]) { res.status(404).json({ error: "المرحلة غير موجودة" }); return; }
    if (!(await checkProjectAccess(stage[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const files = await db.select().from(projectFilesTable).where(eq(projectFilesTable.stageId, stageId)).orderBy(sql`${projectFilesTable.createdAt} DESC`);
    res.json(files);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.post("/projects/:id/files", authMiddleware, uploadSingleFile, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = Number(req.params["id"]);
    if (!(await checkProjectAccess(projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "لم يتم رفع أي ملف" });
      return;
    }

    const { stageId, fileCategory, notes, visibility } = req.body as {
      stageId?: string; fileCategory?: string; notes?: string; visibility?: string;
    };
    const parsedStageId = stageId ? parseInt(stageId) : null;
    const cat = fileCategory || "Other";
    const vis = (visibility === "client_visible" ? "client_visible" : "internal") as "internal" | "client_visible";

    const existingVersions = await db
      .select({ versionNumber: projectFilesTable.versionNumber })
      .from(projectFilesTable)
      .where(
        and(
          eq(projectFilesTable.projectId, projectId),
          parsedStageId ? eq(projectFilesTable.stageId, parsedStageId) : sql`${projectFilesTable.stageId} IS NULL`,
          eq(projectFilesTable.fileCategory, cat)
        )
      )
      .orderBy(sql`${projectFilesTable.versionNumber} DESC`)
      .limit(1);

    const nextVersion = (existingVersions[0]?.versionNumber ?? 0) + 1;
    const officeId = await getProjectOfficeId(projectId);
    const stored = await saveUploadedFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      officeId,
      projectId,
    });

    const [inserted] = await db.insert(projectFilesTable).values({
      projectId,
      officeId,
      stageId: parsedStageId,
      uploadedBy: user.id,
      fileName: stored.fileName,
      originalName: req.file.originalname,
      filePath: stored.filePath,
      fileUrl: stored.fileUrl,
      storageProvider: stored.provider,
      storageKey: stored.storageKey,
      bucketName: stored.bucketName,
      contentType: stored.contentType,
      checksum: stored.checksum,
      fileType: req.file.mimetype || path.extname(req.file.originalname).slice(1),
      fileSize: req.file.size,
      versionNumber: nextVersion,
      visibility: vis,
      fileCategory: cat,
      notes: notes || null,
      isApprovedVersion: false,
    }).returning();
    await logAudit({
      office_id: inserted?.officeId ?? officeId,
      user_id: user.id,
      action: "file.upload",
      entity_type: "project_file",
      entity_id: inserted?.id ?? null,
      new_value: inserted,
      req,
    });

    if (vis === "client_visible") {
      const project = await getProjectNotificationContext(projectId);
      if (project?.clientId) {
        await createNotification({
          officeId: project.officeId,
          clientId: project.clientId,
          projectId,
          title: "ملف جديد",
          message: `تمت إضافة ملف جديد في مشروع "${project.projectName}": ${req.file.originalname}.`,
          notificationType: "file_visible",
        });
        await sendClientVisibleFileWhatsApp({
          officeId: project.officeId,
          clientId: project.clientId,
          clientName: project.clientName,
          clientPhone: project.clientPhone,
          projectId,
          projectName: project.projectName,
          sentBy: user.id,
        });
      }
    }

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error(err);
    if (err instanceof Error && err.message.includes("S3 storage")) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/files/:fileId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = Number(req.params["fileId"]);
    const file = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    if (!(await checkProjectAccess(file[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const { notes, visibility, fileCategory } = req.body as { notes?: string; visibility?: string; fileCategory?: string };
    const [updated] = await db
      .update(projectFilesTable)
      .set({
        notes: notes ?? file[0].notes,
        visibility: (visibility as "internal" | "client_visible") ?? file[0].visibility,
        fileCategory: fileCategory ?? file[0].fileCategory,
        updatedAt: new Date(),
      })
      .where(eq(projectFilesTable.id, fileId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.delete("/files/:fileId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = Number(req.params["fileId"]);
    const file = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    if (!(await checkProjectAccess(file[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    await deleteStoredFile({
      provider: file[0].storageProvider,
      fileName: file[0].fileName,
      filePath: file[0].filePath,
      storageKey: file[0].storageKey,
      bucketName: file[0].bucketName,
    });
    await db.delete(projectFilesTable).where(eq(projectFilesTable.id, fileId));
    await logAudit({
      office_id: file[0].officeId,
      user_id: user.id,
      action: "file.delete",
      entity_type: "project_file",
      entity_id: fileId,
      old_value: file[0],
      req,
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/files/:fileId/mark-approved", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = Number(req.params["fileId"]);
    const file = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    if (!(await checkProjectAccess(file[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    await db
      .update(projectFilesTable)
      .set({ isApprovedVersion: false, updatedAt: new Date() })
      .where(
        and(
          eq(projectFilesTable.projectId, file[0].projectId),
          file[0].stageId ? eq(projectFilesTable.stageId, file[0].stageId) : sql`${projectFilesTable.stageId} IS NULL`,
          eq(projectFilesTable.fileCategory, file[0].fileCategory)
        )
      );
    const [updated] = await db
      .update(projectFilesTable)
      .set({ isApprovedVersion: true, updatedAt: new Date() })
      .where(eq(projectFilesTable.id, fileId))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/files/:fileId/toggle-client-visible", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = Number(req.params["fileId"]);
    const file = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    if (!(await checkProjectAccess(file[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const newVisibility = file[0].visibility === "client_visible" ? "internal" : "client_visible";
    const [updated] = await db
      .update(projectFilesTable)
      .set({ visibility: newVisibility, updatedAt: new Date() })
      .where(eq(projectFilesTable.id, fileId))
      .returning();
    if (newVisibility === "client_visible") {
      const project = await getProjectNotificationContext(file[0].projectId);
      if (project?.clientId) {
        await createNotification({
          officeId: project.officeId,
          clientId: project.clientId,
          projectId: file[0].projectId,
          title: "ملف جديد",
          message: `تمت إتاحة ملف جديد لك في مشروع "${project.projectName}": ${file[0].originalName}.`,
          notificationType: "file_visible",
        });
        await sendClientVisibleFileWhatsApp({
          officeId: project.officeId,
          clientId: project.clientId,
          clientName: project.clientName,
          clientPhone: project.clientPhone,
          projectId: file[0].projectId,
          projectName: project.projectName,
          sentBy: user.id,
        });
      }
    }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/client-portal/projects/:id/files", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = Number(req.params["id"]);
    if (!user.clientId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const project = await db.select({ clientId: projectsTable.clientId }).from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
    if (!project[0] || project[0].clientId !== user.clientId) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول لهذا المشروع" });
      return;
    }
    const files = await db
      .select({
        id: projectFilesTable.id,
        projectId: projectFilesTable.projectId,
        stageId: projectFilesTable.stageId,
        stageName: projectStagesTable.stageName,
        fileName: projectFilesTable.fileName,
        originalName: projectFilesTable.originalName,
        filePath: projectFilesTable.filePath,
        fileUrl: projectFilesTable.fileUrl,
        storageProvider: projectFilesTable.storageProvider,
        fileType: projectFilesTable.fileType,
        fileSize: projectFilesTable.fileSize,
        versionNumber: projectFilesTable.versionNumber,
        fileCategory: projectFilesTable.fileCategory,
        notes: projectFilesTable.notes,
        isApprovedVersion: projectFilesTable.isApprovedVersion,
        createdAt: projectFilesTable.createdAt,
      })
      .from(projectFilesTable)
      .leftJoin(projectStagesTable, eq(projectFilesTable.stageId, projectStagesTable.id))
      .where(and(eq(projectFilesTable.projectId, projectId), eq(projectFilesTable.visibility, "client_visible")))
      .orderBy(sql`${projectFilesTable.createdAt} DESC`);
    res.json(files);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

export default router;
