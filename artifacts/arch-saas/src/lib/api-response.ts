export function unwrapApiResponse<T>(data: unknown): T {
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    typeof (data as { success?: unknown }).success === "boolean"
  ) {
    return ((data as { data?: unknown }).data ?? null) as T;
  }

  return data as T;
}

export function getApiMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const body = data as { message?: unknown; error?: unknown };
    if (typeof body.message === "string") return body.message;
    if (typeof body.error === "string") return body.error;
  }

  return fallback;
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("api:unauthorized"));
    }
    throw new Error(getApiMessage(data, response.statusText));
  }

  return unwrapApiResponse<T>(data);
}
