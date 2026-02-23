export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001/api/v1";

type ApiOptions = RequestInit & { token?: string };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login" && typeof window !== "undefined") {
      // Clear token and redirect on unauthorized
      const { clearToken } = await import("./auth");
      clearToken();
      window.location.href = "/auth/login";
      return {} as T; // Return empty object to satisfy type, though redirect will happen
    }
    const message = formatApiError(data?.detail, response.statusText);
    throw new Error(message);
  }

  return data as T;
}

export const fetcher = <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("rag_user_token") : null;
  return apiRequest<T>(url, { ...options, token: token ?? undefined });
};

function formatApiError(detail: unknown, fallback: string): string {
  if (typeof detail === "string") {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return String(item);
        }
        const record = item as { loc?: Array<string | number>; msg?: string };
        const loc = record.loc?.slice(1).join(".") || "request";
        const msg = record.msg || "Invalid value";
        return `${loc}: ${msg}`;
      })
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("; ");
    }
  }
  if (detail && typeof detail === "object") {
    const record = detail as { message?: string; detail?: string };
    if (record.message) {
      return record.message;
    }
    if (record.detail) {
      return record.detail;
    }
  }
  return fallback || "Request failed";
}
