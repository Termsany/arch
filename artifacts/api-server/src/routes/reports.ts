import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";
import { authMiddleware, getUser, type AuthUser } from "../lib/auth";
import { asyncHandler, fail, ok } from "../lib/http";

const router = Router();

type ReportKind = "overview" | "projects" | "clients" | "workflow" | "finance" | "tasks" | "storage";
type QueryParams = Array<string | number | string[]>;

type Scope = {
  where: string;
  and: string;
  params: QueryParams;
};

const activeProjectStatuses = ["جاري", "جاري العمل", "active", "in_progress"];
const completedProjectStatuses = ["مكتمل", "مكتملة", "completed", "done"];
const waitingApprovalStatuses = ["في انتظار موافقة العميل", "waiting_client_approval", "waiting_approval"];
const revisionStatuses = ["يحتاج تعديل", "طلب تعديل", "revision_requested", "needs_revision"];

const accessByReport: Record<ReportKind, Set<string>> = {
  overview: new Set(["super_admin", "office_admin", "accountant", "project_manager"]),
  projects: new Set(["super_admin", "office_admin", "project_manager", "designer"]),
  clients: new Set(["super_admin", "office_admin", "project_manager"]),
  workflow: new Set(["super_admin", "office_admin", "project_manager"]),
  finance: new Set(["super_admin", "office_admin", "accountant"]),
  tasks: new Set(["super_admin", "office_admin", "project_manager", "designer"]),
  storage: new Set(["super_admin", "office_admin", "project_manager"]),
};

function hasReportAccess(report: ReportKind, user: AuthUser): boolean {
  return accessByReport[report].has(user.role);
}

function reportGuard(report: ReportKind) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = getUser(req);
    if (!hasReportAccess(report, user)) {
      fail(res, 403, "ليس لديك صلاحية الوصول لهذا التقرير");
      return;
    }
    next();
  };
}

function parsePositiveInt(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseDate(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

function buildScope(req: Request, user: AuthUser, alias: string, dateColumn = "created_at"): Scope | null {
  const params: QueryParams = [];
  const conditions: string[] = [];
  const requestedOfficeId = user.role === "super_admin" ? parsePositiveInt(req.query["office_id"]) : null;

  if (user.role === "super_admin") {
    if (requestedOfficeId) {
      params.push(requestedOfficeId);
      conditions.push(`${alias}.office_id = $${params.length}`);
    }
  } else {
    if (!user.officeId) return null;
    params.push(user.officeId);
    conditions.push(`${alias}.office_id = $${params.length}`);
  }

  const fromDate = parseDate(req.query["from_date"]);
  const toDate = parseDate(req.query["to_date"]);
  if (fromDate) {
    params.push(fromDate);
    conditions.push(`${alias}.${dateColumn} >= $${params.length}::date`);
  }
  if (toDate) {
    params.push(toDate);
    conditions.push(`${alias}.${dateColumn} < ($${params.length}::date + interval '1 day')`);
  }

  const clause = conditions.join(" AND ");
  return {
    where: clause ? `WHERE ${clause}` : "",
    and: clause ? `AND ${clause}` : "",
    params,
  };
}

function withParam(scope: Scope, value: string | number | string[]): string {
  scope.params.push(value);
  return `$${scope.params.length}`;
}

function nextCondition(scope: Scope): string {
  return scope.where ? "AND" : "WHERE";
}

function numberValue(value: unknown): number {
  return Number(value ?? 0);
}

async function one<T extends Record<string, unknown>>(sql: string, params: QueryParams = []): Promise<T> {
  const result = await pool.query<T>(sql, params);
  return result.rows[0] ?? ({} as T);
}

async function many<T extends Record<string, unknown>>(sql: string, params: QueryParams = []): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

async function scalar(sql: string, params: QueryParams = []): Promise<number> {
  const result = await pool.query<{ value: string | number | null }>(sql, params);
  return numberValue(result.rows[0]?.value);
}

function normalizeCountRows(rows: Array<Record<string, unknown>>, keyName = "key") {
  return rows.map((row) => ({
    [keyName]: String(row[keyName] ?? "غير محدد"),
    count: numberValue(row["count"]),
  }));
}

function normalizeMoneyRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    ...row,
    total: numberValue(row["total"]),
    paid_amount: row["paid_amount"] === undefined ? undefined : numberValue(row["paid_amount"]),
    outstanding_amount: row["outstanding_amount"] === undefined ? undefined : numberValue(row["outstanding_amount"]),
    storage_mb: row["storage_mb"] === undefined ? undefined : numberValue(row["storage_mb"]),
  }));
}

