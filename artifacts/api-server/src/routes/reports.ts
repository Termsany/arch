import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";

const router = Router();

type ReportKind = "overview" | "projects" | "clients" | "workflow" | "finance" | "tasks" | "storage";

const TABLE_CACHE = new Map<string, boolean>();

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function canAccess(user: AuthUser, kind: ReportKind): boolean {
  if (user.role === "client") return false;
  if (user.role === "super_admin" || user.role === "office_admin") return true;
  if (user.role === "accountant") return kind === "overview" || kind === "finance";
  if (user.role === "project_manager") return ["overview", "projects", "workflow", "tasks", "storage"].includes(kind);
  if (user.role === "designer") return kind === "projects" || kind === "tasks";
  return false;
}

async function tableExists(table: string): Promise<boolean> {
  if (TABLE_CACHE.has(table)) return TABLE_CACHE.get(table)!;
  const result = await pool.query("select to_regclass($1) as name", [`public.${table}`]);
  const exists = Boolean(result.rows[0]?.name);
  TABLE_CACHE.set(table, exists);
  return exists;
}

function scopedWhere(
  user: AuthUser,
  query: Record<string, unknown>,
  alias: string,
  dateColumn = "created_at",
) {
  const parts: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (user.role === "super_admin") {
    const officeId = query["office_id"] ? Number(query["office_id"]) : null;
    if (officeId) parts.push(`${alias}.office_id = ${add(officeId)}`);
  } else {
    if (!user.officeId) parts.push("1 = 0");
    else parts.push(`${alias}.office_id = ${add(user.officeId)}`);
  }

  const from = typeof query["from_date"] === "string" ? query["from_date"] : "";
  const to = typeof query["to_date"] === "string" ? query["to_date"] : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) parts.push(`${alias}.${dateColumn}::date >= ${add(from)}`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) parts.push(`${alias}.${dateColumn}::date <= ${add(to)}`);

  return { clause: parts.length ? `where ${parts.join(" and ")}` : "", params };
}

async function rows(sqlText: string, params: unknown[] = []) {
  return (await pool.query(sqlText, params)).rows;
}

async function one(sqlText: string, params: unknown[] = []) {
  return (await pool.query(sqlText, params)).rows[0] ?? {};
}

function mapCount(data: Array<Record<string, unknown>>, label = "label", value = "value") {
  return data.map((row) => ({ label: row[label] ?? "غير محدد", value: num(row[value]) }));
}

async function overview(user: AuthUser, query: Record<string, unknown>) {
  const clients = scopedWhere(user, query, "c");
  const projects = scopedWhere(user, query, "p");
  const estimates = scopedWhere(user, query, "p", "created_at");
  const stages = scopedWhere(user, query, "p", "created_at");

  const [clientRow, projectRow, boqRow, waitingRow] = await Promise.all([
    one(`select count(*) as total from clients c ${clients.clause}`, clients.params),
    one(`
      select
        count(*) as total,
        count(*) filter (where p.project_status in ('جاري','جاري العمل','active','in_progress')) as active,
        count(*) filter (where p.project_status in ('مكتمل','مكتملة','completed','done')) as completed
      from projects p ${projects.clause}
    `, projects.params),
    one(`
      select coalesce(sum(pe.total_price), 0) as total
      from project_estimates pe
      join projects p on p.id = pe.project_id
      ${estimates.clause}
    `, estimates.params),
    one(`
      select count(distinct p.id) as total
      from projects p
      left join project_stages ps on ps.project_id = p.id
      ${stages.clause ? `${stages.clause} and` : "where"} (p.project_status = 'في انتظار موافقة العميل' or ps.status = 'في انتظار موافقة العميل')
    `, stages.params),
  ]);

  let invoiceValue = 0;
  let paidAmount = 0;
  let overdueInvoices = 0;
  if (await tableExists("invoices")) {
    const inv = scopedWhere(user, query, "i", "created_at");
    const invRow = await one(`
      select coalesce(sum(i.total_amount), 0) as total, coalesce(sum(i.paid_amount), 0) as paid,
        count(*) filter (where i.status = 'overdue') as overdue
      from invoices i ${inv.clause}
    `, inv.params);
    invoiceValue = num(invRow.total);
    paidAmount = num(invRow.paid);
    overdueInvoices = num(invRow.overdue);
  }

  let openTasks = 0;
  let overdueTasks = 0;
  if (await tableExists("project_tasks")) {
    const task = scopedWhere(user, query, "t", "created_at");
    const taskRow = await one(`
      select count(*) filter (where t.status <> 'done') as open,
        count(*) filter (where t.status <> 'done' and t.due_date < current_date) as overdue
      from project_tasks t ${task.clause}
    `, task.params);
    openTasks = num(taskRow.open);
    overdueTasks = num(taskRow.overdue);
  }

  let storageUsedMb = 0;
  if (await tableExists("project_files")) {
    const file = scopedWhere(user, query, "f", "created_at");
    const fileRow = await one(`select coalesce(sum(f.file_size), 0) / 1024.0 / 1024.0 as total from project_files f ${file.clause}`, file.params);
    storageUsedMb = Number(num(fileRow.total).toFixed(2));
  }

  return {
    total_clients: num(clientRow.total),
    total_projects: num(projectRow.total),
    active_projects: num(projectRow.active),
    completed_projects: num(projectRow.completed),
    waiting_client_approval_projects: num(waitingRow.total),
    total_boq_value: num(boqRow.total),
    total_invoice_value: invoiceValue,
    total_paid_amount: paidAmount,
    total_outstanding_amount: Math.max(0, invoiceValue - paidAmount),
    overdue_invoices_count: overdueInvoices,
    open_tasks_count: openTasks,
    overdue_tasks_count: overdueTasks,
    storage_used_mb: storageUsedMb,
  };
}

