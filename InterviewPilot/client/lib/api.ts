import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  AuthUserDto,
  ChangePasswordInput,
  ForgotPasswordInput,
  HealthResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
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

// Auth API helpers (Phase 1)
export async function registerAccount(
  input: RegisterInput
): Promise<ApiSuccessResponse<{ user: AuthUserDto }>> {
  return apiRequest<{ user: AuthUserDto }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginAccount(
  input: LoginInput
): Promise<ApiSuccessResponse<{ user: AuthUserDto }>> {
  return apiRequest<{ user: AuthUserDto }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logoutAccount(): Promise<
  ApiSuccessResponse<{ loggedOut: boolean }>
> {
  return apiRequest<{ loggedOut: boolean }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function fetchMe(): Promise<ApiSuccessResponse<{ user: AuthUserDto }>> {
  return apiRequest<{ user: AuthUserDto }>('/api/auth/me', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function requestPasswordResetEmail(
  input: ForgotPasswordInput
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function submitPasswordReset(
  input: ResetPasswordInput
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function submitPasswordChange(
  input: ChangePasswordInput
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiRequest<{ message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