function sendNoOffice(res: Response): void {
  ok(res, {
    total_clients: 0,
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    waiting_client_approval_projects: 0,
    total_boq_value: 0,
    total_invoice_value: 0,
    total_paid_amount: 0,
    total_outstanding_amount: 0,
    overdue_invoices_count: 0,
    open_tasks_count: 0,
    overdue_tasks_count: 0,
    storage_used_mb: 0,
  });
}

router.use(authMiddleware);

router.get("/reports/overview", reportGuard("overview"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const clientScope = buildScope(req, user, "c");
  const projectScope = buildScope(req, user, "p");
  const invoiceScope = buildScope(req, user, "i");
  const taskScope = buildScope(req, user, "t");
  const fileScope = buildScope(req, user, "f");
  if (!clientScope || !projectScope || !invoiceScope || !taskScope || !fileScope) {
    sendNoOffice(res);
    return;
  }

  const activeParam = withParam(projectScope, activeProjectStatuses);
  const completedParam = withParam(projectScope, completedProjectStatuses);
  const waitingParam = withParam(projectScope, waitingApprovalStatuses);
  const projectCounts = await one<{
    total_projects: string;
    active_projects: string;
    completed_projects: string;
    waiting_client_approval_projects: string;
  }>(`
    SELECT
      COUNT(*) AS total_projects,
      COUNT(*) FILTER (WHERE p.project_status = ANY(${activeParam}::text[])) AS active_projects,
      COUNT(*) FILTER (WHERE p.project_status = ANY(${completedParam}::text[])) AS completed_projects,
      COUNT(*) FILTER (WHERE p.project_status = ANY(${waitingParam}::text[])) AS waiting_client_approval_projects
    FROM projects p
    ${projectScope.where}
  `, projectScope.params);

  const waitingStageScope = buildScope(req, user, "p");
  const waitingStageParam = withParam(waitingStageScope!, waitingApprovalStatuses);
  const waitingStages = await scalar(`
    SELECT COUNT(DISTINCT p.id) AS value
    FROM projects p
    JOIN project_stages ps ON ps.project_id = p.id
    ${waitingStageScope!.where}
    ${nextCondition(waitingStageScope!)} ps.status = ANY(${waitingStageParam}::text[])
  `, waitingStageScope!.params);

  const totalClients = await scalar(`SELECT COUNT(*) AS value FROM clients c ${clientScope.where}`, clientScope.params);

  const boqScope = buildScope(req, user, "p");
  const boqValue = boqScope ? await scalar(`
    SELECT COALESCE(SUM(pe.total_price), 0) AS value
    FROM project_estimates pe
    JOIN projects p ON p.id = pe.project_id
    ${boqScope.where}
  `, boqScope.params) : 0;

  const invoiceTotals = await one<{ total_invoice_value: string; total_paid_amount: string; total_outstanding_amount: string }>(`
    SELECT
      COALESCE(SUM(i.total_amount), 0) AS total_invoice_value,
      COALESCE(SUM(i.paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(GREATEST(i.total_amount - i.paid_amount, 0)), 0) AS total_outstanding_amount
    FROM invoices i
    ${invoiceScope.where}
    ${nextCondition(invoiceScope)} i.status <> 'cancelled'
  `, invoiceScope.params);

  const overdueInvoices = await scalar(`
    SELECT COUNT(*) AS value
    FROM invoices i
    ${invoiceScope.where}
    ${nextCondition(invoiceScope)} i.status <> 'cancelled'
    AND i.status <> 'paid'
    AND i.due_date IS NOT NULL
    AND i.due_date < CURRENT_DATE
    AND i.paid_amount < i.total_amount
  `, invoiceScope.params);

  const taskCounts = await one<{ open_tasks_count: string; overdue_tasks_count: string }>(`
    SELECT
      COUNT(*) FILTER (WHERE t.status <> 'done') AS open_tasks_count,
      COUNT(*) FILTER (WHERE t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS overdue_tasks_count
    FROM project_tasks t
    ${taskScope.where}
  `, taskScope.params);

  const storageUsedMb = await scalar(`
    SELECT COALESCE(SUM(f.file_size), 0) / 1024.0 / 1024.0 AS value
    FROM project_files f
    ${fileScope.where}
  `, fileScope.params);

  ok(res, {
    total_clients: totalClients,
    total_projects: numberValue(projectCounts.total_projects),
    active_projects: numberValue(projectCounts.active_projects),
    completed_projects: numberValue(projectCounts.completed_projects),
    waiting_client_approval_projects: Math.max(numberValue(projectCounts.waiting_client_approval_projects), waitingStages),
    total_boq_value: boqValue,
    total_invoice_value: numberValue(invoiceTotals.total_invoice_value),
    total_paid_amount: numberValue(invoiceTotals.total_paid_amount),
    total_outstanding_amount: numberValue(invoiceTotals.total_outstanding_amount),
    overdue_invoices_count: overdueInvoices,
    open_tasks_count: numberValue(taskCounts.open_tasks_count),
    overdue_tasks_count: numberValue(taskCounts.overdue_tasks_count),
    storage_used_mb: storageUsedMb,
  });
}));

