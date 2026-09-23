import { env } from "@/config/env";
import { tokenStorage } from "@/services/token-storage";

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

let unauthorizedHandler = null;

// AuthProvider registers this so a 401 anywhere logs the user out.
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

async function request(path, { method = "GET", body, headers, auth = true } = {}) {
  const token = auth ? tokenStorage.get() : null;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    credentials: "include", // allows an httpOnly refresh-token cookie later
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) unauthorizedHandler?.();
    throw new ApiError(data?.message ?? "Request failed", {
      status: response.status,
      data,
    });
  }

  return data;
}

export const httpClient = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
};
