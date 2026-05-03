import { Router } from "express";
import { db } from "@workspace/db";
import {
  projectStagesTable,
  projectTasksTable,
  projectsTable,
  usersTable,
} from "@workspace/db";
import { and, asc, count, desc, eq, lt, ne, sql } from "drizzle-orm";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";
import { asyncHandler, fail, ok, validateBody } from "../lib/http";
import { taskSchema, taskStatusSchema, taskUpdateSchema } from "../lib/validation";
import { createNotification } from "../lib/notifications";

const router = Router();

const TASK_STATUSES = new Set(["todo", "in_progress", "review", "done"]);
const TASK_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const editRoles = new Set(["super_admin", "office_admin", "project_manager"]);
const deleteRoles = new Set(["super_admin", "office_admin", "project_manager"]);

function parseId(value: string | string[] | undefined): number | null {
  const id = parseInt(Array.isArray(value) ? value[0] : value || "0", 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekEndString(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function canEdit(user: AuthUser): boolean {
  return editRoles.has(user.role);
}

function canDelete(user: AuthUser): boolean {
  return deleteRoles.has(user.role);
}

function canUpdateStatus(user: AuthUser, task: { assignedTo: number | null; officeId: number }): boolean {
  if (canEdit(user)) return true;
  return user.role === "designer" && task.assignedTo === user.id && task.officeId === user.officeId;
}

async function getProjectAccess(projectId: number, user: AuthUser) {
  const rows = await db
    .select({ id: projectsTable.id, officeId: projectsTable.officeId, projectName: projectsTable.projectName })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  const project = rows[0];
  if (!project) return { project: null, status: 404 as const, message: "المشروع غير موجود" };
  if (user.role !== "super_admin" && project.officeId !== user.officeId) {
    return { project: null, status: 403 as const, message: "ليس لديك صلاحية الوصول لهذا المشروع" };
  }
  return { project, status: 200 as const, message: "" };
}

async function getTask(taskId: number) {
  const rows = await db.select().from(projectTasksTable).where(eq(projectTasksTable.id, taskId)).limit(1);
  return rows[0] ?? null;
}

function taskSelect() {
  return {
    id: projectTasksTable.id,
    officeId: projectTasksTable.officeId,
    projectId: projectTasksTable.projectId,
    projectName: projectsTable.projectName,
    stageId: projectTasksTable.stageId,
    stageName: projectStagesTable.stageName,
    assignedTo: projectTasksTable.assignedTo,
    assignedToName: usersTable.name,
    createdBy: projectTasksTable.createdBy,
    title: projectTasksTable.title,
    description: projectTasksTable.description,
    status: projectTasksTable.status,
    priority: projectTasksTable.priority,
    dueDate: projectTasksTable.dueDate,
    completedAt: projectTasksTable.completedAt,
    createdAt: projectTasksTable.createdAt,
    updatedAt: projectTasksTable.updatedAt,
  };
}

async function ensureAssignee(assignedTo: number | null | undefined, officeId: number) {
  if (!assignedTo) return true;
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, assignedTo), eq(usersTable.officeId, officeId)))
    .limit(1);
  return Boolean(rows[0]);
}

async function notifyAssignment(task: { id: number; officeId: number; projectId: number; assignedTo: number | null; title: string }) {
  if (!task.assignedTo) return;
  await createNotification({
    officeId: task.officeId,
    userId: task.assignedTo,
    projectId: task.projectId,
    title: "مهمة جديدة",
    message: `تم تعيين مهمة لك: "${task.title}".`,
    notificationType: "task_assigned",
  });
}

async function notifyStatusChange(task: { id: number; officeId: number; projectId: number; assignedTo: number | null; title: string; status: string }) {
  await createNotification({
    officeId: task.officeId,
    userId: task.assignedTo,
    projectId: task.projectId,
    title: "تحديث حالة المهمة",
    message: `تم تحديث حالة المهمة "${task.title}" إلى "${task.status}".`,
    notificationType: "task_status_changed",
  });
}

function statusCompletedAt(status: string, previous?: string | null): Date | null | undefined {
  if (status === "done") return new Date();
  if (previous === "done" && status !== "done") return null;
  return undefined;
}

router.get("/tasks/assignees", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (user.role !== "super_admin" && !user.officeId) {
    ok(res, []);
    return;
  }
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, officeId: usersTable.officeId })
    .from(usersTable)
    .where(user.role === "super_admin" ? undefined : eq(usersTable.officeId, user.officeId!))
    .orderBy(asc(usersTable.name));
  ok(res, users.filter((item) => item.role !== "client"));
}));

