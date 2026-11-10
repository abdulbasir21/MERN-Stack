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

// Phase 2 — Users, Onboarding, Profile & Privacy Controls
import type {
  DeleteAccountInput,
  OnboardingInput,
  PrivacyControl,
  UpdateProfileInput,
} from '@interviewpilot/shared';

export async function completeOnboarding(
  input: OnboardingInput
): Promise<ApiSuccessResponse<{ user: AuthUserDto }>> {
  return apiRequest<{ user: AuthUserDto }>('/api/users/me/onboarding', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function skipOnboarding(): Promise<
  ApiSuccessResponse<{ user: AuthUserDto }>
> {
  return apiRequest<{ user: AuthUserDto }>('/api/users/me/onboarding/skip', {
    method: 'POST',
  });
}

export async function fetchMyProfile(): Promise<
  ApiSuccessResponse<{ user: AuthUserDto }>
> {
  return apiRequest<{ user: AuthUserDto }>('/api/users/me/profile', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function updateMyProfile(
  input: UpdateProfileInput
): Promise<ApiSuccessResponse<{ user: AuthUserDto }>> {
  return apiRequest<{ user: AuthUserDto }>('/api/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function fetchPrivacyControls(): Promise<
  ApiSuccessResponse<{ controls: PrivacyControl[] }>
> {
  return apiRequest<{ controls: PrivacyControl[] }>(
    '/api/users/me/privacy-controls',
    {
      method: 'GET',
      cache: 'no-store',
    }
  );
}

export async function deleteMyAccount(
  input: DeleteAccountInput
): Promise<ApiSuccessResponse<{ deleted: boolean }>> {
  return apiRequest<{ deleted: boolean }>('/api/users/me/delete-account', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// Phase 4 — Documents
import type {
  DocumentResponseDto,
  DocumentType,
  PasteJdInput,
} from '@interviewpilot/shared';

export async function uploadDocument(
  file: File,
  type: DocumentType
): Promise<ApiSuccessResponse<{ document: DocumentResponseDto }>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  return apiRequest<{ document: DocumentResponseDto }>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function pasteJdDocument(
  input: PasteJdInput
): Promise<ApiSuccessResponse<{ document: DocumentResponseDto }>> {
  return apiRequest<{ document: DocumentResponseDto }>('/api/documents/paste-jd', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchDocuments(
  type?: DocumentType
): Promise<ApiSuccessResponse<{ documents: DocumentResponseDto[] }>> {
  const query = type ? `?type=${type}` : '';
  return apiRequest<{ documents: DocumentResponseDto[] }>(`/api/documents${query}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchDocumentById(
  id: string
): Promise<ApiSuccessResponse<{ document: DocumentResponseDto }>> {
  return apiRequest<{ document: DocumentResponseDto }>(`/api/documents/${id}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function deleteDocument(
  id: string
): Promise<ApiSuccessResponse<{ deleted: boolean }>> {
  return apiRequest<{ deleted: boolean }>(`/api/documents/${id}`, {
    method: 'DELETE',
  });
}