async function projectsReport(user: AuthUser, query: Record<string, unknown>) {
  const where = scopedWhere(user, query, "p");
  const [byStatus, byType, createdMonthly, completedMonthly, waiting, revisions] = await Promise.all([
    rows(`select coalesce(p.project_status, 'غير محدد') as label, count(*) as value from projects p ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select coalesce(p.design_type, 'غير محدد') as label, count(*) as value from projects p ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select to_char(date_trunc('month', p.created_at), 'YYYY-MM') as month, count(*) as value from projects p ${where.clause} group by 1 order by 1`, where.params),
    rows(`select to_char(date_trunc('month', p.updated_at), 'YYYY-MM') as month, count(*) as value from projects p ${where.clause ? `${where.clause} and` : "where"} p.project_status in ('مكتمل','مكتملة','completed','done') group by 1 order by 1`, where.params),
    rows(`select p.id, p.project_name, p.project_status from projects p ${where.clause ? `${where.clause} and` : "where"} p.project_status = 'في انتظار موافقة العميل' order by p.updated_at desc limit 20`, where.params),
    rows(`select distinct p.id, p.project_name from projects p join project_stages ps on ps.project_id = p.id ${where.clause ? `${where.clause} and` : "where"} (ps.status = 'يحتاج تعديل' or ps.client_feedback is not null) order by p.id desc limit 20`, where.params),
  ]);
  return {
    projects_by_status: mapCount(byStatus),
    projects_by_design_type: mapCount(byType),
    projects_created_per_month: createdMonthly,
    completed_projects_per_month: completedMonthly,
    projects_waiting_client_approval: waiting,
    projects_with_revision_requests: revisions,
  };
}

async function clientsReport(user: AuthUser, query: Record<string, unknown>) {
  const where = scopedWhere(user, query, "c");
  const projectWhere = scopedWhere(user, query, "p");
  const [total, monthly, active, pending] = await Promise.all([
    one(`select count(*) as total from clients c ${where.clause}`, where.params),
    rows(`select to_char(date_trunc('month', c.created_at), 'YYYY-MM') as month, count(*) as value from clients c ${where.clause} group by 1 order by 1`, where.params),
    rows(`select c.id, c.name, count(p.id) as projects_count from clients c left join projects p on p.client_id = c.id ${where.clause} group by c.id, c.name order by projects_count desc limit 10`, where.params),
    rows(`select distinct c.id, c.name from clients c join projects p on p.client_id = c.id left join project_stages ps on ps.project_id = p.id ${projectWhere.clause ? `${projectWhere.clause} and` : "where"} (p.project_status = 'في انتظار موافقة العميل' or ps.status = 'في انتظار موافقة العميل') limit 20`, projectWhere.params),
  ]);
  let unpaid: unknown[] = [];
  if (await tableExists("invoices")) {
    const inv = scopedWhere(user, query, "i");
    unpaid = await rows(`select c.id, c.name, coalesce(sum(i.total_amount - i.paid_amount), 0) as outstanding from invoices i join clients c on c.id = i.client_id ${inv.clause ? `${inv.clause} and` : "where"} i.status not in ('paid','cancelled') group by c.id, c.name order by outstanding desc limit 10`, inv.params);
  }
  return {
    total_clients: num(total.total),
    new_clients_per_month: monthly,
    clients_with_most_projects: active,
    clients_with_pending_approvals: pending,
    clients_with_unpaid_invoices: unpaid,
  };
}

