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

// Phase 6 — Interviews
import type {
  CreateInterviewInput,
  InterviewResponseDto,
} from '@interviewpilot/shared';

export async function createInterviewApi(
  input: CreateInterviewInput
): Promise<ApiSuccessResponse<{ interview: InterviewResponseDto }>> {
  return apiRequest<{ interview: InterviewResponseDto }>('/api/interviews', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchInterviewById(
  id: string
): Promise<ApiSuccessResponse<{ interview: InterviewResponseDto }>> {
  return apiRequest<{ interview: InterviewResponseDto }>(`/api/interviews/${id}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchInterviews(): Promise<
  ApiSuccessResponse<{
    interviews: Array<{
      id: string;
      mode: string;
      status: string;
      runtimeState: string;
      role: string;
      type: string;
      durationMinutes: number;
      maxQuestions: number;
      createdAt: string;
    }>;
  }>
> {
  return apiRequest('/api/interviews', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchQuotaMe(): Promise<
  ApiSuccessResponse<{
    effectiveQuota: {
      interviewsPerDay: number;
      maxDurationMinutes: number;
      maxQuestionsPerInterview: number;
      maxInquiriesPerInterview: number;
      documentAnalysesPerDay: number;
    };
    usageToday: {
      interviewsCreated: number;
      documentAnalyses: number;
    };
  }>
> {
  return apiRequest('/api/quota/me', {
    method: 'GET',
    cache: 'no-store',
  });
}

// Phase 7: Interview Engine API Methods (ENG-1 to ENG-10)
import type {
  InterviewStateDto,
  SubmitAnswerInput,
  SubmitInquiryInput,
  AnswerEvaluation,
  EngineDecision,
} from '@interviewpilot/shared';

export async function startInterviewApi(
  interviewId: string,
  clientRequestId?: string
): Promise<ApiSuccessResponse<{ state: InterviewStateDto }>> {
  const headers: Record<string, string> = {};
  if (clientRequestId) {
    headers['client-request-id'] = clientRequestId;
  }
  return apiRequest<{ state: InterviewStateDto }>(`/api/interviews/${interviewId}/start`, {
    method: 'POST',
    headers,
  });
}

export async function fetchInterviewStateApi(
  interviewId: string
): Promise<ApiSuccessResponse<{ state: InterviewStateDto }>> {
  return apiRequest<{ state: InterviewStateDto }>(`/api/interviews/${interviewId}/state`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function submitAnswerApi(
  interviewId: string,
  input: SubmitAnswerInput,
  clientRequestId?: string
): Promise<
  ApiSuccessResponse<{
    state: InterviewStateDto;
    evaluation: AnswerEvaluation;
    decision: EngineDecision;
    nextQuestionText: string | null;
  }>
> {
  const headers: Record<string, string> = {};
  if (clientRequestId) {
    headers['client-request-id'] = clientRequestId;
  }
  return apiRequest<{
    state: InterviewStateDto;
    evaluation: AnswerEvaluation;
    decision: EngineDecision;
    nextQuestionText: string | null;
  }>(`/api/interviews/${interviewId}/answer`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function submitInquiryApi(
  interviewId: string,
  input: SubmitInquiryInput,
  clientRequestId?: string
): Promise<
  ApiSuccessResponse<{
    state: InterviewStateDto;
    reply: string;
  }>
> {
  const headers: Record<string, string> = {};
  if (clientRequestId) {
    headers['client-request-id'] = clientRequestId;
  }
  return apiRequest<{
    state: InterviewStateDto;
    reply: string;
  }>(`/api/interviews/${interviewId}/inquiry`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function endInterviewApi(
  interviewId: string
): Promise<ApiSuccessResponse<{ state: InterviewStateDto }>> {
  return apiRequest<{ state: InterviewStateDto }>(`/api/interviews/${interviewId}/end`, {
    method: 'POST',
  });
}

export async function retryInterviewApi(
  interviewId: string
): Promise<ApiSuccessResponse<{ state: InterviewStateDto }>> {
  return apiRequest<{ state: InterviewStateDto }>(`/api/interviews/${interviewId}/retry`, {
    method: 'POST',
  });
}

// Phase 8 — Voice and Avatar
import type {
  TranscribeAudioResponse,
  SynthesizeSpeechResponse,
  SynthesizeSpeechInput,
} from '@interviewpilot/shared';

export async function transcribeAudioApi(params: {
  audioBlob: Blob;
  durationSeconds: number;
  interviewId?: string;
  isSilenceOnly?: boolean;
}): Promise<ApiSuccessResponse<TranscribeAudioResponse>> {
  const formData = new FormData();
  formData.append('audio', params.audioBlob, 'answer.webm');
  formData.append('durationSeconds', params.durationSeconds.toString());
  if (params.interviewId) {
    formData.append('interviewId', params.interviewId);
  }
  if (params.isSilenceOnly) {
    formData.append('isSilenceOnly', 'true');
  }

  return apiRequest<TranscribeAudioResponse>('/api/voice/transcribe', {
    method: 'POST',
    body: formData,
  });
}

export async function synthesizeSpeechApi(
  input: SynthesizeSpeechInput & { interviewId?: string }
): Promise<ApiSuccessResponse<SynthesizeSpeechResponse>> {
  return apiRequest<SynthesizeSpeechResponse>('/api/voice/synthesize', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}



// Phase 10 — Evaluation, Reports, History
export interface InterviewReportDto {
  interview: {
    id: string;
    mode: string;
    status: string;
    role: string;
    type: string;
    experienceLevel: string;
    startedAt: string | null;
    endedAt: string | null;
    endReason: string | null;
  };
  metrics: {
    overallScore: number | null;
    durationSeconds: number;
    totalQuestions: number;
    evaluatedAnswersCount: number;
    skillBreakdown: Record<string, { meanScore: number; count: number }>;
    starCoverage: {
      situationShare: number;
      taskShare: number;
      actionShare: number;
      resultShare: number;
      totalBehavioralAnswers: number;
    } | null;
  };
  report: {
    id: string;
    status: 'PENDING' | 'READY' | 'FAILED';
    summary: string | null;
    strengths: string[] | null;
    weaknesses: string[] | null;
    recommendations: string[] | null;
    studyTopics: string[] | null;
    generatedAt: string | null;
  } | null;
  questions: Array<{
    id: string;
    orderIndex: number;
    topic: string;
    kind: string;
    difficulty: string;
    questionText: string;
    candidateAnswer: {
      id: string;
      transcript: string;
      isEmpty: boolean;
      durationSeconds: number | null;
      score: number;
      evaluation: {
        id: string;
        criteriaScores: Array<{ criterion: string; score: number; feedback?: string }>;
        starParts?: { situation: boolean; task: boolean; action: boolean; result: boolean } | null;
        correct?: string | null;
        missing?: string | null;
        strengths?: string[] | null;
        weaknesses?: string[] | null;
        improvements?: string[] | null;
        idealAnswer?: string | null;
        followUpRecommendation?: string | null;
        reasoning?: string | null;
      } | null;
    } | null;
  }>;
}

export interface HistoryListDto {
  items: Array<{
    id: string;
    role: string;
    type: string;
    createdAt: string;
    overallScore: number | null;
    durationSeconds: number;
    status: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchInterviewReportApi(
  interviewId: string
): Promise<ApiSuccessResponse<InterviewReportDto>> {
  return apiRequest<InterviewReportDto>(`/api/interviews/${interviewId}/report`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function generateInterviewReportApi(
  interviewId: string
): Promise<ApiSuccessResponse<{ report: any }>> {
  return apiRequest<{ report: any }>(`/api/interviews/${interviewId}/report/generate`, {
    method: 'POST',
  });
}

export async function fetchInterviewHistoryApi(params: {
  role?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ApiSuccessResponse<HistoryListDto>> {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.type) query.set('type', params.type);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());

  const qStr = query.toString();
  return apiRequest<HistoryListDto>(`/api/interviews/history${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchInterviewProgressApi(): Promise<
  ApiSuccessResponse<{
    progress: Array<{ id: string; date: string; role: string; type: string; overallScore: number | null }>;
  }>
> {
  return apiRequest<{
    progress: Array<{ id: string; date: string; role: string; type: string; overallScore: number | null }>;
  }>('/api/interviews/progress', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function compareInterviewsApi(
  interviewAId: string,
  interviewBId: string
): Promise<
  ApiSuccessResponse<{
    interviewA: any;
    interviewB: any;
    comparison: Record<string, { scoreA: number | null; scoreB: number | null; diff: number | null }>;
  }>
> {
  return apiRequest<{
    interviewA: any;
    interviewB: any;
    comparison: Record<string, { scoreA: number | null; scoreB: number | null; diff: number | null }>;
  }>(`/api/interviews/compare?interviewAId=${interviewAId}&interviewBId=${interviewBId}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export interface UserDashboardData {
  isDemo: boolean;
  statistics: {
    totalInterviews: number;
    completedInterviews: number;
    averageScore: number | null;
    recentTrend: number[];
  };
  recentInterviews: Array<{
    id: string;
    role: string;
    type: string;
    date: string;
    durationSeconds: number;
    overallScore: number | null;
    status: string;
    hasReport: boolean;
  }>;
  recommendations: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    studyTopics: string[];
  } | null;
}

export async function fetchUserDashboardApi(): Promise<ApiSuccessResponse<UserDashboardData>> {
  return apiRequest<UserDashboardData>('/api/users/dashboard', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function createDemoSessionApi(): Promise<
  ApiSuccessResponse<{ user: AuthUserDto; expiresAt: string; limits: { maxInterviews: number; maxMinutes: number; maxQuestions: number } }>
> {
  return apiRequest<{
    user: AuthUserDto;
    expiresAt: string;
    limits: { maxInterviews: number; maxMinutes: number; maxQuestions: number };
  }>('/api/demo/session', {
    method: 'POST',
  });
}

export async function fetchDemoSamplesApi(): Promise<
  ApiSuccessResponse<{
    sampleInterview: any;
    sampleReport: any;
  }>
> {
  return apiRequest<{
    sampleInterview: any;
    sampleReport: any;
  }>('/api/demo/samples', {
    method: 'GET',
    cache: 'no-store',
  });
}

// ==================== ADMIN API CLIENT (ADM-1..10) ====================

export interface AdminOverviewData {
  totalRegisteredUsers: number;
  activeUsers7d: number;
  activeDemoSessions: number;
  interviews: {
    realTotal: number;
    realToday: number;
    demoTotal: number;
    demoToday: number;
  };
  uploadedDocumentsTotal: number;
  budget: {
    period: string;
    totalBudgetUsd: string;
    usedUsd: string;
    reservedUsd: string;
    remainingUsd: string;
    aiEnabled: boolean;
  };
}

export async function fetchAdminOverviewApi(): Promise<ApiSuccessResponse<AdminOverviewData>> {
  return apiRequest<AdminOverviewData>('/api/admin/overview', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchAdminUsersApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  role?: string;
  isDemo?: boolean;
} = {}): Promise<ApiSuccessResponse<any>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.role) query.set('role', params.role);
  if (params.isDemo !== undefined) query.set('isDemo', String(params.isDemo));

  const qStr = query.toString();
  return apiRequest<any>(`/api/admin/users${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function updateAdminUserStatusApi(
  userId: string,
  block: boolean
): Promise<ApiSuccessResponse<{ id: string; status: string }>> {
  return apiRequest<{ id: string; status: string }>(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ block }),
  });
}

export async function deleteAdminUserApi(userId: string): Promise<ApiSuccessResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminDocumentsApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
} = {}): Promise<ApiSuccessResponse<any>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params.search) query.set('search', params.search);
  if (params.type) query.set('type', params.type);

  const qStr = query.toString();
  return apiRequest<any>(`/api/admin/documents${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function deleteAdminDocumentApi(documentId: string): Promise<ApiSuccessResponse<{ success: boolean }>> {
  return apiRequest<{ success: boolean }>(`/api/admin/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminInterviewsApi(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
} = {}): Promise<ApiSuccessResponse<any>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);

  const qStr = query.toString();
  return apiRequest<any>(`/api/admin/interviews${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchAdminInterviewAuditApi(interviewId: string): Promise<ApiSuccessResponse<any>> {
  return apiRequest<any>(`/api/admin/interviews/${interviewId}/audit`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchAdminUsageApi(): Promise<ApiSuccessResponse<any>> {
  return apiRequest<any>('/api/admin/usage', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function fetchAdminSettingsApi(): Promise<ApiSuccessResponse<{ settings: Record<string, any> }>> {
  return apiRequest<{ settings: Record<string, any> }>('/api/admin/settings', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function updateAdminSettingsApi(
  updates: Record<string, any>
): Promise<ApiSuccessResponse<{ success: boolean; changes: any }>> {
  return apiRequest<{ success: boolean; changes: any }>('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function triggerEmergencyShutdownApi(): Promise<
  ApiSuccessResponse<{ aiEnabled: boolean; status: string }>
> {
  return apiRequest<{ aiEnabled: boolean; status: string }>('/api/admin/settings/emergency-shutdown', {
    method: 'POST',
  });
}

export async function fetchAdminAuditLogsApi(params: {
  page?: number;
  pageSize?: number;
  action?: string;
  targetType?: string;
} = {}): Promise<ApiSuccessResponse<any>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page.toString());
  if (params.pageSize) query.set('pageSize', params.pageSize.toString());
  if (params.action) query.set('action', params.action);
  if (params.targetType) query.set('targetType', params.targetType);

  const qStr = query.toString();
  return apiRequest<any>(`/api/admin/audit-logs${qStr ? `?${qStr}` : ''}`, {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function resetAdminDemoDataApi(): Promise<
  ApiSuccessResponse<{ success: boolean; deletedDemoUsersCount: number }>
> {
  return apiRequest<{ success: boolean; deletedDemoUsersCount: number }>('/api/admin/demo/reset', {
    method: 'POST',
  });
}
