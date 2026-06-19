import { useAuthStore } from '@/store/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Preserves backend error metadata (code, statusCode) that a plain Error
// would otherwise drop. Still satisfies `instanceof Error` everywhere.
export class ApiError extends Error {
  code?: string;
  statusCode?: number;

  constructor(message: string, options?: { code?: string; statusCode?: number }) {
    super(message);
    this.name = 'ApiError';
    this.code = options?.code;
    this.statusCode = options?.statusCode;
  }
}

interface BackendErrorBody {
  message?: string | string[];
  code?: string;
  statusCode?: number;
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, String(v)));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function isTokenExpired(token: string): boolean {
  try {
    // JWT payload is base64url-encoded — normalise to standard base64 before decoding.
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64)) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true; // unparseable token → treat as expired
  }
}

function localeFromPath(): string {
  if (typeof window === 'undefined') return 'ar';
  const firstSegment = window.location.pathname.split('/')[1] ?? '';
  return ['ar', 'en'].includes(firstSegment) ? firstSegment : 'ar';
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = `/${localeFromPath()}/login`;
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: { params?: Record<string, unknown>; body?: unknown },
): Promise<T> {
  const { token, logout } = useAuthStore.getState();

  if (token && isTokenExpired(token)) {
    logout();
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  const url = buildUrl(path, options?.params);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch {
    throw new Error('Network error — check your connection and try again.');
  }

  // 304 Not Modified is a successful conditional-GET outcome, not an error —
  // Response.ok is false for it (outside the 200-299 range), so it must be
  // excluded here or every cached/revalidated response would be thrown as
  // an HTTP error. It carries no body, same as 204, handled below.
  if (!res.ok && res.status !== 304) {
    if (res.status === 401 && path !== '/v1/auth/login') {
      logout();
      redirectToLogin();
      throw new Error('Session expired. Please sign in again.');
    }
    if (res.status === 403) {
      const errBody = await res.json().catch(() => null) as BackendErrorBody | null;
      const msg = Array.isArray(errBody?.message)
        ? errBody.message.join(', ')
        : errBody?.message;
      throw new ApiError(msg ?? 'You do not have permission to perform this action.', {
        code: errBody?.code,
        statusCode: errBody?.statusCode,
      });
    }
    if (res.status >= 500) {
      throw new Error('Server error — please try again later.');
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const e = new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
    if (res.status === 409) e.name = 'ConflictError';
    throw e;
  }

  if (res.status === 204 || res.status === 304) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

async function requestBlob(
  path: string,
  params?: Record<string, unknown>,
): Promise<Blob> {
  const { token, logout } = useAuthStore.getState();

  if (token && isTokenExpired(token)) {
    logout();
    redirectToLogin();
    throw new Error('Session expired. Please sign in again.');
  }

  const url = buildUrl(path, params);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error('Network error — check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/v1/auth/login') {
      logout();
      redirectToLogin();
      throw new Error('Session expired. Please sign in again.');
    }
    if (res.status === 403) {
      const errBody = await res.json().catch(() => null) as BackendErrorBody | null;
      const msg = Array.isArray(errBody?.message) ? errBody.message.join(', ') : errBody?.message;
      throw new ApiError(msg ?? 'You do not have permission to perform this action.', {
        code: errBody?.code,
        statusCode: errBody?.statusCode,
      });
    }
    if (res.status >= 500) throw new Error('Server error — please try again later.');
    throw new Error(`HTTP ${res.status}`);
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>('GET', path, { params }),
  post: <T>(path: string, body: unknown) =>
    request<T>('POST', path, { body }),
  put: <T>(path: string, body: unknown) =>
    request<T>('PUT', path, { body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
  blob: (path: string, params?: Record<string, unknown>) =>
    requestBlob(path, params),
};