router.get("/reports/projects", reportGuard("projects"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "p");
  if (!scope) {
    ok(res, {
      projects_by_status: [],
      projects_by_design_type: [],
      projects_created_per_month: [],
      completed_projects_per_month: [],
      projects_waiting_client_approval: [],
      projects_with_revision_requests: [],
    });
    return;
  }

  const byStatus = normalizeCountRows(await many(`
    SELECT COALESCE(NULLIF(p.project_status, ''), 'غير محدد') AS key, COUNT(*) AS count
    FROM projects p
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const byDesign = normalizeCountRows(await many(`
    SELECT COALESCE(NULLIF(p.design_type, ''), 'غير محدد') AS key, COUNT(*) AS count
    FROM projects p
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const createdPerMonth = await many(`
    SELECT to_char(date_trunc('month', p.created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM projects p
    ${scope.where}
    GROUP BY month
    ORDER BY month ASC
  `, scope.params);

  const completedScope = buildScope(req, user, "p");
  const completedParam = withParam(completedScope!, completedProjectStatuses);
  const completedPerMonth = await many(`
    SELECT to_char(date_trunc('month', p.updated_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM projects p
    ${completedScope!.where}
    ${nextCondition(completedScope!)} p.project_status = ANY(${completedParam}::text[])
    GROUP BY month
    ORDER BY month ASC
  `, completedScope!.params);

  const waitingScope = buildScope(req, user, "p");
  const waitingParam = withParam(waitingScope!, waitingApprovalStatuses);
  const waitingProjects = await many(`
    SELECT DISTINCT p.id, p.project_name, c.name AS client_name, p.project_status
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN project_stages ps ON ps.project_id = p.id
    ${waitingScope!.where}
    ${nextCondition(waitingScope!)} (p.project_status = ANY(${waitingParam}::text[]) OR ps.status = ANY(${waitingParam}::text[]))
    ORDER BY p.id DESC
    LIMIT 20
  `, waitingScope!.params);

  const revisionScope = buildScope(req, user, "p");
  const revisionParam = withParam(revisionScope!, revisionStatuses);
  const revisionProjects = await many(`
    SELECT DISTINCT p.id, p.project_name, c.name AS client_name, p.project_status
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN project_stages ps ON ps.project_id = p.id
    LEFT JOIN stage_approvals sa ON sa.project_id = p.id
    ${revisionScope!.where}
    ${nextCondition(revisionScope!)} (
      ps.status = ANY(${revisionParam}::text[])
      OR sa.approval_status = 'revision_requested'
      OR ps.client_feedback IS NOT NULL
    )
    ORDER BY p.id DESC
    LIMIT 20
  `, revisionScope!.params);

  ok(res, {
    projects_by_status: byStatus,
    projects_by_design_type: byDesign,
    projects_created_per_month: createdPerMonth,
    completed_projects_per_month: completedPerMonth,
    projects_waiting_client_approval: waitingProjects,
    projects_with_revision_requests: revisionProjects,
  });
}));

