import type { ApiError } from "@/types/api";

const BASE_URL = "/api";

const AUTH_PATHS = {
  login: "/auth/login",
  logout: "/auth/logout",
  refresh: "/auth/refresh",
} as const;

let refreshPromise: Promise<boolean> | null = null;

class HttpError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public code?: string,
  ) {
    super(detail);
    this.name = "HttpError";
  }
}

async function requestRaw(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

async function toHttpError(response: Response): Promise<HttpError> {
  let detail = `HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const err: ApiError = await response.json();
    detail = err.detail ?? err.error?.message ?? detail;
    code = err.error?.code;
  } catch {
    // ignore parse errors
  }
  return new HttpError(response.status, detail, code);
}

function canAttemptRefresh(path: string, skipAuthRetry: boolean): boolean {
  if (skipAuthRetry) return false;
  return !Object.values(AUTH_PATHS).some((authPath) => path.startsWith(authPath));
}

async function clearServerSession(): Promise<void> {
  try {
    await requestRaw(AUTH_PATHS.logout, { method: "POST" });
  } catch {
    // ignore cleanup failures
  }
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await requestRaw(AUTH_PATHS.refresh, { method: "POST" });
      return response.ok;
    })();
  }

  try {
    const refreshed = await refreshPromise;
    if (!refreshed) {
      await clearServerSession();
    }
    return refreshed;
  } catch {
    await clearServerSession();
    return false;
  } finally {
    refreshPromise = null;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  skipAuthRetry = false,
): Promise<T> {
  const response = await requestRaw(path, init);

  if (response.status === 401 && canAttemptRefresh(path, skipAuthRetry)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    throw await toHttpError(response);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function download(
  path: string,
  skipAuthRetry = false,
): Promise<{ blob: Blob; filename: string | null }> {
  const response = await requestRaw(path, { method: "GET" });

  if (response.status === 401 && canAttemptRefresh(path, skipAuthRetry)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return download(path, true);
    }
  }

  if (!response.ok) {
    throw await toHttpError(response);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(response.headers.get("Content-Disposition")),
  };
}

function filenameFromDisposition(disposition: string | null): string | null {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  download,
};

export { HttpError };
