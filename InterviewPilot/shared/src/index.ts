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

// Roles & Account Statuses (M1, M2)
export const UserRoleEnum = z.enum(['USER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const UserStatusEnum = z.enum(['ACTIVE', 'BLOCKED', 'DELETING']);
export type UserStatus = z.infer<typeof UserStatusEnum>;

export const UserStatusTypeEnum = z.enum(['STUDENT', 'PROFESSIONAL']);
export type UserStatusType = z.infer<typeof UserStatusTypeEnum>;

export const ExperienceLevelEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'EXPERIENCED']);
export type ExperienceLevel = z.infer<typeof ExperienceLevelEnum>;

export const InterviewCategoryEnum = z.enum(['TECHNICAL', 'HR', 'BEHAVIORAL']);
export type InterviewCategory = z.infer<typeof InterviewCategoryEnum>;

export const QuotaProfileEnum = z.enum(['DEMO', 'FREE_USER']);
export type QuotaProfile = z.infer<typeof QuotaProfileEnum>;

// Permission strings (ARCHITECTURE §6)
export const PermissionEnum = z.enum([
  'profile:read:own',
  'profile:update:own',
  'document:create',
  'document:read:own',
  'document:delete:own',
  'document:read:any',
  'document:delete:any',
  'interview:create',
  'interview:read:own',
  'interview:delete:own',
  'interview:read:any',
  'report:read:own',
  'report:read:any',
  'user:list',
  'user:block',
  'user:delete',
  'usage:read',
  'audit:read',
  'settings:update',
  'quota:update',
  'ai:shutdown',
  'demo:manage',
]);

export type Permission = z.infer<typeof PermissionEnum>;

// Password validation helper (AUTH-1: at least 8 chars, 1 letter, 1 digit)
export const PasswordRuleSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be at most 128 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one digit');

export const EmailRuleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please enter a valid email address')
  .max(255);

