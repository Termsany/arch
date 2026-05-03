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
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function clientLogin(email: string, password: string): Promise<{ token: string; user: { id: number; name: string; email: string; role: string; clientId: number | null } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "خطأ في تسجيل الدخول");
  return data;
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