router.get("/tasks", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const filters = [];
  if (user.role !== "super_admin") {
    if (!user.officeId) {
      ok(res, []);
      return;
    }
    filters.push(eq(projectTasksTable.officeId, user.officeId));
  }
  const projectId = req.query["project_id"] ? Number(req.query["project_id"]) : null;
  const assignedTo = req.query["assigned_to"] ? Number(req.query["assigned_to"]) : null;
  const status = String(req.query["status"] ?? "");
  const priority = String(req.query["priority"] ?? "");
  if (projectId) filters.push(eq(projectTasksTable.projectId, projectId));
  if (assignedTo) filters.push(eq(projectTasksTable.assignedTo, assignedTo));
  if (TASK_STATUSES.has(status)) filters.push(eq(projectTasksTable.status, status as "todo" | "in_progress" | "review" | "done"));
  if (TASK_PRIORITIES.has(priority)) filters.push(eq(projectTasksTable.priority, priority as "low" | "medium" | "high" | "urgent"));
  if (req.query["overdue"] === "true") {
    filters.push(lt(projectTasksTable.dueDate, todayString()), ne(projectTasksTable.status, "done"));
  }

  const tasks = await db
    .select(taskSelect())
    .from(projectTasksTable)
    .leftJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
    .leftJoin(projectStagesTable, eq(projectTasksTable.stageId, projectStagesTable.id))
    .leftJoin(usersTable, eq(projectTasksTable.assignedTo, usersTable.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(projectTasksTable.createdAt));

  ok(res, tasks);
}));

router.get("/projects/:id/tasks", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const projectId = parseId(req.params["id"]);
  if (!projectId) {
    fail(res, 400, "معرف المشروع غير صحيح");
    return;
  }
  const access = await getProjectAccess(projectId, user);
  if (!access.project) {
    fail(res, access.status, access.message);
    return;
  }
  const tasks = await db
    .select(taskSelect())
    .from(projectTasksTable)
    .leftJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
    .leftJoin(projectStagesTable, eq(projectTasksTable.stageId, projectStagesTable.id))
    .leftJoin(usersTable, eq(projectTasksTable.assignedTo, usersTable.id))
    .where(eq(projectTasksTable.projectId, projectId))
    .orderBy(desc(projectTasksTable.createdAt));
  ok(res, tasks);
}));

router.get("/tasks/:id", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!id) {
    fail(res, 400, "معرف المهمة غير صحيح");
    return;
  }
  const task = await getTask(id);
  if (!task) {
    fail(res, 404, "المهمة غير موجودة");
    return;
  }
  if (user.role !== "super_admin" && task.officeId !== user.officeId) {
    fail(res, 403, "ليس لديك صلاحية الوصول لهذه المهمة");
    return;
  }
  ok(res, task);
}));

router.post("/tasks", authMiddleware, validateBody(taskSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canEdit(user)) {
    fail(res, 403, "ليس لديك صلاحية إنشاء مهمة");
    return;
  }
  const body = req.body as {
    projectId: number; stageId?: number | null; assignedTo?: number | null; title: string; description?: string | null;
    status: "todo" | "in_progress" | "review" | "done"; priority: "low" | "medium" | "high" | "urgent"; dueDate?: string | null;
  };
  const access = await getProjectAccess(body.projectId, user);
  if (!access.project) {
    fail(res, access.status, access.message);
    return;
  }
  if (!access.project.officeId) {
    fail(res, 400, "لا يوجد مكتب مرتبط بهذا المشروع");
    return;
  }
  if (body.stageId) {
    const stage = await db.select({ id: projectStagesTable.id }).from(projectStagesTable).where(and(eq(projectStagesTable.id, body.stageId), eq(projectStagesTable.projectId, body.projectId))).limit(1);
    if (!stage[0]) {
      fail(res, 400, "المرحلة غير مرتبطة بهذا المشروع");
      return;
    }
  }
  if (!(await ensureAssignee(body.assignedTo, access.project.officeId))) {
    fail(res, 400, "المسؤول غير تابع لهذا المكتب");
    return;
  }
  const [task] = await db.insert(projectTasksTable).values({
    officeId: access.project.officeId,
    projectId: body.projectId,
    stageId: body.stageId ?? null,
    assignedTo: body.assignedTo ?? null,
    createdBy: user.id,
    title: body.title,
    description: body.description ?? null,
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate ?? null,
    completedAt: body.status === "done" ? new Date() : null,
  }).returning();
  await notifyAssignment(task!);
  ok(res, task, 201, "تم إنشاء المهمة");
}));

