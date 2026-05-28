import { useAuthStore } from '@/store/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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

  if (!res.ok) {
    if (res.status === 401) {
      logout();
      redirectToLogin();
      throw new Error('Session expired. Please sign in again.');
    }
    if (res.status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }
    if (res.status >= 500) {
      throw new Error('Server error — please try again later.');
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    const e = new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
    if (res.status === 409) e.name = 'ConflictError';
    throw e;
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, unknown>) =>
    request<T>('GET', path, { params }),
  post: <T>(path: string, body: unknown) =>
    request<T>('POST', path, { body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
