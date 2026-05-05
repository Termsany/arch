import { parseApiResponse } from "./api-response";

export type ReportKey = "overview" | "projects" | "clients" | "workflow" | "finance" | "tasks" | "storage";

export interface ReportFilters {
  from_date?: string;
  to_date?: string;
  office_id?: string;
}

export interface OverviewReport {
  total_clients: number;
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  waiting_client_approval_projects: number;
  total_boq_value: number;
  total_invoice_value: number;
  total_paid_amount: number;
  total_outstanding_amount: number;
  overdue_invoices_count: number;
  open_tasks_count: number;
  overdue_tasks_count: number;
  storage_used_mb: number;
}

export type ReportData = Record<string, unknown>;

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

function query(filters: ReportFilters) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function fetchReport<T extends ReportData>(report: ReportKey, filters: ReportFilters = {}) {
  const res = await fetch(`/api/reports/${report}${query(filters)}`, { headers: headers() });
  return parseApiResponse<T>(res);
}

export async function fetchOverviewReport(filters: ReportFilters = {}) {
  return fetchReport<OverviewReport & ReportData>("overview", filters);
}
