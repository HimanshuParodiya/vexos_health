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

async function request(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const token = auth ? tokenStorage.get() : null;

  let requestBody = body;
  const requestHeaders = { ...headers };

  if (body instanceof URLSearchParams) {
    requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
    requestBody = body.toString();
  } else if (body instanceof FormData) {
    // browser sets multipart boundary automatically
    delete requestHeaders["Content-Type"];
  } else if (body !== undefined && typeof body === "object" && !(body instanceof String)) {
    if (!requestHeaders["Content-Type"]) {
      requestHeaders["Content-Type"] = "application/json";
    }
    if (requestHeaders["Content-Type"].includes("application/json")) {
      requestBody = JSON.stringify(body);
    }
  }

  if (token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const url = `${env.apiBaseUrl}${path}`;
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers: requestHeaders,
    body: requestBody,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) unauthorizedHandler?.();

    let errorMessage = "Request failed";
    if (typeof data?.detail === "string") {
      errorMessage = data.detail;
    } else if (Array.isArray(data?.detail)) {
      errorMessage = data.detail.map((e) => e.msg || e.message).join(", ");
    } else if (data?.message) {
      errorMessage = data.message;
    } else if (data?.error) {
      errorMessage = data.error;
    }

    throw new ApiError(errorMessage, {
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
