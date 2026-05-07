import { parseApiResponse } from "@/lib/api-response";

export interface AuditLogItem {
  id: number;
  officeId: number | null;
  officeName: string | null;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  page: number;
  limit: number;
  total: number;
}

export interface AuditLogFilters {
  officeId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export async function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  if (filters.officeId) params.set("office_id", filters.officeId);
  if (filters.userId) params.set("user_id", filters.userId);
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entity_type", filters.entityType);
  if (filters.entityId) params.set("entity_id", filters.entityId);
  if (filters.fromDate) params.set("from_date", filters.fromDate);
  if (filters.toDate) params.set("to_date", filters.toDate);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 25));

  const res = await fetch(`/api/audit-logs?${params.toString()}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  });
  return parseApiResponse<AuditLogsResponse>(res);
}
