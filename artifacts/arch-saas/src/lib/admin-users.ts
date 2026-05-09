import { parseApiResponse } from "./api-response";

export type ResetUserPasswordInput = {
  email: string;
  newPassword: string;
  forceChange: boolean;
};

export type ResetUserPasswordResponse = {
  id: number;
  name: string;
  email: string;
  role: string;
  officeId: number | null;
  status: string;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
};

export async function resetUserPassword(input: ResetUserPasswordInput): Promise<ResetUserPasswordResponse> {
  const response = await fetch("/api/admin/users/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify(input),
  });

  return parseApiResponse<ResetUserPasswordResponse>(response);
}

export async function completePasswordChange(newPassword: string): Promise<null> {
  const response = await fetch("/api/auth/complete-password-change", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  return parseApiResponse<null>(response);
}