router.get("/reports/clients", reportGuard("clients"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "c");
  if (!scope) {
    ok(res, {
      total_clients: 0,
      new_clients_per_month: [],
      clients_with_most_projects: [],
      clients_with_pending_approvals: [],
      clients_with_unpaid_invoices: [],
    });
    return;
  }

  const totalClients = await scalar(`SELECT COUNT(*) AS value FROM clients c ${scope.where}`, scope.params);
  const newClientsPerMonth = await many(`
    SELECT to_char(date_trunc('month', c.created_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM clients c
    ${scope.where}
    GROUP BY month
    ORDER BY month ASC
  `, scope.params);

  const mostProjects = await many(`
    SELECT c.id, c.name, c.phone, COUNT(p.id)::int AS projects_count
    FROM clients c
    LEFT JOIN projects p ON p.client_id = c.id
    ${scope.where}
    GROUP BY c.id, c.name, c.phone
    HAVING COUNT(p.id) > 0
    ORDER BY projects_count DESC, c.name ASC
    LIMIT 10
  `, scope.params);

  const pendingScope = buildScope(req, user, "c");
  const waitingParam = withParam(pendingScope!, waitingApprovalStatuses);
  const pendingApprovals = await many(`
    SELECT DISTINCT c.id, c.name, COUNT(DISTINCT p.id)::int AS projects_count
    FROM clients c
    JOIN projects p ON p.client_id = c.id
    LEFT JOIN project_stages ps ON ps.project_id = p.id
    ${pendingScope!.where}
    ${nextCondition(pendingScope!)} (p.project_status = ANY(${waitingParam}::text[]) OR ps.status = ANY(${waitingParam}::text[]))
    GROUP BY c.id, c.name
    ORDER BY projects_count DESC, c.name ASC
    LIMIT 10
  `, pendingScope!.params);

  const unpaidInvoices = normalizeMoneyRows(await many(`
    SELECT c.id, c.name, COUNT(i.id)::int AS invoices_count,
      COALESCE(SUM(GREATEST(i.total_amount - i.paid_amount, 0)), 0) AS total
    FROM clients c
    JOIN invoices i ON i.client_id = c.id
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
    AND i.paid_amount < i.total_amount
    GROUP BY c.id, c.name
    ORDER BY total DESC, c.name ASC
    LIMIT 10
  `, scope.params));

  ok(res, {
    total_clients: totalClients,
    new_clients_per_month: newClientsPerMonth,
    clients_with_most_projects: mostProjects,
    clients_with_pending_approvals: pendingApprovals,
    clients_with_unpaid_invoices: unpaidInvoices,
  });
}));

