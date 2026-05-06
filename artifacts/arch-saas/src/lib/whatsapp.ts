import { parseApiResponse } from "./api-response";

export type WhatsappMessageStatus = "pending" | "sent" | "failed" | "simulated";
export type WhatsappMessageType =
  | "client_approval_request"
  | "client_revision_update"
  | "file_uploaded"
  | "quotation_created"
  | "invoice_created"
  | "payment_reminder"
  | "appointment_reminder"
  | "general";

export interface WhatsappStatus {
  enabled: boolean;
  provider: string;
  simulationMode: boolean;
}

export interface WhatsappTemplate {
  id: number;
  officeId: number | null;
  templateKey: string;
  nameAr: string;
  messageBody: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappMessage {
  id: number;
  officeId: number;
  projectId: number | null;
  clientId: number | null;
  invoiceId: number | null;
  phone: string;
  messageBody: string;
  messageType: WhatsappMessageType;
  provider: string;
  status: WhatsappMessageStatus;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

export const MESSAGE_TYPE_LABELS: Record<WhatsappMessageType, string> = {
  client_approval_request: "طلب موافقة العميل",
  client_revision_update: "تحديث طلب تعديل",
  file_uploaded: "ملف جديد",
  quotation_created: "عرض سعر جديد",
  invoice_created: "فاتورة جديدة",
  payment_reminder: "تذكير بدفعة",
  appointment_reminder: "تذكير بموعد",
  general: "رسالة عامة",
};

export const MESSAGE_STATUS_LABELS: Record<WhatsappMessageStatus, string> = {
  pending: "معلقة",
  sent: "مرسلة",
  failed: "فشلت",
  simulated: "تجريبية",
};

export const WHATSAPP_MESSAGE_TYPES = Object.keys(MESSAGE_TYPE_LABELS) as WhatsappMessageType[];

export async function fetchWhatsappStatus() {
  const res = await fetch("/api/whatsapp/status", { headers: headers() });
  return parseApiResponse<WhatsappStatus>(res);
}

export async function fetchWhatsappTemplates() {
  const res = await fetch("/api/whatsapp/templates", { headers: headers() });
  return parseApiResponse<WhatsappTemplate[]>(res);
}

export async function createWhatsappTemplate(data: {
  templateKey: string;
  nameAr: string;
  messageBody: string;
  isActive: boolean;
}) {
  const res = await fetch("/api/whatsapp/templates", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  return parseApiResponse<WhatsappTemplate>(res);
}

export async function updateWhatsappTemplate(id: number, data: {
  templateKey: string;
  nameAr: string;
  messageBody: string;
  isActive: boolean;
}) {
  const res = await fetch(`/api/whatsapp/templates/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify(data),
  });
  return parseApiResponse<WhatsappTemplate>(res);
}

export async function toggleWhatsappTemplate(id: number) {
  const res = await fetch(`/api/whatsapp/templates/${id}/toggle-active`, { method: "PATCH", headers: headers() });
  return parseApiResponse<WhatsappTemplate>(res);
}

export async function deleteWhatsappTemplate(id: number) {
  const res = await fetch(`/api/whatsapp/templates/${id}`, { method: "DELETE", headers: headers() });
  return parseApiResponse<{ id: number }>(res);
}

export async function fetchWhatsappMessages(filters: { status?: string; messageType?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.messageType && filters.messageType !== "all") params.set("message_type", filters.messageType);
  const query = params.toString();
  const res = await fetch(`/api/whatsapp/messages${query ? `?${query}` : ""}`, { headers: headers() });
  return parseApiResponse<WhatsappMessage[]>(res);
}

export async function sendWhatsappMessage(data: {
  phone: string;
  messageBody: string;
  messageType: WhatsappMessageType;
  projectId?: number | null;
  clientId?: number | null;
  invoiceId?: number | null;
}) {
  const res = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  return parseApiResponse<WhatsappMessage | null>(res);
}
