import { z } from 'zod';

export const ErrorCodeEnum = z.enum([
  'UNAUTHENTICATED',
  'ACCOUNT_BLOCKED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  'USER_QUOTA_EXCEEDED',
  'EXCEEDS_QUOTA_LIMIT',
  'GLOBAL_BUDGET_EXHAUSTED',
  'AI_DISABLED',
  'AI_UNAVAILABLE',
  'DEMO_DISABLED',
  'DEMO_LIVE_DISABLED',
  'DEMO_RESTRICTED',
  'INTERVIEW_ALREADY_ACTIVE',
  'INQUIRY_LIMIT_REACHED',
  'DOCUMENT_NOT_READY',
  'INVALID_FILE',
  'TRANSCRIPTION_FAILED',
  'TTS_FAILED',
  'INVALID_STATE_TRANSITION',
  'CONFLICT',
  'CORS_NOT_ALLOWED',
  'CSRF_INVALID',
  'INTERNAL_ERROR',
]);

export type ErrorCode = z.infer<typeof ErrorCodeEnum>;

export interface ApiMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  requestId?: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorPayload {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
}

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('interviewpilot-api'),
  timestamp: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