router.get("/reports/workflow", reportGuard("workflow"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "p");
  if (!scope) {
    ok(res, {
      stages_by_status: [],
      stages_waiting_approval: [],
      stages_needing_revision: [],
      most_common_revision_stages: [],
      average_stage_completion_time: null,
      projects_blocked_by_client_approval: [],
    });
    return;
  }

  const stagesByStatus = normalizeCountRows(await many(`
    SELECT COALESCE(NULLIF(ps.status, ''), 'غير محدد') AS key, COUNT(*) AS count
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const waitingScope = buildScope(req, user, "p");
  const waitingParam = withParam(waitingScope!, waitingApprovalStatuses);
  const waitingStages = await many(`
    SELECT ps.id, ps.stage_name, ps.status, p.id AS project_id, p.project_name
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    ${waitingScope!.where}
    ${nextCondition(waitingScope!)} ps.status = ANY(${waitingParam}::text[])
    ORDER BY ps.updated_at DESC
    LIMIT 20
  `, waitingScope!.params);

  const revisionScope = buildScope(req, user, "p");
  const revisionParam = withParam(revisionScope!, revisionStatuses);
  const revisionStages = await many(`
    SELECT DISTINCT ps.id, ps.stage_name, ps.status, ps.client_feedback, p.id AS project_id, p.project_name
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    LEFT JOIN stage_approvals sa ON sa.stage_id = ps.id
    ${revisionScope!.where}
    ${nextCondition(revisionScope!)} (ps.status = ANY(${revisionParam}::text[]) OR sa.approval_status = 'revision_requested' OR ps.client_feedback IS NOT NULL)
    ORDER BY ps.id DESC
    LIMIT 20
  `, revisionScope!.params);

  const commonRevisionScope = buildScope(req, user, "p");
  const commonRevisionParam = withParam(commonRevisionScope!, revisionStatuses);
  const commonRevisionStages = normalizeCountRows(await many(`
    SELECT ps.stage_name AS key, COUNT(*) AS count
    FROM project_stages ps
    JOIN projects p ON p.id = ps.project_id
    LEFT JOIN stage_approvals sa ON sa.stage_id = ps.id
    ${commonRevisionScope!.where}
    ${nextCondition(commonRevisionScope!)} (ps.status = ANY(${commonRevisionParam}::text[]) OR sa.approval_status = 'revision_requested' OR ps.client_feedback IS NOT NULL)
    GROUP BY ps.stage_name
    ORDER BY count DESC, ps.stage_name ASC
    LIMIT 10
  `, commonRevisionScope!.params));

  const blockedScope = buildScope(req, user, "p");
  const blockedParam = withParam(blockedScope!, waitingApprovalStatuses);
  const blockedProjects = await many(`
    SELECT DISTINCT p.id, p.project_name, c.name AS client_name
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN project_stages ps ON ps.project_id = p.id
    ${blockedScope!.where}
    ${nextCondition(blockedScope!)} (p.project_status = ANY(${blockedParam}::text[]) OR ps.status = ANY(${blockedParam}::text[]))
    ORDER BY p.id DESC
    LIMIT 20
  `, blockedScope!.params);

  ok(res, {
    stages_by_status: stagesByStatus,
    stages_waiting_approval: waitingStages,
    stages_needing_revision: revisionStages,
    most_common_revision_stages: commonRevisionStages,
    average_stage_completion_time: null,
    projects_blocked_by_client_approval: blockedProjects,
  });
}));

router.get("/reports/finance", reportGuard("finance"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "i", "created_at");
  if (!scope) {
    ok(res, {
      invoices_by_status: [],
      total_invoice_value: 0,
      total_paid_amount: 0,
      total_outstanding_amount: 0,
      overdue_invoices: [],
      payments_per_month: [],
      invoice_totals_per_month: [],
      top_projects_by_revenue: [],
      top_clients_by_revenue: [],
    });
    return;
  }

  const invoicesByStatus = normalizeCountRows(await many(`
    SELECT i.status::text AS key, COUNT(*) AS count
    FROM invoices i
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const totals = await one<{ total_invoice_value: string; total_paid_amount: string; total_outstanding_amount: string }>(`
    SELECT
      COALESCE(SUM(i.total_amount), 0) AS total_invoice_value,
      COALESCE(SUM(i.paid_amount), 0) AS total_paid_amount,
      COALESCE(SUM(GREATEST(i.total_amount - i.paid_amount, 0)), 0) AS total_outstanding_amount
    FROM invoices i
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
  `, scope.params);

  const overdueInvoices = normalizeMoneyRows(await many(`
    SELECT i.id, i.invoice_number, i.due_date, i.total_amount AS total, i.paid_amount,
      GREATEST(i.total_amount - i.paid_amount, 0) AS outstanding_amount,
      p.project_name, c.name AS client_name
    FROM invoices i
    LEFT JOIN projects p ON p.id = i.project_id
    LEFT JOIN clients c ON c.id = i.client_id
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
    AND i.status <> 'paid'
    AND i.due_date IS NOT NULL
    AND i.due_date < CURRENT_DATE
    AND i.paid_amount < i.total_amount
    ORDER BY i.due_date ASC
    LIMIT 20
  `, scope.params));

  const paymentScope = buildScope(req, user, "pa", "payment_date");
  const paymentsPerMonth = normalizeMoneyRows(await many(`
    SELECT to_char(date_trunc('month', pa.payment_date), 'YYYY-MM') AS month,
      COALESCE(SUM(pa.amount), 0) AS total
    FROM payments pa
    ${paymentScope!.where}
    GROUP BY month
    ORDER BY month ASC
  `, paymentScope!.params));

  const invoiceTotalsPerMonth = normalizeMoneyRows(await many(`
    SELECT to_char(date_trunc('month', i.created_at), 'YYYY-MM') AS month,
      COALESCE(SUM(i.total_amount), 0) AS total
    FROM invoices i
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
    GROUP BY month
    ORDER BY month ASC
  `, scope.params));

  const topProjects = normalizeMoneyRows(await many(`
    SELECT p.id, p.project_name, COALESCE(SUM(i.paid_amount), 0) AS total
    FROM invoices i
    JOIN projects p ON p.id = i.project_id
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
    GROUP BY p.id, p.project_name
    ORDER BY total DESC, p.project_name ASC
    LIMIT 10
  `, scope.params));

  const topClients = normalizeMoneyRows(await many(`
    SELECT c.id, c.name, COALESCE(SUM(i.paid_amount), 0) AS total
    FROM invoices i
    JOIN clients c ON c.id = i.client_id
    ${scope.where}
    ${nextCondition(scope)} i.status <> 'cancelled'
    GROUP BY c.id, c.name
    ORDER BY total DESC, c.name ASC
    LIMIT 10
  `, scope.params));

  ok(res, {
    invoices_by_status: invoicesByStatus,
    total_invoice_value: numberValue(totals.total_invoice_value),
    total_paid_amount: numberValue(totals.total_paid_amount),
    total_outstanding_amount: numberValue(totals.total_outstanding_amount),
    overdue_invoices: overdueInvoices,
    payments_per_month: paymentsPerMonth,
    invoice_totals_per_month: invoiceTotalsPerMonth,
    top_projects_by_revenue: topProjects,
    top_clients_by_revenue: topClients,
  });
}));