// AUTH-1: Register input schema (strict — rejects role, status, isDemo, tokenVersion, or unknown fields)
export const RegisterInputSchema = z
  .object({
    email: EmailRuleSchema,
    password: PasswordRuleSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

// AUTH-3: Login input schema
export const LoginInputSchema = z
  .object({
    email: EmailRuleSchema,
    password: z.string().min(1, 'Password is required').max(128),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginInputSchema>;

// AUTH-6: Forgot password input schema
export const ForgotPasswordInputSchema = z
  .object({
    email: EmailRuleSchema,
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;

// AUTH-6: Reset password input schema
export const ResetPasswordInputSchema = z
  .object({
    token: z.string().trim().min(16, 'Invalid reset token').max(256),
    password: PasswordRuleSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;

// AUTH-5: Change password input schema
export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(128),
    newPassword: PasswordRuleSchema,
    confirmNewPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

export interface AuthUserDto {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  isDemo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  profile: {
    fullName: string | null;
    statusType: UserStatusType | null;
    experienceLevel: ExperienceLevel | null;
    targetRole: string | null;
    careerGoals: string | null;
    preferredCategories: InterviewCategory[];
    onboardingCompletedAt: string | null;
  } | null;
}

// Phase 2 — Onboarding, Profile & Privacy Controls (USR-1..4)
export const OnboardingInputSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .max(100, 'Full name must be at most 100 characters'),
    statusType: UserStatusTypeEnum.nullable().optional(),
    experienceLevel: ExperienceLevelEnum.nullable().optional(),
    targetRole: z.string().trim().max(100).nullable().optional(),
    careerGoals: z.string().trim().max(1000).nullable().optional(),
    preferredCategories: z.array(InterviewCategoryEnum).max(3).optional(),
  })
  .strict();

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const UpdateProfileInputSchema = z
  .object({
    // Optional id/userId fields are accepted only so the server can explicitly ignore them per USR-2 test
    id: z.string().optional(),
    userId: z.string().optional(),
    fullName: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .max(100, 'Full name must be at most 100 characters'),
    statusType: UserStatusTypeEnum.nullable().optional(),
    experienceLevel: ExperienceLevelEnum.nullable().optional(),
    targetRole: z.string().trim().max(100).nullable().optional(),
    careerGoals: z.string().trim().max(1000).nullable().optional(),
    preferredCategories: z.array(InterviewCategoryEnum).max(3).optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const DeleteAccountInputSchema = z
  .object({
    password: z.string().min(1, 'Password is required to delete your account').max(128),
  })
  .strict();

export type DeleteAccountInput = z.infer<typeof DeleteAccountInputSchema>;

export const PrivacyControlEnum = z.enum([
  'DELETE_INTERVIEW',
  'DELETE_DOCUMENT',
  'DELETE_ACCOUNT',
]);
export type PrivacyControl = z.infer<typeof PrivacyControlEnum>;

// Phase 4 — Documents (DOC-1 to DOC-9)
export const DocumentTypeEnum = z.enum(['CV', 'JD']);
export type DocumentType = z.infer<typeof DocumentTypeEnum>;

export const DocumentSourceKindEnum = z.enum(['FILE', 'PASTED']);
export type DocumentSourceKind = z.infer<typeof DocumentSourceKindEnum>;

export const DocumentStatusEnum = z.enum([
  'UPLOADED',
  'PROCESSING',
  'READY',
  'FAILED',
]);
export type DocumentStatus = z.infer<typeof DocumentStatusEnum>;

export const DocumentFailureReasonEnum = z.enum([
  'INVALID_FILE',
  'NO_TEXT',
  'EXTRACTION_FAILED',
  'PROCESSING_FAILED',
]);
export type DocumentFailureReason = z.infer<typeof DocumentFailureReasonEnum>;

export const CvSummarySchema = z.object({
  name: z.string().nullable().optional(),
  education: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()).optional(),
      })
    )
    .default([]),
  workExperience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        duration: z.string().optional(),
        responsibilities: z.array(z.string()).optional(),
      })
    )
    .default([]),
  certifications: z.array(z.string()).default([]),
});
export type CvSummary = z.infer<typeof CvSummarySchema>;

export const JdSummarySchema = z.object({
  title: z.string().nullable().optional(),
  requiredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  experienceRequirements: z.array(z.string()).default([]),
  expectations: z.array(z.string()).default([]),
});
export type JdSummary = z.infer<typeof JdSummarySchema>;

// DOC-1: Pasted JD max 15,000 characters
export const PasteJdInputSchema = z
  .object({
    pastedText: z
      .string()
      .trim()
      .min(10, 'Job description must be at least 10 characters long')
      .max(15000, 'Pasted job description must not exceed 15,000 characters'),
    originalName: z.string().trim().max(100).optional(),
  })
  .strict();

export type PasteJdInput = z.infer<typeof PasteJdInputSchema>;

export interface DocumentResponseDto {
  id: string;
  type: DocumentType;
  sourceKind: DocumentSourceKind;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  failureReason: DocumentFailureReason | null;
  summary: CvSummary | JdSummary | null;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Phase 6 — Interview Setup & Plan Generation (SET-1 to SET-5)
// ==========================================

export const InterviewModeEnum = z.enum(['GENERAL', 'CV_BASED', 'JD_BASED', 'CV_JD']);
export type InterviewMode = z.infer<typeof InterviewModeEnum>;

export const InterviewTypeEnum = z.enum(['TECHNICAL', 'HR', 'BEHAVIORAL']);
export type InterviewType = z.infer<typeof InterviewTypeEnum>;

export const InterviewDifficultyEnum = z.enum(['EASY', 'MEDIUM', 'HARD']);
export type InterviewDifficulty = z.infer<typeof InterviewDifficultyEnum>;

export const InterviewStatusEnum = z.enum([
  'CREATED',
  'IN_PROGRESS',
  'COMPLETED',
  'ENDED_EARLY',
  'TIMED_OUT',
  'FAILED',
]);
export type InterviewStatus = z.infer<typeof InterviewStatusEnum>;

export const InterviewRuntimeStateEnum = z.enum([
  'INITIALIZING',
  'RECRUITER_SPEAKING',
  'WAITING_FOR_CANDIDATE',
  'CANDIDATE_LISTENING',
  'PROCESSING_ANSWER',
  'AI_THINKING',
  'GENERATING_NEXT_QUESTION',
  'GENERATING_FEEDBACK',
  'INTERVIEW_COMPLETED',
  'ERROR',
]);
export type InterviewRuntimeState = z.infer<typeof InterviewRuntimeStateEnum>;

export const InterviewEndReasonEnum = z.enum([
  'USER_ENDED',
  'TIME_LIMIT',
  'QUESTIONS_COMPLETED',
  'ABANDONED',
  'ERROR',
]);
export type InterviewEndReason = z.infer<typeof InterviewEndReasonEnum>;

export const QuestionKindEnum = z.enum(['MAIN', 'FOLLOW_UP', 'CLARIFICATION']);
export type QuestionKind = z.infer<typeof QuestionKindEnum>;

export const InterviewPlanSchema = z.object({
  greeting: z.string().min(5),
  topics: z.array(z.string().min(2)).min(1),
  evaluationCriteria: z.array(z.string().min(2)).min(1),
  firstQuestion: z.string().min(5),
});
export type InterviewPlan = z.infer<typeof InterviewPlanSchema>;

export const CreateInterviewInputSchema = z
  .object({
    mode: InterviewModeEnum,
    role: z
      .string()
      .trim()
      .min(2, 'Role must be at least 2 characters')
      .max(100, 'Role must not exceed 100 characters'),
    experienceLevel: ExperienceLevelEnum,
    type: InterviewTypeEnum,
    difficulty: InterviewDifficultyEnum,
    durationMinutes: z.union([z.literal(15), z.literal(30), z.literal(45)]),
    questionCount: z.number().int().min(3, 'Question count must be at least 3').optional(),
    cvDocumentId: z.string().optional().nullable(),
    jdDocumentId: z.string().optional().nullable(),
  })
  .strict();

export type CreateInterviewInput = z.infer<typeof CreateInterviewInputSchema>;

export interface InterviewConfigurationDto {
  role: string;
  experienceLevel: ExperienceLevel;
  type: InterviewType;
  startDifficulty: InterviewDifficulty;
  durationMinutes: number;
  maxQuestions: number;
  cvDocumentId?: string | null;
  jdDocumentId?: string | null;
}

export interface InterviewQuestionDto {
  id: string;
  orderIndex: number;
  kind: QuestionKind;
  topic: string;
  difficulty: InterviewDifficulty;
  text: string;
}

export interface InterviewResponseDto {
  id: string;
  userId: string;
  mode: InterviewMode;
  status: InterviewStatus;
  runtimeState: InterviewRuntimeState;
  configuration: InterviewConfigurationDto;
  plan: InterviewPlan;
  firstQuestion: InterviewQuestionDto;
  createdAt: string;
}

// Phase 7: LangGraph Interview Engine Types and Schemas (ENG-1 to ENG-10)
export const EngineDecisionEnum = z.enum([
  'FOLLOW_UP_DEEPER',
  'CLARIFY_SIMPLER',
  'NEXT_TOPIC',
  'CLOSE',
]);
export type EngineDecision = z.infer<typeof EngineDecisionEnum>;

export const ListeningModeEnum = z.enum(['ANSWER', 'QUESTION']);
export type ListeningMode = z.infer<typeof ListeningModeEnum>;

export const CriterionScoreSchema = z.object({
  criterion: z.string(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
});
export type CriterionScore = z.infer<typeof CriterionScoreSchema>;

export const AnswerEvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  criterionScores: z.array(CriterionScoreSchema),
  summaryFeedback: z.string(),
  isEmpty: z.boolean().default(false),
});
export type AnswerEvaluation = z.infer<typeof AnswerEvaluationSchema>;

export const SubmitAnswerInputSchema = z
  .object({
    transcript: z.string().default(''),
    isEmpty: z.boolean().default(false),
    durationSeconds: z.number().min(0).optional(),
  })
  .strict();
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerInputSchema>;

export const SubmitInquiryInputSchema = z
  .object({
    inquiry: z
      .string()
      .trim()
      .min(1, 'Inquiry text cannot be empty')
      .max(1000, 'Inquiry cannot exceed 1000 characters'),
  })
  .strict();
export type SubmitInquiryInput = z.infer<typeof SubmitInquiryInputSchema>;

export interface InterviewStateDto {
  id: string;
  status: InterviewStatus;
  runtimeState: InterviewRuntimeState;
  listeningMode: ListeningMode;
  elapsedSeconds: number;
  remainingSeconds: number;
  currentQuestion: InterviewQuestionDto | null;
  questionsAsked: number;
  maxQuestions: number;
  inquiriesCount: number;
  maxInquiries: number;
  topicsCovered: string[];
  currentDifficulty: InterviewDifficulty;
  recruiterUtterance: string | null;
  isTerminal: boolean;
}

export const TranscribeAudioResponseSchema = z.object({
  transcript: z.string(),
  isEmpty: z.boolean(),
  durationSeconds: z.number().min(0),
});
export type TranscribeAudioResponse = z.infer<typeof TranscribeAudioResponseSchema>;

export const SynthesizeSpeechInputSchema = z.object({
  text: z.string().min(1, 'Speech text is required').max(2000, 'Speech text too long'),
  voice: z.enum(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']).default('Puck'),
});
export type SynthesizeSpeechInput = z.infer<typeof SynthesizeSpeechInputSchema>;

export const SynthesizeSpeechResponseSchema = z.object({
  audioBase64: z.string(),
  mimeType: z.string(),
  caption: z.string(),
});
export type SynthesizeSpeechResponse = z.infer<typeof SynthesizeSpeechResponseSchema>;

export * from './voiceMath.js';
export * from './roomRules.js';
export * from './evaluationMath.js';



