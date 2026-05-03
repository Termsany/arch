import { parseApiResponse } from "./api-response";

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: number;
  officeId: number;
  projectId: number;
  clientId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: InvoiceStatus;
  notes: string | null;
  projectName?: string | null;
  clientName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: number;
  invoiceId: number;
  itemName: string;
  description: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
}

export interface Payment {
  id: number;
  invoiceId: number;
  amount: string;
  paymentDate: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  notes: string | null;
}

export interface InvoiceDetails extends Invoice {
  items: InvoiceItem[];
  payments: Payment[];
}

export interface FinanceStats {
  totalInvoices: number;
  totalPaid: number;
  totalDue: number;
  overdueInvoices: number;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "مسودة",
  sent: "مرسلة",
  partially_paid: "مدفوعة جزئياً",
  paid: "مدفوعة",
  overdue: "متأخرة",
  cancelled: "ملغية",
};

export function formatAmount(value: unknown) {
  return Number(value ?? 0).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function fetchInvoices() {
  const res = await fetch("/api/invoices", { headers: headers() });
  return parseApiResponse<Invoice[]>(res);
}

export async function fetchProjectInvoices(projectId: number) {
  const res = await fetch(`/api/projects/${projectId}/invoices`, { headers: headers() });
  return parseApiResponse<Invoice[]>(res);
}

export async function fetchInvoice(id: number) {
  const res = await fetch(`/api/invoices/${id}`, { headers: headers() });
  return parseApiResponse<InvoiceDetails>(res);
}

export async function createInvoice(projectId: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${projectId}/invoices`, { method: "POST", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<Invoice>(res);
}

export async function updateInvoice(id: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/invoices/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<Invoice>(res);
}

export async function updateInvoiceStatus(id: number, status: "draft" | "sent" | "cancelled") {
  const res = await fetch(`/api/invoices/${id}/status`, { method: "PATCH", headers: headers(), body: JSON.stringify({ status }) });
  return parseApiResponse<Invoice>(res);
}

export async function deleteInvoice(id: number) {
  const res = await fetch(`/api/invoices/${id}`, { method: "DELETE", headers: headers() });
  return parseApiResponse(res);
}

export async function addInvoiceItem(invoiceId: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/invoices/${invoiceId}/items`, { method: "POST", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<Invoice>(res);
}

export async function updateInvoiceItem(itemId: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/invoice-items/${itemId}`, { method: "PUT", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<Invoice>(res);
}

export async function deleteInvoiceItem(itemId: number) {
  const res = await fetch(`/api/invoice-items/${itemId}`, { method: "DELETE", headers: headers() });
  return parseApiResponse<Invoice>(res);
}

export async function addPayment(invoiceId: number, data: Record<string, unknown>) {
  const res = await fetch(`/api/invoices/${invoiceId}/payments`, { method: "POST", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<Invoice>(res);
}

export async function deletePayment(id: number) {
  const res = await fetch(`/api/payments/${id}`, { method: "DELETE", headers: headers() });
  return parseApiResponse<Invoice>(res);
}

export async function createInvoiceDocument(invoiceId: number) {
  const res = await fetch(`/api/invoices/${invoiceId}/document`, { method: "POST", headers: headers() });
  return parseApiResponse<{ id: number }>(res);
}

export async function fetchFinanceStats() {
  const res = await fetch("/api/dashboard/finance-stats", { headers: headers() });
  return parseApiResponse<FinanceStats>(res);
}
