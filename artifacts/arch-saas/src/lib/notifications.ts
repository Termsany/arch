import { parseApiResponse } from "./api-response";

export interface AppNotification {
  id: number;
  officeId: number | null;
  userId: number | null;
  clientId: number | null;
  projectId: number | null;
  title: string;
  message: string;
  key?: string | null;
  params?: Record<string, string | number> | null;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}

export function renderNotificationText(
  notification: AppNotification,
  field: "title" | "message",
  translate: (key: string) => string,
): string {
  const translatedKey = notification.key ? translate(notification.key) : "";
  const fallback = field === "title" ? notification.title : notification.message;
  const template = translatedKey && translatedKey !== notification.key ? translatedKey : fallback;

  if (!notification.params) return template;

  return Object.entries(notification.params).reduce(
    (message, [key, value]) => message.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value)),
    template,
  );
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
