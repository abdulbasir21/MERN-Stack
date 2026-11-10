import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  HealthResponse,
} from '@interviewpilot/shared';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiSuccessResponse<T>> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'InterviewPilot');
  }
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path.startsWith('/api') ? path : `/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errPayload = payload as ApiErrorResponse | null;
    throw new ApiClientError(
      errPayload?.error?.code || 'INTERNAL_ERROR',
      errPayload?.error?.message || 'Unable to complete the request.',
      response.status,
      errPayload?.error?.details
    );
  }

  return payload as ApiSuccessResponse<T>;
}

export async function fetchHealth(): Promise<ApiSuccessResponse<HealthResponse>> {
  return apiRequest<HealthResponse>('/api/health', {
    method: 'GET',
    cache: 'no-store',
  });
}
