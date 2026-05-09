import { parseApiResponse } from "./api-response";
import type { AppModuleKey } from "./modules";

export type ModuleAccessResponse = {
  officeId?: number;
  enabledModules: AppModuleKey[];
};

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

export async function fetchMyModules(): Promise<ModuleAccessResponse> {
  const response = await fetch("/api/me/modules", { headers: authHeaders() });
  return parseApiResponse<ModuleAccessResponse>(response);
}

export async function fetchOfficeModules(officeId: number): Promise<ModuleAccessResponse> {
  const response = await fetch(`/api/offices/${officeId}/modules`, { headers: authHeaders() });
  return parseApiResponse<ModuleAccessResponse>(response);
}

export async function updateOfficeModules(officeId: number, enabledModules: string[]): Promise<ModuleAccessResponse> {
  const response = await fetch(`/api/offices/${officeId}/modules`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ enabledModules }),
  });
  return parseApiResponse<ModuleAccessResponse>(response);
}