async function workflowReport(user: AuthUser, query: Record<string, unknown>) {
  const where = scopedWhere(user, query, "p");
  const byStatus = await rows(`select coalesce(ps.status, 'غير محدد') as label, count(*) as value from project_stages ps join projects p on p.id = ps.project_id ${where.clause} group by 1 order by 2 desc`, where.params);
  const waiting = await rows(`select p.id as project_id, p.project_name, ps.stage_name, ps.status from project_stages ps join projects p on p.id = ps.project_id ${where.clause ? `${where.clause} and` : "where"} ps.status = 'في انتظار موافقة العميل' order by ps.updated_at desc limit 20`, where.params);
  const revisions = await rows(`select p.id as project_id, p.project_name, ps.stage_name, ps.status from project_stages ps join projects p on p.id = ps.project_id ${where.clause ? `${where.clause} and` : "where"} (ps.status = 'يحتاج تعديل' or ps.client_feedback is not null) order by ps.updated_at desc limit 20`, where.params);
  const common = await rows(`select ps.stage_name as label, count(*) as value from project_stages ps join projects p on p.id = ps.project_id ${where.clause ? `${where.clause} and` : "where"} (ps.status = 'يحتاج تعديل' or ps.client_feedback is not null) group by 1 order by 2 desc limit 10`, where.params);
  return {
    stages_by_status: mapCount(byStatus),
    stages_waiting_approval: waiting,
    stages_needing_revision: revisions,
    most_common_revision_stages: mapCount(common),
    average_stage_completion_time: null,
    projects_blocked_by_client_approval: waiting,
  };
}

async function financeReport(user: AuthUser, query: Record<string, unknown>) {
  if (!(await tableExists("invoices"))) {
    return { invoices_by_status: [], total_invoice_value: 0, total_paid_amount: 0, total_outstanding_amount: 0, overdue_invoices: [], payments_per_month: [], invoice_totals_per_month: [], top_projects_by_revenue: [], top_clients_by_revenue: [] };
  }
  const inv = scopedWhere(user, query, "i");
  const pay = scopedWhere(user, query, "p", "payment_date");
  const [byStatus, totals, overdue, paymentsMonth, invoicesMonth, topProjects, topClients] = await Promise.all([
    rows(`select i.status as label, count(*) as value from invoices i ${inv.clause} group by 1 order by 2 desc`, inv.params),
    one(`select coalesce(sum(i.total_amount),0) as total, coalesce(sum(i.paid_amount),0) as paid from invoices i ${inv.clause}`, inv.params),
    rows(`select i.id, i.invoice_number, i.total_amount, i.paid_amount, i.due_date from invoices i ${inv.clause ? `${inv.clause} and` : "where"} i.status = 'overdue' order by i.due_date asc limit 20`, inv.params),
    (await tableExists("payments")) ? rows(`select to_char(date_trunc('month', p.payment_date), 'YYYY-MM') as month, coalesce(sum(p.amount),0) as value from payments p ${pay.clause} group by 1 order by 1`, pay.params) : Promise.resolve([]),
    rows(`select to_char(date_trunc('month', i.created_at), 'YYYY-MM') as month, coalesce(sum(i.total_amount),0) as value from invoices i ${inv.clause} group by 1 order by 1`, inv.params),
    rows(`select pr.id, pr.project_name, coalesce(sum(i.paid_amount),0) as revenue from invoices i join projects pr on pr.id = i.project_id ${inv.clause} group by pr.id, pr.project_name order by revenue desc limit 10`, inv.params),
    rows(`select c.id, c.name, coalesce(sum(i.paid_amount),0) as revenue from invoices i join clients c on c.id = i.client_id ${inv.clause} group by c.id, c.name order by revenue desc limit 10`, inv.params),
  ]);
  const total = num(totals.total);
  const paid = num(totals.paid);
  return { invoices_by_status: mapCount(byStatus), total_invoice_value: total, total_paid_amount: paid, total_outstanding_amount: Math.max(0, total - paid), overdue_invoices: overdue, payments_per_month: paymentsMonth, invoice_totals_per_month: invoicesMonth, top_projects_by_revenue: topProjects, top_clients_by_revenue: topClients };
}