router.get("/reports/tasks", reportGuard("tasks"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "t");
  if (!scope) {
    ok(res, {
      tasks_by_status: [],
      tasks_by_priority: [],
      tasks_by_assignee: [],
      overdue_tasks: [],
      tasks_due_this_week: [],
      completed_tasks_per_month: [],
    });
    return;
  }

  const byStatus = normalizeCountRows(await many(`
    SELECT COALESCE(NULLIF(t.status::text, ''), 'غير محدد') AS key, COUNT(*) AS count
    FROM project_tasks t
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const byPriority = normalizeCountRows(await many(`
    SELECT COALESCE(NULLIF(t.priority::text, ''), 'غير محدد') AS key, COUNT(*) AS count
    FROM project_tasks t
    ${scope.where}
    GROUP BY key
    ORDER BY count DESC, key ASC
  `, scope.params));

  const byAssignee = await many(`
    SELECT COALESCE(u.name, 'غير معين') AS name, COUNT(*)::int AS count
    FROM project_tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    ${scope.where}
    GROUP BY name
    ORDER BY count DESC, name ASC
    LIMIT 20
  `, scope.params);

  const overdueTasks = await many(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date, p.project_name, u.name AS assigned_to_name
    FROM project_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    ${scope.where}
    ${nextCondition(scope)} t.status <> 'done'
    AND t.due_date IS NOT NULL
    AND t.due_date < CURRENT_DATE
    ORDER BY t.due_date ASC
    LIMIT 20
  `, scope.params);

  const dueThisWeek = await many(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date, p.project_name, u.name AS assigned_to_name
    FROM project_tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    ${scope.where}
    ${nextCondition(scope)} t.status <> 'done'
    AND t.due_date IS NOT NULL
    AND t.due_date >= CURRENT_DATE
    AND t.due_date <= CURRENT_DATE + interval '7 days'
    ORDER BY t.due_date ASC
    LIMIT 20
  `, scope.params);

  const completedScope = buildScope(req, user, "t", "completed_at");
  const completedPerMonth = await many(`
    SELECT to_char(date_trunc('month', t.completed_at), 'YYYY-MM') AS month, COUNT(*)::int AS count
    FROM project_tasks t
    ${completedScope!.where}
    ${nextCondition(completedScope!)} t.completed_at IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
  `, completedScope!.params);

  ok(res, {
    tasks_by_status: byStatus,
    tasks_by_priority: byPriority,
    tasks_by_assignee: byAssignee,
    overdue_tasks: overdueTasks,
    tasks_due_this_week: dueThisWeek,
    completed_tasks_per_month: completedPerMonth,
  });
}));

router.get("/reports/storage", reportGuard("storage"), asyncHandler(async (req, res) => {
  const user = getUser(req);
  const scope = buildScope(req, user, "f");
  if (!scope) {
    ok(res, {
      total_files: 0,
      storage_used_mb: 0,
      files_by_category: [],
      storage_by_project: [],
      storage_by_visibility: [],
      largest_files: [],
    });
    return;
  }

  const totals = await one<{ total_files: string; storage_used_mb: string }>(`
    SELECT COUNT(*) AS total_files, COALESCE(SUM(f.file_size), 0) / 1024.0 / 1024.0 AS storage_used_mb
    FROM project_files f
    ${scope.where}
  `, scope.params);

  const filesByCategory = await many(`
    SELECT COALESCE(NULLIF(f.file_category, ''), 'غير محدد') AS category,
      COUNT(*)::int AS count,
      COALESCE(SUM(f.file_size), 0) / 1024.0 / 1024.0 AS storage_mb
    FROM project_files f
    ${scope.where}
    GROUP BY category
    ORDER BY storage_mb DESC, category ASC
  `, scope.params);

  const storageByProject = await many(`
    SELECT p.id, p.project_name, COUNT(f.id)::int AS files_count,
      COALESCE(SUM(f.file_size), 0) / 1024.0 / 1024.0 AS storage_mb
    FROM project_files f
    JOIN projects p ON p.id = f.project_id
    ${scope.where}
    GROUP BY p.id, p.project_name
    ORDER BY storage_mb DESC, p.project_name ASC
    LIMIT 20
  `, scope.params);

  const byVisibility = await many(`
    SELECT f.visibility::text AS visibility, COUNT(*)::int AS count,
      COALESCE(SUM(f.file_size), 0) / 1024.0 / 1024.0 AS storage_mb
    FROM project_files f
    ${scope.where}
    GROUP BY visibility
    ORDER BY storage_mb DESC, visibility ASC
  `, scope.params);

  const largestFiles = await many(`
    SELECT f.id, f.original_name, f.file_category, f.visibility::text AS visibility,
      f.file_size / 1024.0 / 1024.0 AS storage_mb,
      p.project_name
    FROM project_files f
    LEFT JOIN projects p ON p.id = f.project_id
    ${scope.where}
    ORDER BY f.file_size DESC
    LIMIT 10
  `, scope.params);

  ok(res, {
    total_files: numberValue(totals.total_files),
    storage_used_mb: numberValue(totals.storage_used_mb),
    files_by_category: filesByCategory.map((row) => ({ ...row, storage_mb: numberValue(row["storage_mb"]) })),
    storage_by_project: storageByProject.map((row) => ({ ...row, storage_mb: numberValue(row["storage_mb"]) })),
    storage_by_visibility: byVisibility.map((row) => ({ ...row, storage_mb: numberValue(row["storage_mb"]) })),
    largest_files: largestFiles.map((row) => ({ ...row, storage_mb: numberValue(row["storage_mb"]) })),
  });
}));

export default router;
