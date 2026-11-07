export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ApiErrorDetail[];
  public readonly isServerWaking: boolean;

  constructor(statusCode: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isServerWaking = statusCode === 504 || statusCode === 502 || code === 'SERVER_WAKING';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('quotepilot_token');
};

export const setAuthToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('quotepilot_token', token);
  } else {
    localStorage.removeItem('quotepilot_token');
  }
};

interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retryOnce?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 15000, retryOnce = true, headers = {}, ...rest } = options;
  const token = getAuthToken();

  // Normalize endpoint: strip duplicate /api/v1 if caller provided it, since API_BASE_URL includes it
  const cleanEndpoint = endpoint.replace(/^\/?api\/v1/, '');
  const normalizedEndpoint = cleanEndpoint.startsWith('/') ? cleanEndpoint : `/${cleanEndpoint}`;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${normalizedEndpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 401 Unauthorized handling
    if (res.status === 401 && typeof window !== 'undefined') {
      setAuthToken(null);
      const isLoggingOut = Boolean((window as any).__isLoggingOut);
      if (
        !isLoggingOut &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register') &&
        window.location.pathname !== '/'
      ) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const err = data?.error;
      throw new ApiError(
        res.status,
        err?.code || 'HTTP_ERROR',
        err?.message || `Request failed with status ${res.status}`,
        err?.details
      );
    }

    return data as ApiResponse<T>;
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      // Possible cold start on Render free tier
      throw new ApiError(
        504,
        'SERVER_WAKING',
        'The server is taking longer than usual to respond. It may be waking up from sleep.'
      );
    }

    if (retryOnce && !err.statusCode) {
      console.warn(`[API Client] Retrying ${endpoint} after transient network failure...`);
      return apiClient<T>(endpoint, { ...options, retryOnce: false, timeoutMs: timeoutMs * 1.5 });
    }

    if (err instanceof ApiError) {
      throw err;
    }

    throw new ApiError(0, 'NETWORK_ERROR', err.message || 'Unable to connect to the server.');
  }
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
