const API_BASE_URL = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, { shopId, ...options } = {}) {
  const headers = new Headers(options.headers);
  const method = (options.method || "GET").toUpperCase();

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRF-Protection", "1");
  }

  if (shopId) {
    headers.set("X-Shop-ID", shopId);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return null;
  }

  const result = await response.json();

  if (!response.ok) {
    throw new ApiError(
      result.detail || "The request could not be completed.",
      response.status,
    );
  }

  return result;
}