async function tasksReport(user: AuthUser, query: Record<string, unknown>) {
  if (!(await tableExists("project_tasks"))) {
    return { tasks_by_status: [], tasks_by_priority: [], tasks_by_assignee: [], overdue_tasks: [], tasks_due_this_week: [], completed_tasks_per_month: [] };
  }
  const where = scopedWhere(user, query, "t");
  const [status, priority, assignee, overdue, week, completed] = await Promise.all([
    rows(`select t.status as label, count(*) as value from project_tasks t ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select t.priority as label, count(*) as value from project_tasks t ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select coalesce(u.name, 'بدون مسؤول') as label, count(*) as value from project_tasks t left join users u on u.id = t.assigned_to ${where.clause} group by 1 order by 2 desc limit 10`, where.params),
    rows(`select t.id, t.title, t.due_date, t.status from project_tasks t ${where.clause ? `${where.clause} and` : "where"} t.status <> 'done' and t.due_date < current_date order by t.due_date asc limit 20`, where.params),
    rows(`select t.id, t.title, t.due_date, t.status from project_tasks t ${where.clause ? `${where.clause} and` : "where"} t.status <> 'done' and t.due_date between current_date and current_date + interval '7 day' order by t.due_date asc limit 20`, where.params),
    rows(`select to_char(date_trunc('month', t.completed_at), 'YYYY-MM') as month, count(*) as value from project_tasks t ${where.clause ? `${where.clause} and` : "where"} t.status = 'done' and t.completed_at is not null group by 1 order by 1`, where.params),
  ]);
  return { tasks_by_status: mapCount(status), tasks_by_priority: mapCount(priority), tasks_by_assignee: mapCount(assignee), overdue_tasks: overdue, tasks_due_this_week: week, completed_tasks_per_month: completed };
}

async function storageReport(user: AuthUser, query: Record<string, unknown>) {
  if (!(await tableExists("project_files"))) {
    return { total_files: 0, storage_used_mb: 0, files_by_category: [], storage_by_project: [], storage_by_visibility: [], largest_files: [] };
  }
  const where = scopedWhere(user, query, "f");
  const [total, category, project, visibility, largest] = await Promise.all([
    one(`select count(*) as total_files, coalesce(sum(f.file_size),0) / 1024.0 / 1024.0 as storage_used_mb from project_files f ${where.clause}`, where.params),
    rows(`select coalesce(f.file_category, 'غير محدد') as label, count(*) as value from project_files f ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select p.project_name as label, coalesce(sum(f.file_size),0) / 1024.0 / 1024.0 as value from project_files f join projects p on p.id = f.project_id ${where.clause} group by 1 order by 2 desc limit 10`, where.params),
    rows(`select coalesce(f.visibility::text, 'غير محدد') as label, coalesce(sum(f.file_size),0) / 1024.0 / 1024.0 as value from project_files f ${where.clause} group by 1 order by 2 desc`, where.params),
    rows(`select f.id, f.original_name, f.file_size, f.file_category from project_files f ${where.clause} order by f.file_size desc limit 10`, where.params),
  ]);
  return { total_files: num(total.total_files), storage_used_mb: Number(num(total.storage_used_mb).toFixed(2)), files_by_category: mapCount(category), storage_by_project: project, storage_by_visibility: visibility, largest_files: largest };
}

async function handle(kind: ReportKind, req: Request, res: Response, fn: (user: AuthUser, query: Record<string, unknown>) => Promise<unknown>) {
  try {
    const user = getUser(req);
    if (!canAccess(user, kind)) {
      res.status(403).json({ success: false, message: "ليس لديك صلاحية الوصول لهذا التقرير" });
      return;
    }
    res.json({ success: true, data: await fn(user, req.query), message: "تمت العملية بنجاح" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ success: false, message: "حدث خطأ في الخادم" });
  }
}

router.get("/reports/overview", authMiddleware, (req, res) => handle("overview", req, res, overview));
router.get("/reports/projects", authMiddleware, (req, res) => handle("projects", req, res, projectsReport));
router.get("/reports/clients", authMiddleware, (req, res) => handle("clients", req, res, clientsReport));
router.get("/reports/workflow", authMiddleware, (req, res) => handle("workflow", req, res, workflowReport));
router.get("/reports/finance", authMiddleware, (req, res) => handle("finance", req, res, financeReport));
router.get("/reports/tasks", authMiddleware, (req, res) => handle("tasks", req, res, tasksReport));
router.get("/reports/storage", authMiddleware, (req, res) => handle("storage", req, res, storageReport));

export default router;
