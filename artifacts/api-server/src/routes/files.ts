import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { projectFilesTable, projectsTable, projectStagesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware, clientPortalMiddleware, getUser } from "../lib/auth";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
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
    const projectId = parseInt(req.params["id"]!);
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
    const stageId = parseInt(req.params["stageId"]!);
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

router.post("/projects/:id/files", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);
    if (!(await checkProjectAccess(projectId, user))) {
      if (req.file) fs.unlinkSync(req.file.path);
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

    const [inserted] = await db.insert(projectFilesTable).values({
      projectId,
      officeId,
      stageId: parsedStageId,
      uploadedBy: user.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype || path.extname(req.file.originalname).slice(1),
      fileSize: req.file.size,
      versionNumber: nextVersion,
      visibility: vis,
      fileCategory: cat,
      notes: notes || null,
      isApprovedVersion: false,
    }).returning();

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.put("/files/:fileId", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = parseInt(req.params["fileId"]!);
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
    const fileId = parseInt(req.params["fileId"]!);
    const file = await db.select().from(projectFilesTable).where(eq(projectFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    if (!(await checkProjectAccess(file[0].projectId, user))) {
      res.status(403).json({ error: "ليس لديك صلاحية الوصول" });
      return;
    }
    const absPath = path.join(UPLOADS_DIR, file[0].fileName);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    await db.delete(projectFilesTable).where(eq(projectFilesTable.id, fileId));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.patch("/files/:fileId/mark-approved", authMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const fileId = parseInt(req.params["fileId"]!);
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
    const fileId = parseInt(req.params["fileId"]!);
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
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

router.get("/client-portal/projects/:id/files", clientPortalMiddleware, async (req, res) => {
  try {
    const user = getUser(req);
    const projectId = parseInt(req.params["id"]!);
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
