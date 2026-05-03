import { parseApiResponse } from "./api-response";

export interface AppNotification {
  id: number;
  officeId: number | null;
  userId: number | null;
  clientId: number | null;
  projectId: number | null;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unreadCount: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

export async function fetchNotifications(limit = 20): Promise<NotificationsResponse> {
  const res = await fetch(`/api/notifications?limit=${limit}`, { headers: authHeaders() });
  return parseApiResponse<NotificationsResponse>(res);
}

export async function markNotificationRead(id: number): Promise<AppNotification> {
  const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", headers: authHeaders() });
  return parseApiResponse<AppNotification>(res);
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch("/api/notifications/read-all", { method: "PATCH", headers: authHeaders() });
  await parseApiResponse<null>(res);
}

export async function deleteNotification(id: number): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, { method: "DELETE", headers: authHeaders() });
  await parseApiResponse(res);
}