router.put("/tasks/:id", authMiddleware, validateBody(taskUpdateSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canEdit(user)) {
    fail(res, 403, "ليس لديك صلاحية تعديل المهمة");
    return;
  }
  const id = parseId(req.params["id"]);
  if (!id) {
    fail(res, 400, "معرف المهمة غير صحيح");
    return;
  }
  const task = await getTask(id);
  if (!task) {
    fail(res, 404, "المهمة غير موجودة");
    return;
  }
  if (user.role !== "super_admin" && task.officeId !== user.officeId) {
    fail(res, 403, "ليس لديك صلاحية تعديل هذه المهمة");
    return;
  }
  const body = req.body as Partial<{
    projectId: number; stageId: number | null; assignedTo: number | null; title: string; description: string | null;
    status: "todo" | "in_progress" | "review" | "done"; priority: "low" | "medium" | "high" | "urgent"; dueDate: string | null;
  }>;
  const projectId = body.projectId ?? task.projectId;
  const access = await getProjectAccess(projectId, user);
  if (!access.project) {
    fail(res, access.status, access.message);
    return;
  }
  if (!access.project.officeId) {
    fail(res, 400, "لا يوجد مكتب مرتبط بهذا المشروع");
    return;
  }
  if (body.stageId) {
    const stage = await db.select({ id: projectStagesTable.id }).from(projectStagesTable).where(and(eq(projectStagesTable.id, body.stageId), eq(projectStagesTable.projectId, projectId))).limit(1);
    if (!stage[0]) {
      fail(res, 400, "المرحلة غير مرتبطة بهذا المشروع");
      return;
    }
  }
  if (!(await ensureAssignee(body.assignedTo, access.project.officeId))) {
    fail(res, 400, "المسؤول غير تابع لهذا المكتب");
    return;
  }
  const completedAt = body.status ? statusCompletedAt(body.status, task.status) : undefined;
  const [updated] = await db.update(projectTasksTable).set({
    projectId,
    officeId: access.project.officeId,
    stageId: body.stageId !== undefined ? body.stageId : task.stageId,
    assignedTo: body.assignedTo !== undefined ? body.assignedTo : task.assignedTo,
    title: body.title ?? task.title,
    description: body.description !== undefined ? body.description : task.description,
    status: body.status ?? task.status,
    priority: body.priority ?? task.priority,
    dueDate: body.dueDate !== undefined ? body.dueDate : task.dueDate,
    completedAt,
    updatedAt: new Date(),
  }).where(eq(projectTasksTable.id, id)).returning();
  if (updated?.assignedTo && updated.assignedTo !== task.assignedTo) await notifyAssignment(updated);
  if (updated && body.status && body.status !== task.status) await notifyStatusChange(updated);
  ok(res, updated, 200, "تم تحديث المهمة");
}));

router.patch("/tasks/:id/status", authMiddleware, validateBody(taskStatusSchema), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const id = parseId(req.params["id"]);
  if (!id) {
    fail(res, 400, "معرف المهمة غير صحيح");
    return;
  }
  const task = await getTask(id);
  if (!task) {
    fail(res, 404, "المهمة غير موجودة");
    return;
  }
  if (!canUpdateStatus(user, task)) {
    fail(res, 403, "ليس لديك صلاحية تحديث حالة هذه المهمة");
    return;
  }
  const { status } = req.body as { status: "todo" | "in_progress" | "review" | "done" };
  const completedAt = statusCompletedAt(status, task.status);
  const [updated] = await db.update(projectTasksTable).set({
    status,
    completedAt,
    updatedAt: new Date(),
  }).where(eq(projectTasksTable.id, id)).returning();
  if (updated && status !== task.status) await notifyStatusChange(updated);
  ok(res, updated, 200, "تم تحديث حالة المهمة");
}));

router.delete("/tasks/:id", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  if (!canDelete(user)) {
    fail(res, 403, "ليس لديك صلاحية حذف المهمة");
    return;
  }
  const id = parseId(req.params["id"]);
  if (!id) {
    fail(res, 400, "معرف المهمة غير صحيح");
    return;
  }
  const task = await getTask(id);
  if (!task) {
    fail(res, 404, "المهمة غير موجودة");
    return;
  }
  if (user.role !== "super_admin" && task.officeId !== user.officeId) {
    fail(res, 403, "ليس لديك صلاحية حذف هذه المهمة");
    return;
  }
  await db.delete(projectTasksTable).where(eq(projectTasksTable.id, id));
  ok(res, { id }, 200, "تم حذف المهمة");
}));

router.get("/dashboard/task-stats", authMiddleware, asyncHandler(async (req, res) => {
  const user = getUser(req);
  const filters = [];
  if (user.role !== "super_admin") {
    if (!user.officeId) {
      ok(res, { myTasks: 0, overdueTasks: 0, thisWeekTasks: 0 });
      return;
    }
    filters.push(eq(projectTasksTable.officeId, user.officeId));
  }
  const [myTasksRows, overdueRows, thisWeekRows] = await Promise.all([
    db.select({ total: count() }).from(projectTasksTable).where(and(...filters, eq(projectTasksTable.assignedTo, user.id), ne(projectTasksTable.status, "done"))),
    db.select({ total: count() }).from(projectTasksTable).where(and(...filters, lt(projectTasksTable.dueDate, todayString()), ne(projectTasksTable.status, "done"))),
    db.select({ total: count() }).from(projectTasksTable).where(and(...filters, sql`${projectTasksTable.dueDate} >= ${todayString()}`, sql`${projectTasksTable.dueDate} <= ${weekEndString()}`, ne(projectTasksTable.status, "done"))),
  ]);
  ok(res, {
    myTasks: Number(myTasksRows[0]?.total ?? 0),
    overdueTasks: Number(overdueRows[0]?.total ?? 0),
    thisWeekTasks: Number(thisWeekRows[0]?.total ?? 0),
  });
}));

export default router;
