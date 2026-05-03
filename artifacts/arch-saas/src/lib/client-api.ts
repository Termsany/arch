import { getApiMessage, unwrapApiResponse } from "@/lib/api-response";

const API_BASE = "/api";

function getClientToken(): string {
  return localStorage.getItem("clientToken") || "";
}

async function clientFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getClientToken()}`,
      ...(options?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("api:client-unauthorized"));
    }
    throw new Error(getApiMessage(data, res.statusText));
  }
  return unwrapApiResponse<T>(data);
}

export async function clientLogin(email: string, password: string): Promise<{ token: string; user: { id: number; name: string; email: string; role: string; clientId: number | null } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(getApiMessage(data, "خطأ في تسجيل الدخول"));
  return unwrapApiResponse(data);
}

export interface ClientProject {
  id: number;
  projectName: string;
  designType: string;
  projectStatus: string;
  startDate?: string | null;
  areaMeters?: string | null;
  createdAt?: string;
}

export interface ClientStage {
  id: number;
  projectId: number;
  stageOrder: number;
  stageName: string;
  status: string;
  updatedAt?: string;
  approvalId?: number | null;
  approvalStatus?: string | null;
  approvalComment?: string | null;
  approvedAt?: string | null;
}

export interface ClientFeedbackItem {
  id: number;
  projectId: number;
  stageId?: number | null;
  stageName?: string | null;
  feedbackText: string;
  feedbackType: string;
  createdAt?: string;
}

export async function getClientProjects(): Promise<ClientProject[]> {
  return clientFetch<ClientProject[]>("/client-portal/projects");
}

export async function getClientProject(id: number): Promise<ClientProject> {
  return clientFetch<ClientProject>(`/client-portal/projects/${id}`);
}

export async function getClientProjectStages(id: number): Promise<ClientStage[]> {
  return clientFetch<ClientStage[]>(`/client-portal/projects/${id}/stages`);
}

export async function getClientProjectFeedback(id: number): Promise<ClientFeedbackItem[]> {
  return clientFetch<ClientFeedbackItem[]>(`/client-portal/projects/${id}/feedback`);
}

export async function approveStage(stageId: number, comment?: string): Promise<unknown> {
  return clientFetch(`/client-portal/stages/${stageId}/approve`, {
    method: "POST",
    body: JSON.stringify({ comment: comment || "" }),
  });
}

export async function requestRevision(stageId: number, comment: string): Promise<unknown> {
  return clientFetch(`/client-portal/stages/${stageId}/request-revision`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}

export interface ClientFile {
  id: number;
  projectId: number;
  stageId?: number | null;
  stageName?: string | null;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl?: string | null;
  storageProvider?: string | null;
  fileType: string;
  fileSize: number;
  versionNumber: number;
  fileCategory: string;
  notes?: string | null;
  isApprovedVersion: boolean;
  createdAt?: string;
}

export async function getClientProjectFiles(projectId: number): Promise<ClientFile[]> {
  return clientFetch<ClientFile[]>(`/client-portal/projects/${projectId}/files`);
}
