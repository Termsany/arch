import { parseApiResponse } from "./api-response";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectTask {
  id: number;
  officeId: number;
  projectId: number;
  projectName?: string | null;
  stageId: number | null;
  stageName?: string | null;
  assignedTo: number | null;
  assignedToName?: string | null;
  createdBy: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
  role: string;
  officeId: number | null;
}

export interface TaskInput {
  projectId: number;
  stageId?: number | null;
  assignedTo?: number | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface TaskStats {
  myTasks: number;
  overdueTasks: number;
  thisWeekTasks: number;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  };
}

function query(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function fetchTasks(filters: Record<string, string | number | boolean | null | undefined> = {}) {
  const res = await fetch(`/api/tasks${query(filters)}`, { headers: headers() });
  return parseApiResponse<ProjectTask[]>(res);
}

export async function fetchProjectTasks(projectId: number) {
  const res = await fetch(`/api/projects/${projectId}/tasks`, { headers: headers() });
  return parseApiResponse<ProjectTask[]>(res);
}

export async function fetchTaskAssignees() {
  const res = await fetch("/api/tasks/assignees", { headers: headers() });
  return parseApiResponse<TaskAssignee[]>(res);
}

export async function fetchTaskStats() {
  const res = await fetch("/api/dashboard/task-stats", { headers: headers() });
  return parseApiResponse<TaskStats>(res);
}

export async function createTask(data: TaskInput) {
  const res = await fetch("/api/tasks", { method: "POST", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<ProjectTask>(res);
}

export async function updateTask(id: number, data: Partial<TaskInput>) {
  const res = await fetch(`/api/tasks/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(data) });
  return parseApiResponse<ProjectTask>(res);
}

export async function updateTaskStatus(id: number, status: TaskStatus) {
  const res = await fetch(`/api/tasks/${id}/status`, { method: "PATCH", headers: headers(), body: JSON.stringify({ status }) });
  return parseApiResponse<ProjectTask>(res);
}

export async function deleteTask(id: number) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE", headers: headers() });
  await parseApiResponse(res);
}
