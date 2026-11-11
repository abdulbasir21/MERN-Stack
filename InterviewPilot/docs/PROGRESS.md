# InterviewPilot — Autonomous Build Progress Log

## Official Documentation Checked

- **Google Gemini API (`@google/genai` >= 2.29.1)**:
  - Checked via Gemini Docs MCP (`2026-11-10`):
    - `gemini-api-guides/pricing.md` (Free Tier model pricing)
    - `gemini-api-guides/models/gemini-3.5-flash-lite.md` (`gemini-3.5-flash-lite`)
    - `gemini-api-guides/models/gemini-3.5-transcribe.md` (`gemini-3.5-transcribe`)
    - `gemini-api-guides/models/gemini-3.8-flash-lite-tts.md` & `gemini-api-guides/speech-generation.md` (`gemini-3.8-flash-lite-tts`, voice `Kore`, WAV `audio/wav` unary output)
    - `gemini-api-guides/models/gemini-embedding-001.md` (`gemini-embedding-001`, 768 dimensions)
- **Prisma ORM v6 (`^6.5.0`) + Neon pgvector**:
  - Checked via Context7 (`/websites/prisma_io/v6`, `2026-11-10`):
    - `https://www.prisma.io/docs/orm/v6/prisma-schema/postgresql-extensions` (`CREATE EXTENSION IF NOT EXISTS "vector";` in migration SQL, `Unsupported("vector(768)")` column type, `$queryRaw` for cosine distance `<=>`).
- **Next.js 15 (`^15.2.1`)**:
  - Checked via Context7 (`/vercel/next.js`, `2026-11-10`):
    - `docs/01-app/03-api-reference/05-config/01-next-config-js/rewrites.mdx` (`/api/:path*` rewrite proxy for first-party `SameSite=Lax` httpOnly cookies).

## Open Decisions Recorded

- **D-1 (Email Provider)**: Configured via owner's `server/.env` SMTP variables (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`) using Nodemailer adapter (mocked in automated tests).
- **D-2 (RAG Corpus)**: DEFAULT — Candidate's own CV/JD only (no curated question bank).
- **D-3 (Document-Analysis Counter)**: DEFAULT — Shared counter between CV and JD (`documentAnalyses`).
- **D-4 (Inquiry Scope)**: DEFAULT — Any topic, short answers (`<= 600` characters), never revealing the ideal answer to the pending question.
- **D-5 (Empty Answers in Averages)**: DEFAULT — Empty answers receive `0` on every criterion, make no AI call, and count as `0` in averages.
- **D-6 (Sample-CV Mode in Demo)**: DEFAULT — Not built; demo live interviews are `GENERAL` mode only.
- **D-7 (Folder Names)**: DEFAULT — `client/`, `server/`, `shared/`.

## Dependencies Installed (from `docs/ARCHITECTURE.md` §13)

- Root dev tooling: `typescript@^5.8.2`, `eslint@^9.21.0`, `@eslint/js@^9.21.0`, `typescript-eslint@^8.25.0`, `prettier@^3.5.2`
- Shared (`@interviewpilot/shared`): `zod@^3.24.2`
- Server (`@interviewpilot/server`): `express@^4.21.2`, `cors@^2.8.5`, `helmet@^8.0.0`, `cookie-parser@^1.4.7`, `express-rate-limit@^7.5.0`, `dotenv@^16.4.7`, `pino@^9.6.0`, `@prisma/client@^6.5.0`, `prisma@^6.5.0`, `zod@^3.24.2`, `vitest@^3.0.7`, `supertest@^7.0.0`, `tsx@^4.19.3`
- Client (`@interviewpilot/client`): `next@^15.2.1`, `react@^19.0.0`, `react-dom@^19.0.0`, `tailwindcss@^3.4.17`, `lucide-react@^0.477.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `tailwind-merge@^3.0.2`, `zod@^3.24.2`

---

## Phase 0 — Setup and Foundation

- **What was built**:
  - Monorepo workspaces (`shared/`, `server/`, `client/`) with strict TypeScript (`tsconfig.base.json`), ESLint v9 flat config (`eslint.config.mjs`), and Prettier (`.prettierrc`).
  - Environment validation module (`server/src/config/env.ts`) that checks required variable names and prints `OK`/`MISSING` without ever printing values (`SEC-7`), enforcing test database separation (`TEST_DATABASE_URL !== DATABASE_URL`).
  - `.env.example` files (`server/.env.example`, `client/.env.example`) containing variable names and placeholders only, plus `.gitignore` excluding real `.env` files.
  - Express backend (`server/src/app.ts`) with `X-Request-Id` generation (`requestId.ts`), `helmet` security headers (`SEC-4`), strict CORS to `CLIENT_ORIGIN` (`SEC-4`), `X-Requested-With: InterviewPilot` CSRF protection (`csrf.ts`), redacting structured logger (`logger.ts`, `SEC-8`), central error handler hiding stack traces/SQL/secrets (`errorHandler.ts`, `SEC-6`), and `GET /api/health`.
  - Next.js 15 App Router frontend (`client/`) with Tailwind CSS (`docs/design-tokens.md` mapped into `tailwind.config.ts`), shadcn/ui base components (`Button`, `Card`, `Badge`), `/api/:path*` rewrite proxy (`client/next.config.ts`), typed API client (`client/lib/api.ts`), and system health page (`client/app/page.tsx`).
  - Prisma ORM v6 (`server/prisma/schema.prisma`) connected to Neon PostgreSQL with initial migration `20261110000000_init_vector` enabling `pgvector` (`CREATE EXTENSION IF NOT EXISTS "vector";`) applied to both main and test databases.
  - Extracted design system tokens into `docs/design-tokens.md` from `/design`.
- **Files created/changed**:
  - `.gitignore`, `.prettierrc`, `eslint.config.mjs`, `package.json`, `tsconfig.base.json`
  - `docs/design-tokens.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`
  - `shared/package.json`, `shared/tsconfig.json`, `shared/src/index.ts`
  - `server/.env.example`, `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/20261110000000_init_vector/migration.sql`, `server/scripts/migrate-all.ts`, `server/src/config/env.ts`, `server/src/lib/logger.ts`, `server/src/lib/errors.ts`, `server/src/middleware/requestId.ts`, `server/src/middleware/csrf.ts`, `server/src/middleware/errorHandler.ts`, `server/src/db/prisma.ts`, `server/src/app.ts`, `server/src/index.ts`
  - `server/tests/unit/env.test.ts`, `server/tests/api/health-and-security.test.ts`, `server/tests/db/test-db.test.ts`
  - `client/.env.example`, `client/package.json`, `client/tsconfig.json`, `client/next.config.ts`, `client/tailwind.config.ts`, `client/postcss.config.mjs`, `client/app/globals.css`, `client/app/layout.tsx`, `client/app/page.tsx`, `client/lib/utils.ts`, `client/lib/api.ts`, `client/components/ui/button.tsx`, `client/components/ui/card.tsx`, `client/components/ui/badge.tsx`
- **Tests run**:
  - `tests/unit/env.test.ts`: 3 passed
  - `tests/api/health-and-security.test.ts`: 3 passed
  - `tests/db/test-db.test.ts`: 2 passed
  - **Total**: 8 passed (3 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 0.
- **Assumptions**: Used existing `DATABASE_URL_UNPOOLED` / `TEST_DATABASE_URL_UNPOOLED` env variable names from `server/.env` as `DIRECT_URL` aliases.

---

## Phase 1 — Authentication, Roles, Permissions, Helpers

- **What was built**:
  - Prisma schema and migration (`20261110010000_phase1_auth_permissions`) for `User`, `UserProfile`, `PasswordResetToken`, `QuotaConfiguration`, and `AdminAuditLog`.
  - Shared Zod validation schemas (`RegisterInputSchema`, `LoginInputSchema`, `ForgotPasswordInputSchema`, `ResetPasswordInputSchema`, `ChangePasswordInputSchema`) with `.strict()` unknown-field rejection (`SEC-2`, `AUTH-1`).
  - Authentication service & controller (`authService.ts`, `authController.ts`, `authRoutes.ts`) implementing:
    - Registration in a single transaction (`User` + `UserProfile`), email normalization (trimmed/lowercase), bcrypt cost 12 hashing (`AUTH-1`, `AUTH-2`).
    - Login with generic `401` ("Invalid email or password"), `httpOnly; Secure; SameSite=Lax` JWT cookie (`ip_session`), and login failure rate limiter (`> 5` attempts per `email + IP` in 15m → `429`, `AUTH-3`, `QTA-13`).
    - Database-backed `authenticate` middleware checking `status === 'ACTIVE'` (`BLOCKED`/`DELETING` → `403 ACCOUNT_BLOCKED`, `AUTH-4`) and `tokenVersion` on every request (`AUTH-5`).
    - Permission string & role middlewares (`requirePermission`, `requireRole`, `requireAnonymous`, `SEC-1`).
    - Password change and SHA-256 hashed 32-byte single-use 30-minute password reset tokens (`AUTH-5`, `AUTH-6`) with SMTP/mock email adapter (`emailAdapter.ts`, `D-1`).
    - Logout cookie clearing (`AUTH-8`), transactional admin audit-log helper (`auditService.ts`), file upload magic-byte/MIME/size validator helper (`fileValidation.ts`, `SEC-5`), and database seed script (`prisma/seed.ts`, `AUTH-7`).
  - Frontend authentication screens (`client/app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`) with validation, error banners, and loading states (`PUB-3`).
- **Files created/changed**:
  - `shared/src/index.ts`
  - `server/package.json`, `server/vitest.config.ts`, `server/prisma/schema.prisma`, `server/prisma/migrations/20261110010000_phase1_auth_permissions/migration.sql`, `server/prisma/seed.ts`
  - `server/src/config/constants.ts`, `server/src/lib/fileValidation.ts`, `server/src/services/email/emailAdapter.ts`, `server/src/services/audit/auditService.ts`, `server/src/middleware/validate.ts`, `server/src/middleware/rateLimit.ts`, `server/src/middleware/auth.ts`, `server/src/middleware/permissions.ts`, `server/src/modules/auth/authService.ts`, `server/src/modules/auth/authController.ts`, `server/src/modules/auth/authRoutes.ts`, `server/src/app.ts`
  - `server/tests/unit/file-validation.test.ts`, `server/tests/api/auth-and-permissions.test.ts`
  - `client/lib/api.ts`, `client/components/ui/input.tsx`, `client/components/ui/label.tsx`, `client/app/(auth)/login/page.tsx`, `client/app/(auth)/register/page.tsx`, `client/app/(auth)/forgot-password/page.tsx`, `client/app/(auth)/reset-password/page.tsx`
- **Tests run**:
  - `tests/api/auth-and-permissions.test.ts`: 7 passed
  - `tests/unit/file-validation.test.ts`: 4 passed
  - Prior suites: 8 passed
  - **Total**: 19 passed (5 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 1.
- **Assumptions**: Used Nodemailer SMTP adapter configured from `EMAIL_HOST`/`EMAIL_PORT`/`EMAIL_USER`/`EMAIL_PASS`/`EMAIL_FROM` in `server/.env` (`D-1`), mocked in automated tests.

---

## Phase 2 — Users, Profile, Onboarding, Settings

- **What was built**:
  - Shared Zod validation schemas (`OnboardingInputSchema`, `UpdateProfileInputSchema`, `DeleteAccountInputSchema`, `PrivacyControlEnum`) in `shared/src/index.ts`.
  - Pluggable user storage cleanup hook (`server/src/services/storage/storageCleanupHook.ts`) so Phase 2 account deletion executes the 3-step `DELETING` → storage cleanup → hard delete flow (`USR-3`) and Phase 4 wires in real ImageKit deletion.
  - User service, controller, and routes (`server/src/modules/users/userService.ts`, `userController.ts`, `userRoutes.ts`):
    - `POST /api/users/me/onboarding` requiring only `fullName` (`USR-1`) and saving optional `statusType`, `experienceLevel`, `targetRole`, `careerGoals`, `preferredCategories`, and `onboardingCompletedAt`.
    - `POST /api/users/me/onboarding/skip` setting `onboardingCompletedAt` without requiring `fullName` (`USR-1`).
    - `GET /api/users/me/profile` and `PUT /api/users/me/profile` ignoring any `id`/`userId` fields in the request body (`USR-2`), plus `GET /api/users/:id/profile` and `PUT /api/users/:id/profile` returning `404 NOT_FOUND` when accessing another user's profile (`SEC-1`).
    - `GET /api/users/me/privacy-controls` returning exclusively `['DELETE_INTERVIEW', 'DELETE_DOCUMENT', 'DELETE_ACCOUNT']` (`USR-4`).
    - `POST /api/users/me/delete-account` verifying current password, marking user `DELETING` in step 1 (blocking login and normal requests immediately), running storage cleanup in step 2 (allowing retry if cleanup fails), and hard-deleting the user in step 3 (cascading `UserProfile` & `PasswordResetToken` while preserving `AdminAuditLog` rows, `USR-3`).
  - Frontend AppShell layout (`client/components/layout/AppShell.tsx`), Onboarding page (`client/app/(app)/onboarding/page.tsx`), and Account & Privacy Settings page (`client/app/(app)/settings/page.tsx`) with profile editing, password change, and password-confirmed account deletion.
- **Files created/changed**:
  - `shared/src/index.ts`
  - `server/src/services/storage/storageCleanupHook.ts`, `server/src/modules/users/userService.ts`, `server/src/modules/users/userController.ts`, `server/src/modules/users/userRoutes.ts`, `server/src/app.ts`
  - `server/tests/api/users-and-profile.test.ts`
  - `client/lib/api.ts`, `client/components/layout/AppShell.tsx`, `client/app/(app)/onboarding/page.tsx`, `client/app/(app)/settings/page.tsx`
- **Tests run**:
  - `tests/api/users-and-profile.test.ts`: 4 passed (`USR-1` to `USR-4`, wrong-role matrix)
  - Prior suites: 19 passed
  - **Total**: 23 passed (6 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 2.
- **Assumptions**: None.

---
## Phase 3 — Quota and AI Budget Engine ★

- **What was built**:
  - **Part (a) Pure functions (`server/src/lib/quotaMath.ts`)**:
    - UTC day and month start & rollover helpers (`getUtcDayStart`, `getUtcMonthStart`, `isSameUtcDay`, `isSameUtcMonth`, `QTA-5`).
    - Per-user override resolution (`resolveEffectiveUserQuota`, `QTA-15`) and effective interview limit calculation (`computeEffectiveInterviewLimits`, `QTA-9`, `SET-3`).
    - Model price entry validator (`validateModelPriceEntry`, `QTA-8`) requiring an explicit price (`0` valid for free-tier models; missing/negative blocked).
    - Exact `Prisma.Decimal` cost estimation (`estimateAiCostUsd`), remaining budget math (`computeRemainingBudget`, `ADM-2`), reservation capacity check (`canReserveCounter`), calculated warning flag (`calculateUsageWarningFlag`, `QTA-10`), settlement delta calculator (`computeSettlementDelta`, `QTA-6`), and idempotency key builder (`buildIdempotencyKey`, `QTA-12`).
  - **Part (b) Database & Quota Engine (`server/src/services/quota/quotaEngine.ts`, `server/src/modules/quota/quotaRoutes.ts`)**:
    - Prisma schema and migration (`20261110020000_phase3_quota_engine`) for `UserQuota`, `UsageCounter`, and `AIUsageRecord`, applied to both main and test databases.
    - Updated `server/prisma/seed.ts` to seed default `ApplicationSetting` rows (`aiEnabled`, `demoEnabled`, `liveDemoEnabled`, global monthly caps, `warningThresholdRatio`, `reservationTtlSeconds`, and `modelPrices` = `0` for configured free-tier Gemini models).
    - Implemented `withAiUsage` enforcing the 10-step order (`QTA-1`), atomic conditional SQL `UPDATE ... WHERE (used + reserved + needed <= limit) RETURNING id` reservation (`QTA-2`), fail-closed `503 AI_UNAVAILABLE` error handling (`QTA-3`), live database `aiEnabled` emergency shutdown check (`QTA-4`), lazy expiry of stale `RESERVED` records (`QTA-6`), provider failure settlement (`1` request counted, reserved tokens released, `QTA-6`), and `GET /api/quota/me` + dev simulation route `POST /api/quota/dev-simulate` with `20 req/min/user` rate limiting (`QTA-13`).
- **Files created/changed**:
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261110020000_phase3_quota_engine/migration.sql`, `server/prisma/seed.ts`
  - `server/src/lib/quotaMath.ts`, `server/src/services/quota/quotaEngine.ts`, `server/src/modules/quota/quotaRoutes.ts`, `server/src/app.ts`
  - `server/tests/unit/quota-math.test.ts`, `server/tests/db/quota-engine.test.ts`, `server/tests/api/auth-and-permissions.test.ts`, `server/tests/api/users-and-profile.test.ts`, `server/tests/db/test-db.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/quota-math.test.ts`: 6 passed
  - `tests/db/quota-engine.test.ts`: 6 passed (including 20 parallel requests vs limit 5 → 5 succeeded, 15 denied)
  - Prior suites: 23 passed
  - **Total**: 35 passed (8 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 3.
- **Assumptions**: Default global monthly caps seeded as `10,000` requests, `5,000,000` tokens, and `$25.00` USD budget (editable by `ADMIN` in Phase 12).

---

## Phase 4 — Documents (Upload, Storage, Extraction, Summaries)

- **What was built**:
  - Prisma schema and migration (`20261110030000_phase4_documents`) for `UploadedDocument` table and enums (`DocumentType`, `DocumentSourceKind`, `DocumentStatus`, `DocumentFailureReason`).
  - ImageKit private storage adapter (`server/src/services/storage/imagekitAdapter.ts`) with upload, authenticated private download streaming, and deletion, plus `InMemoryStorageAdapter` for automated tests (`DOC-3`, `DOC-8`).
  - Wired storage adapter deletion into `setUserStorageCleanupHook` for 3-step account deletion (`USR-3`).
  - Local document text extraction service (`server/src/services/documents/textExtractor.ts`) using `pdf-parse` (class `PDFParse`) and `mammoth` (DOCX). Correctly identifies blank/scanned PDFs with no extractable text, marking status as `FAILED` with `failureReason: NO_TEXT` (`DOC-9`).
  - Strict factual document summary generator (`server/src/services/documents/documentSummaryService.ts`) with Gemini 3.5 Flash Lite prompt template and schema constraint, executed via `withAiUsage` with `consumeDocumentAnalysis: true` (`DOC-6`, `QTA-1`).
  - Document service, controller, and routes (`server/src/modules/documents/documentService.ts`, `documentController.ts`, `documentRoutes.ts`):
    - Upload endpoint `POST /api/documents/upload` validating PDF/DOCX magic bytes, MIME types, and `<= 5 MB` (`DOC-2`, `SEC-5`), blocking demo visitors (`DOC-1`), and enforcing maximum 5 documents per type (`DOC-4`).
    - Pasted JD endpoint `POST /api/documents/paste-jd` validating `<= 15,000` characters (`DOC-4`).
    - Document listing `GET /api/documents` and metadata `GET /api/documents/:id` returning document metadata with **never** any public ImageKit URL (`DOC-3`).
    - Authenticated download streaming `GET /api/documents/:id/download` proxying file bytes securely without exposing public storage links (`DOC-7`).
    - Document deletion `DELETE /api/documents/:id` cleaning up storage adapter and database row (`DOC-8`).
    - Cross-user access isolation returning `404 NOT_FOUND` when user B accesses user A's document (`SEC-1`).
  - Client documents management page (`client/app/(app)/documents/page.tsx`) with tabbed CV/JD views, upload dropzone, pasted JD modal, summary drawer, and download/delete controls.
  - Test suite `server/tests/api/documents.test.ts` covering `DOC-1` through `DOC-9`, `QTA-1`, and `SEC-5`.
- **Files created/changed**:
  - `server/package.json`, `package-lock.json`, `shared/src/index.ts`, `client/lib/api.ts`
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261110030000_phase4_documents/migration.sql`
  - `server/src/services/storage/imagekitAdapter.ts`, `server/src/services/documents/textExtractor.ts`, `server/src/services/documents/documentSummaryService.ts`
  - `server/src/modules/documents/documentService.ts`, `server/src/modules/documents/documentController.ts`, `server/src/modules/documents/documentRoutes.ts`, `server/src/modules/auth/authService.ts`, `server/src/app.ts`, `server/src/db/prisma.ts`, `server/src/services/quota/quotaEngine.ts`
  - `client/app/(app)/documents/page.tsx`
  - `server/tests/api/documents.test.ts`, `server/tests/db/quota-engine.test.ts`, `server/tests/db/test-db.test.ts`, `server/vitest.config.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/api/documents.test.ts`: 4 passed
  - Prior suites: 35 passed
  - **Total**: 39 passed (9 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 4.
- **Assumptions**: None.

---

## Phase 5 — RAG (Embeddings and Retrieval) ★

- **What was built**:
  - **Part (a) Pure functions (`server/src/lib/chunking.ts`)**:
    - Pure deterministic chunking function `chunkText` (`RAG-1`, `1,200` chars max, `150` char overlap) with boundary awareness (paragraph `\n\n`, newline `\n`, sentence `. `, and space).
    - Result shaper `shapeRetrievalResults` (`RAG-4`) sorting by cosine distance ascending, capping top-k (`4`), and enforcing global character budget (`3,000` chars max).
    - Embedding vector dimension validator `validateEmbeddingDimensions` and startup dimension mismatch checker `validateStartupEmbeddingConfig` (`RAG-3`, `768` dimensions).
  - **Part (b) Database + Vector Search Services (`server/src/services/rag/`)**:
    - Prisma schema update and migration (`20261110040000_phase5_rag_chunks`) adding `DocumentChunk` with `Unsupported("vector(768)")` and HNSW cosine index `CREATE INDEX "DocumentChunk_embedding_hnsw_idx" ON "DocumentChunk" USING hnsw ("embedding" vector_cosine_ops)`, deployed to both main and test databases.
    - Embedding generator service (`embeddingService.ts`) with production `GeminiEmbeddingGenerator` (`@google/genai` SDK) wrapped in `withAiUsage` (`RAG-6`) and `MockEmbeddingGenerator` for deterministic, zero-cost automated tests.
    - RAG indexing service `indexDocumentChunks` (`ragService.ts`) replacing chunks atomically in a transaction when a document is processed (`RAG-6`).
    - Semantic retrieval service `retrieveRelevantChunks` strictly filtering by `userId = actorId` AND `documentId = ANY(interviewDocIds)` (`RAG-2`), preventing cross-user chunk leakage even with identical text.
    - Document readiness validator `validateDocumentsReady` enforcing that all interview documents are `READY` with non-null summaries, blocking non-ready documents with `422 DOCUMENT_NOT_READY` (`RAG-8`) and foreign documents with `404 NOT_FOUND` (`SEC-1`).
    - Wired chunk indexing into document upload and pasted JD processing in `documentService.ts`.
- **Files created/changed**:
  - `server/package.json`, `package-lock.json`
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261110040000_phase5_rag_chunks/migration.sql`, `server/scripts/migrate-all.ts`
  - `server/src/config/constants.ts`, `server/src/index.ts`
  - `server/src/lib/chunking.ts`, `server/src/services/rag/embeddingService.ts`, `server/src/services/rag/ragService.ts`, `server/src/modules/documents/documentService.ts`
  - `server/tests/unit/rag-chunking.test.ts`, `server/tests/db/rag-retrieval.test.ts`, `server/tests/api/documents.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/rag-chunking.test.ts`: 7 passed
  - `tests/db/rag-retrieval.test.ts`: 7 passed
  - Prior suites: 39 passed
  - **Total**: 53 passed (11 test files), `type-check` passed, `lint` passed.
- **Incomplete items**: None for Phase 5.
- **Assumptions**: Applied D-2 DEFAULT: candidate's own CV/JD only (no curated question bank).


---

## Phase 6 — Interview Setup & Plan Generation

- **What was built**:
  - **Data Models & Migration (`20261110050000_phase6_interview_setup`)**:
    - Created `Interview`, `InterviewConfiguration`, and `InterviewQuestion` Prisma models.
    - Added partial unique index `CREATE UNIQUE INDEX "Interview_active_user_idx" ON "Interview" ("userId") WHERE "status" = 'IN_PROGRESS';` (`QTA-11`).
    - Successfully migrated both primary and test Neon databases.
  - **Shared Schemas & DTOs (`shared/src/index.ts`)**:
    - Enums: `InterviewModeEnum`, `InterviewTypeEnum`, `InterviewDifficultyEnum`, `InterviewStatusEnum`, `InterviewRuntimeStateEnum`, `InterviewEndReasonEnum`, `QuestionKindEnum`.
    - `CreateInterviewInputSchema`: strict validation of mode, role, experience level, interview type, difficulty, duration (15, 30, 45), optional question count, and document IDs.
    - `InterviewPlanSchema`: greeting, topics, evaluation criteria, and first question.
  - **AI Plan Generation (`server/src/services/interview/interviewPlanService.ts`)**:
    - Structured prompt generation with Gemini (`@google/genai` SDK) wrapped in `withAiUsage` (`consumeInterview: true`, `QTA-14`).
    - `MockInterviewPlanGenerator` for deterministic mock plan generation in automated tests.
    - Verified plan rules: no pre-generated follow-ups (`SET-4`), and CV grounding in CV modes (`SET-5`).
  - **Interview Management Module (`server/src/modules/interviews/`)**:
    - `interviewService.ts`: validates document prerequisites per mode (`SET-1`), validates duration against effective user quota (`QTA-9`), calculates question count defaults `floor(duration / 3)` capped by quota (`SET-3`), blocks second active interview with `409 INTERVIEW_ALREADY_ACTIVE` (`QTA-11`), and persists interview + configuration + initial question in one atomic transaction.
    - `interviewController.ts` & `interviewRoutes.ts`: mounted at `/api/interviews` with JWT authentication and CSRF protection.
  - **Frontend Interview Setup Screen (`client/app/(app)/interviews/setup/page.tsx`)**:
    - Mode selector (General, Resume-Based, Job Description, Targeted Role Fit).
    - Document selectors with real-time status indicators (CV / JD pickers).
    - Target role, experience level, category, starting difficulty, and duration buttons reflecting real quota limits.
    - Loading states with spinner while AI generates interview plan and initial question.
  - **Client API Client (`client/lib/api.ts`)**:
    - Added `createInterviewApi`, `fetchInterviewById`, `fetchInterviews`, and `fetchQuotaMe`.
- **Files created/changed**:
  - `shared/src/index.ts`
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261110050000_phase6_interview_setup/migration.sql`
  - `server/src/modules/interviews/interviewController.ts`, `interviewService.ts`, `interviewRoutes.ts`
  - `server/src/services/interview/interviewPlanService.ts`, `server/src/app.ts`
  - `client/app/(app)/interviews/setup/page.tsx`, `client/components/ui/card.tsx`, `client/lib/api.ts`
  - `server/tests/api/interview-setup.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/api/interview-setup.test.ts`: 6 passed
  - Unit suites (`rag-chunking`, `quota-math`, `file-validation`, `env`): 20 passed
  - **Total**: 59 passed, `type-check` passed (0 errors), `lint` passed (0 errors).
- **Incomplete items**: None for Phase 6.
- **Assumptions**: None.

---

## Phase 7 — Interview Engine (LangGraph.js) ★

- **What was built**:
  - **Part (a) Pure Engine Functions (`server/src/lib/interviewEngineMath.ts`)**:
    - Pure decision state machine `decideNext(state, evaluation)` for all branches (`FOLLOW_UP_DEEPER`, `CLARIFY_SIMPLER`, `NEXT_TOPIC`, `CLOSE`).
    - Difficulty step calculator `stepDifficulty(current, delta)` clamped strictly between `EASY` and `HARD`.
    - Question deduplication hash `computeQuestionHash(text)` and set tracker `isQuestionDuplicate` ensuring no duplicate question is ever asked (`ENG-4`).
    - Valid state transition verifiers `isValidStatusTransition` and `isValidRuntimeTransition` enforcing valid lifecycle transitions only (`ENG-2`).
    - Server-side time calculator `calculateElapsedSeconds`, `calculateRemainingSeconds`, `isPastMaxDuration`, and lazy timeout checker `isPastLazyTimeout`.
    - Rolling summary trimmer `truncateRollingSummary(summary, 1200)` and context builder `buildTurnContext` strictly capped under `PROMPT_MAX_CHARS` (12,000 chars) (`ENG-7`).
    - Inquiry prompt builder `buildInquiryPrompt` with strict anti-leak instruction forbidding hints or answers to pending questions (`ENG-10`).
  - **Part (b) Graph, Database Models & Endpoints (`server/src/services/interviewEngine/`, `server/src/modules/interviews/`)**:
    - Installed official `@langchain/langgraph@1.7.3` and `@langchain/core@1.3.7`.
    - Prisma schema additions: `CandidateAnswer`, `AnswerEvaluation`, `CandidateInquiry` models with migration `20261111073000_phase7_engine_answers` deployed to database.
    - LangGraph StateGraph state annotation `server/src/services/interviewEngine/interviewGraph.ts`.
    - Turn evaluation service `evaluationService.ts`: structured output schema with 1-attempt retry loop on schema validation error (`ENG-8`), 0 AI calls for empty answers (`VOI-4`/`EVL-4`/`ENG-7`).
    - Candidate inquiry service `inquiryService.ts`: grounded responses via RAG (`retrieveRelevantChunks`), strict 600-char response limit, pending question remains unchanged (`ENG-10`).
    - Engine endpoints mounted on `/api/interviews/:id`:
      - `POST /api/interviews/:id/start` — transitions `CREATED` -> `IN_PROGRESS`, sets `RECRUITER_SPEAKING`, records start time (`ENG-1`, `ENG-2`).
      - `GET /api/interviews/:id/state` — returns current interview state DTO, lazy timeout detection, server-side remaining time.
      - `POST /api/interviews/:id/answer` — submits answer, performs turn evaluation, applies adaptive branching, updates difficulty, persists answer and evaluation in one transaction, respects `Client-Request-Id` idempotency (`QTA-12`).
      - `POST /api/interviews/:id/inquiry` — candidate asks question, checks inquiry quota, answers recruiter clarification without leaking question answer, leaves pending question untouched (`ENG-10`).
      - `POST /api/interviews/:id/end` — early interview termination, sets terminal status `COMPLETED` / `ABANDONED` (`ENG-9`).
      - `POST /api/interviews/:id/retry` — recovers from transient error state back to `CANDIDATE_RECORDING`.
  - **Client API Client (`client/lib/api.ts`)**:
    - Added `startInterviewApi`, `getInterviewStateApi`, `submitInterviewAnswerApi`, `submitInterviewInquiryApi`, `endInterviewApi`, `retryInterviewErrorApi`.
- **Files created/changed**:
  - `shared/src/index.ts`
  - `server/package.json`, `package-lock.json`
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261111073000_phase7_engine_answers/migration.sql`
  - `server/scripts/migrate-all.ts`, `server/src/config/env.ts`, `server/src/db/prisma.ts`
  - `server/src/lib/interviewEngineMath.ts`
  - `server/src/services/interviewEngine/evaluationService.ts`, `inquiryService.ts`, `interviewGraph.ts`
  - `server/src/modules/interviews/interviewEngineService.ts`, `interviewController.ts`, `interviewRoutes.ts`, `interviewService.ts`
  - `client/lib/api.ts`
  - `server/tests/unit/interview-engine.test.ts`
  - `server/tests/api/interview-engine.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/interview-engine.test.ts`: 24 passed
  - `tests/api/interview-engine.test.ts`: 6 passed
  - **Total**: 30 passed in Phase 7 suites, `type-check` passed (0 errors), `lint` passed (0 errors).
- **Incomplete items**: None for Phase 7.
- **Assumptions**: None.

---

## Phase 8 — Voice and Avatar ★

- **What was built**:
  - **Part (a) Pure Voice Math (`shared/src/voiceMath.ts`, `server/src/lib/voiceMath.ts`)**:
    - `computeRms(samples)`: calculates normalized root-mean-square of audio signal.
    - `mapRmsToBarHeights(rms, options)`: maps RMS to 24 waveform bar heights; values below `SILENCE_THRESHOLD` (`0.01`) strictly render flat bars (`minHeight = 4`) with zero animation (`VOI-8`).
    - `isEmptyAnswer(params)`: detects empty answers (< 1 second duration, or < 2 words transcript, or silence only) so zero evaluation AI calls are made (`VOI-4`).
    - `isRecorderAllowed(runtimeState)`: gates recording strictly to `CANDIDATE_LISTENING`, forbidding recording during `RECRUITER_SPEAKING`, `PROCESSING_ANSWER`, `AI_THINKING`, and `GENERATING_NEXT_QUESTION` (`VOI-11`).
    - `validateAudioUpload(params)`: verifies MIME type against allowed set (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/wav`, `audio/x-m4a`, `audio/mpeg`, `audio/aac`) and caps upload size at 5 MB (`VOI-2`).
    - `isAnswerTimeLimitExceeded(elapsedSeconds)`: enforces 120-second single-recording hard limit (`VOI-1`).
  - **Part (b) Backend Voice Services & Endpoints (`server/src/services/voice/`, `server/src/modules/voice/`)**:
    - `transcriptionService.ts`: Gemini speech-to-text service via `@google/genai` wrapped in `withAiUsage` (`SPEECH_TRANSCRIPTION`) and `MockTranscriptionService` for testing.
    - `speechService.ts`: Gemini TTS synthesis via `@google/genai` with `responseModalities: ['AUDIO']` and prebuilt voice config, wrapped in `withAiUsage` (`SPEECH_SYNTHESIS`) with 1-attempt retry on failure (`VOI-6`), and `MockSpeechService`.
    - `voiceController.ts` & `voiceRoutes.ts`: mounted at `/api/voice`:
      - `POST /api/voice/transcribe`: validates audio upload, transcribes audio, detects empty answers, and immediately discards the in-memory buffer (`VOI-3`). Returns 502 `TRANSCRIPTION_FAILED` on upstream error (`VOI-5`).
      - `POST /api/voice/synthesize`: generates speech audio and returns base64 audio and text caption (`VOI-6`).
  - **Part (c) Frontend Voice Hooks & UI (`client/`)**:
    - Installed approved `@interviewflowai/talking-avatar@0.3.0`, `three`, `@types/three`.
    - `useMicrophone` hook (`client/hooks/useMicrophone.ts`):
      - Requests microphone with echo cancellation, noise suppression, and auto gain control (`VOI-1`).
      - Analyzes real microphone input via Web Audio API `AnalyserNode`, dynamically updating waveform bars.
      - Enforces 120-second recording auto-submit limit (`VOI-1`).
      - Detects audio track disconnects and sets `isDisconnected` error state (`VOI-10`).
      - Gated strictly by `isRecorderAllowed(runtimeState)` (`VOI-11`).
      - Mute support (`VOI-9`).
    - `Waveform` component (`client/components/interview/Waveform.tsx`): renders reactive bars, flat when muted or in silence (`VOI-8`).
    - `RecruiterAvatar` component (`client/components/interview/RecruiterAvatar.tsx`): wraps `TalkingAvatar` SDK, mounts 3D WebGL avatar canvas, drives viseme lip-sync via `avatar.speak(audioSource)` (`VOI-7`), and toggles behavior between `listening` and `thinking`.
    - API client functions `transcribeAudioApi` and `synthesizeSpeechApi` in `client/lib/api.ts`.
  - **Architecture Documentation**: Filled Section 15 "SDK notes" in `docs/ARCHITECTURE.md` with exact methods, version (`0.3.0`), and Gemini audio specs.
- **Files created/changed**:
  - `shared/src/voiceMath.ts`, `shared/src/index.ts`
  - `server/src/services/voice/transcriptionService.ts`, `server/src/services/voice/speechService.ts`
  - `server/src/modules/voice/voiceController.ts`, `server/src/modules/voice/voiceRoutes.ts`
  - `server/src/app.ts`
  - `client/package.json`, `package-lock.json`, `client/lib/api.ts`
  - `client/hooks/useMicrophone.ts`, `client/components/interview/Waveform.tsx`, `client/components/interview/RecruiterAvatar.tsx`
  - `docs/ARCHITECTURE.md`
  - `server/tests/unit/voice-math.test.ts`
  - `server/tests/api/voice.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/voice-math.test.ts`: 19 passed
  - `tests/api/voice.test.ts`: 7 passed
  - **Total**: 26 passed in Phase 8 suites, `type-check` passed (0 errors across all 3 workspaces), `lint` passed (0 errors).
- **Incomplete items**: None for Phase 8.
- **Assumptions**: None.


## Phase 9 — Live Interview Room

- **What was built**:
  - **Room Rules & Enablement Logic (`shared/src/roomRules.ts`)**:
    - `getRoomButtonStates(runtimeState, { inquiriesRemaining })`: implements the strict state-machine button enable matrix for `Mute`, `Finish Answer`, `Ask a Question`, `End Interview`, and `Retry` across all runtime states (`ROOM-2`).
    - `mapRoomErrorMessage(code, defaultMessage)`: maps technical codes (`MICROPHONE_DENIED`, `MICROPHONE_LOST`, `AUDIO_PLAYBACK_FAILED`, `TRANSCRIPTION_FAILED`, `TTS_FAILED`, `AI_UNAVAILABLE`, `INTERNAL_ERROR`, `QUOTA_EXCEEDED`, `BUDGET_EXHAUSTED`, `SESSION_EXPIRED`) to plain, candidate-friendly guidance with no SQL, stack traces, or secrets (`ROOM-6`).
  - **Device Check Page (`client/app/(app)/interviews/[id]/device-check/page.tsx`)**:
    - Live microphone permission request and visual input level test using `useMicrophone` and `Waveform` (`ROOM-2`).
    - Audio output verification using Web Audio API synthetic dual-frequency test chime.
    - AI recruiter avatar preview using `RecruiterAvatar`.
    - Prominent "No webcam needed" notice and turn-taking protocol instructions (`VOI-11`).
    - Permission-denied help instructions.
    - "Enter Interview Room" CTA button enabled only once microphone permission is verified.
  - **Live Interview Room Page (`client/app/(app)/interviews/[id]/room/page.tsx`)**:
    - 2-panel cockpit layout styled strictly in "Executive Synthetic" aesthetic matching `/design/screens/live-interview-room.html`:
      - **Left Panel (AI Recruiter)**: `RecruiterAvatar` container with lip-sync audio playback, status badge (`Recruiter Speaking`, `Recruiter Thinking...`, `Listening to Candidate`), live question caption bar, and "Replay question" button costing 1 TTS call (`ROOM-5`).
      - **Right Panel (Candidate Console)**: candidate details, live microphone `Waveform` driven by real Web Audio RMS, mute indicator, elapsed timer (whole seconds, `RPT-5`), progress indicator ("Question X of N"), remaining clarifications badge (`ROOM-2`).
    - **"Ask a Question" Flow (`ROOM-3`, `ENG-10`)**: clicking button in `CANDIDATE_LISTENING` discards unsent answer, switches `listeningMode = 'QUESTION'`, records inquiry, and submits on Finish Answer; recruiter speaks the clarification reply and restores the same pending question with mic reopened in `ANSWER` mode.
    - **End Interview Modal (`ROOM-4`)**: works at any time, asks for confirmation, sets `ENDED_EARLY`, releases reservations, and navigates to report.
    - **Reload Recovery (`ROOM-5`, `ROOM-1`)**: restores state from backend via `GET /state` on reload, presenting current question caption without regenerating audio.
    - **Idempotent Retry (`ROOM-7`, `QTA-12`)**: buffers recording in-memory and retries up to 3 times using the same `clientRequestId`.
    - **Voice Interruption Gate (`VOI-11`)**: recorder is strictly inactive while recruiter speaks or AI thinks.
- **Files created/changed**:
  - `shared/src/roomRules.ts`, `shared/src/index.ts`
  - `client/app/(app)/interviews/[id]/device-check/page.tsx`
  - `client/app/(app)/interviews/[id]/room/page.tsx`
  - `server/tests/unit/room-rules.test.ts`
  - `server/tests/api/interview-room.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/room-rules.test.ts`: 9 passed
  - `tests/api/interview-room.test.ts`: 6 passed
  - **Total**: 15 passed in Phase 9 suites; monorepo `type-check` passed (0 errors across shared, server, client); monorepo `lint` passed (0 errors).
- **Incomplete items**: None for Phase 9.
- **Assumptions**: Room buttons and clarification inquiry flow follow default spec (`ROOM-3`).


## Phase 10 — Evaluation, Reports, History ★

- **What was built**:
  - **Part (a) Pure Evaluation and Report Math (`shared/src/evaluationMath.ts`)**:
    - `roundHalfUp(val)`: standard half-up integer rounding (e.g. 74.5 -> 75, 74.4 -> 74) (`EVL-2`, `RPT-1`).
    - `calculateAnswerScore(criteria, isEmpty)`: mean of answer criteria scores rounded half up; empty answers strictly yield 0 (`EVL-2`, `EVL-4`).
    - `calculateOverallScore(answerScores)`: mean of all answer scores (including empty answers as 0) rounded half up (`RPT-1`).
    - `calculateSkillBreakdown(answers)`: aggregates criteria scores per skill across answers and calculates mean rounded half up (`RPT-1`).
    - `calculateStarCoverage(behavioralAnswers)`: calculates situation, task, action, and result share percentages (`RPT-1`).
    - `calculateDurationSeconds(startedAt, endedAt)`: exact elapsed interview duration in whole seconds (`RPT-5`).
    - `filterInterviewHistory(items, filters)`: filters by role text (case-insensitive contains), interview type, UTC date range, sorted newest first, with 20 items per page pagination (`RPT-6`).
    - `compareInterviewSkills(skillsA, skillsB)`: computes differential variance matrix comparing skills between two selected interviews (`RPT-7`).
    - Anti-bias instruction embedded in `buildInterviewContext`: `"Evaluation Rule: do not score by length or vocabulary; do not inflate scores."` (`EVL-3`).
  - **Part (b) Database Models & Migrations (`server/prisma/`)**:
    - Migration `20261111183000_phase10_interview_reports`:
      - Created `enum ReportStatus { PENDING, READY, FAILED }`.
      - Added `starParts JSONB` column on `AnswerEvaluation`.
      - Created `InterviewReport` table (`id`, `interviewId` unique, `status`, `summary`, `strengths`, `weaknesses`, `recommendations`, `studyTopics`, `generatedAt`, `failureReason`).
  - **Part (c) Report Generation Service & Endpoints (`server/src/services/report/`, `server/src/modules/reports/`)**:
    - `reportService.ts`: Gemini report generation using a compact digest of evaluation scores and strengths/weaknesses (never raw transcripts/audio) wrapped in `withAiUsage` (`REPORT_GENERATION`) (`RPT-2`), with `MockReportGenerator`.
    - `reportController.ts` & `interviewRoutes.ts`:
      - `GET /api/interviews/:id/report`: returns report, questions breakdown (`RPT-4`), and calculated metrics (overall score, duration, skills, STAR coverage) calculated dynamically on read (`RPT-1`, `RPT-5`). Another user's interview returns 404 (`SEC-1`).
      - `POST /api/interviews/:id/report/generate`: generates report if >= 1 answer evaluated (`RPT-2`); returns existing report without extra AI calls if already READY (`RPT-3`); sets status to `PENDING` if AI is unavailable while preserving calculated numbers.
      - `GET /api/interviews/history`: returns own interviews with pagination, role search, and type filters (`RPT-6`).
      - `GET /api/interviews/progress`: returns list of completed interviews for progress tracking (`RPT-7`).
      - `GET /api/interviews/compare`: compares skill breakdowns between two interviews owned by user (`RPT-7`).
  - **Part (d) Frontend Report & History Pages (`client/`)**:
    - Comprehensive Report screen (`client/app/(app)/interviews/[id]/report/page.tsx`):
      - Executive header, overall score index bento card (`overallScore / 100`), competency skill breakdown tiles, STAR coverage breakdown, strengths & weaknesses cards, actionable recommendations and study topics, and question-by-question audit breakdown (`RPT-4`).
      - "Generate Executive Narrative" CTA button when report is in `PENDING` state (`RPT-2`).
    - History & Progress screen (`client/app/(app)/history/page.tsx`):
      - Performance trajectory timeline (`RPT-7`), side-by-side skill comparison tool with differential variance highlights, role search and type filtering, and paginated history table (`RPT-6`).
- **Files created/changed**:
  - `shared/src/evaluationMath.ts`, `shared/src/index.ts`
  - `server/prisma/schema.prisma`, `server/prisma/migrations/20261111183000_phase10_interview_reports/migration.sql`
  - `server/src/lib/interviewEngineMath.ts`
  - `server/src/services/report/reportService.ts`
  - `server/src/modules/reports/reportController.ts`
  - `server/src/modules/interviews/interviewRoutes.ts`
  - `client/lib/api.ts`
  - `client/app/(app)/interviews/[id]/report/page.tsx`
  - `client/app/(app)/history/page.tsx`
  - `server/tests/unit/evaluation-math.test.ts`
  - `server/tests/api/interview-reports.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/unit/evaluation-math.test.ts`: 15 passed
  - `tests/api/interview-reports.test.ts`: 5 passed
  - **Total**: 20 passed in Phase 10 suites; monorepo `type-check` passed (0 errors across shared, server, client); monorepo `lint` passed (0 errors).
- **Incomplete items**: None for Phase 10.
- **Assumptions**: Decision D-5: default applied (empty answers receive 0 score on every criterion, zero AI calls, and count in overall score averages).

## Phase 11 — User Dashboard & Demo Experience (RPT-8, DEM-1 to DEM-7)
- **Status**: COMPLETE
- **Tag**: `phase-11-done`
- **What was built**:
  - **Prisma Schema & Migrations (`server/prisma/`)**:
    - Created `DemoSession` table (`id`, `userId` foreign key to `User` with cascade delete, `ipHash` with index, `expiresAt`, `createdAt`). Applied migration `20261112003000_phase11_demo_sessions` across both `public` and `test_suite` schemas.
  - **Demo Management Service & Limits (`server/src/services/demo/demoService.ts`)**:
    - `hashClientIp`: HMAC SHA-256 with `DEMO_IP_HASH_SECRET`, strictly ensuring raw IP addresses are never persisted (`DEM-3`).
    - `purgeExpiredDemoUsers`: Lazily purges up to 50 expired demo users per demo session creation without requiring any background cron jobs (`DEM-7`).
    - `createDemoSession`: Checks `demoEnabled` (503 `DEMO_DISABLED`), validates IP daily limit (1/day) and global daily limit (20/day) throwing 429 `DEMO_RESTRICTED`, and creates an isolated ephemeral User + Profile + DemoSession in one database transaction (`DEM-1`, `DEM-2`, `DEM-3`).
    - `getSampleDemoFixtures`: Returns read-only sample fixtures explicitly labeled `"Sample data — read-only demo preview"` (`DEM-5`).
  - **Enforced Demo Restrictions across Modules (`DEM-4`, `DEM-2`)**:
    - In `documentController.ts`: `req.actor.isDemo` throws 403 `DEMO_RESTRICTED` on document upload or paste (`DEM-4`).
    - In `interviewService.ts` & `interviewEngineService.ts`: checks `liveDemoEnabled` setting (throws 403 `DEMO_LIVE_DISABLED` if false), and restricts interview mode strictly to `GENERAL` (`DEM-2`, `DEM-4`).
  - **Candidate Dashboard Controller & Route (`server/src/modules/users/userDashboardController.ts`, `userRoutes.ts`)**:
    - `GET /api/users/dashboard` & `GET /api/users/me/dashboard` (`RPT-8`, Section 7):
      - Zero AI calls strictly enforced (`RPT-8`).
      - All statistics dynamically calculated: `totalInterviews`, `completedInterviews`, `averageScore`, `recentTrend` (last 10 completed interviews, oldest to newest), `recentInterviews` (last 5), and recommendations from the latest saved report (`RPT-8`).
  - **Client Dashboard UI & API Helpers (`client/`)**:
    - `client/app/(app)/dashboard/page.tsx`:
      - Bento layout matching `/design/screens/candidate-dashboard.html`.
      - Demo notice banner when `isDemo` is active with upgrade link.
      - Hero card, 4 computed stat cards, recent sessions list, and AI executive coaching digest box.
    - `client/lib/api.ts`: added `fetchUserDashboardApi`, `createDemoSessionApi`, and `fetchDemoSamplesApi`.
- **Files created/changed**:
  - `server/prisma/schema.prisma`
  - `server/prisma/migrations/20261112003000_phase11_demo_sessions/migration.sql`
  - `server/src/services/demo/demoService.ts`
  - `server/src/modules/demo/demoController.ts`
  - `server/src/modules/demo/demoRoutes.ts`
  - `server/src/modules/users/userDashboardController.ts`
  - `server/src/modules/users/userRoutes.ts`
  - `server/src/modules/documents/documentController.ts`
  - `server/src/modules/interviews/interviewService.ts`
  - `server/src/modules/interviews/interviewEngineService.ts`
  - `server/src/app.ts`
  - `shared/src/index.ts`
  - `client/lib/api.ts`
  - `client/app/(app)/dashboard/page.tsx`
  - `server/tests/api/dashboard-demo.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/api/dashboard-demo.test.ts`: 8 passed
  - Full workspace `type-check`: passed (0 errors across shared, server, client)
  - Full workspace `lint`: passed (0 errors)
- **Incomplete items**: None for Phase 11.
- **Assumptions**: Demo limits default to 1 session/day per IP and 20 sessions/day globally; 24-hour expiry on demo sessions.

## Phase 12 — Admin Dashboard & Global Controls (ADM-1 to ADM-10, DEM-6, QTA-4, QTA-10, SEC-1)
- **Status**: COMPLETE
- **Tag**: `phase-12-done`
- **What was built**:
  - **Admin Service Layer (`server/src/modules/admin/adminService.ts`)**:
    - `getAdminOverviewMetrics`: Real-time computed database metrics (total registered non-demo users, 7-day active users, unexpired demo sessions, real vs demo interview counts all-time and today UTC, total uploaded documents, and global monthly AI budget tracking with Decimal arithmetic `remaining = budget - used - reserved`) (`ADM-2`, Section 7).
    - `listAdminUsers`, `setUserBlockStatus`, `deleteUserByAdmin`: Paginated user directory with search/filters. Enforces rule that an admin cannot block or delete themselves or another administrator. Sensitive actions audited within the same transaction (`ADM-3`).
    - `listAdminDocuments`, `previewOrDownloadDocumentByAdmin`, `deleteDocumentByAdmin`: Secure document streaming and deletions, failing closed if audit log creation fails (`ADM-4`, `SEC-1`).
    - `listAdminInterviews`, `viewInterviewTranscriptOrReportByAdmin`: Lists interviews with overall score calculation and audits transcript views with strictly no live audio endpoint (`ADM-5`).
    - `getAdminUsageAggregates`: Model and operation aggregates from `AIUsageRecord` with costs explicitly labelled `"ESTIMATED"` (`ADM-6`).
    - `getAdminSettings`, `updateAdminSettings`: Range-validated platform configuration storing before/after diffs without secrets (`ADM-7`).
    - `triggerEmergencyAiShutdown`: Single-action immediate kill-switch setting `aiEnabled = false` across the platform while preserving non-AI pages (`QTA-10`).
    - `listAdminAuditLogs`: Paginated, read-only immutable audit record (`ADM-8`).
    - `resetAllDemoData`: Cascades deletion of all demo users and sessions (`DEM-6`, `ADM-9`).
  - **Admin Controller & Routes (`server/src/modules/admin/`)**:
    - Every route guarded by `authenticate` and `requireRole('ADMIN')` (checked on the database for every request: USER receives 403, anonymous receives 401) (`ADM-1`).
    - Responses sanitized to guarantee no passwords, password hashes, JWT tokens, or environment keys are leaked (`ADM-10`).
  - **Admin Frontend Pages (`client/app/admin/`)**:
    - Layout (`client/app/admin/layout.tsx`): Top bar with emergency shutdown button, status badge, candidate portal return link, and tab navigation.
    - Overview (`client/app/admin/page.tsx`): Key statistics, real vs demo interview split, global budget gauge, and reset demo data button.
    - Users Directory (`client/app/admin/users/page.tsx`): Search, filter, block/unblock, and account deletion actions.
    - Settings Editor (`client/app/admin/settings/page.tsx`): Quota controls, demo toggles, and budget inputs.
    - Audit Viewer (`client/app/admin/audit/page.tsx`): Paginated audit stream with timestamps, actor IDs, actions, and metadata diffs.
  - **Client API Integration (`client/lib/api.ts`)**: Added 14 admin API client functions.
- **Files created/changed**:
  - `server/src/modules/admin/adminService.ts`
  - `server/src/modules/admin/adminController.ts`
  - `server/src/modules/admin/adminRoutes.ts`
  - `server/src/app.ts`
  - `client/lib/api.ts`
  - `client/app/admin/layout.tsx`
  - `client/app/admin/page.tsx`
  - `client/app/admin/users/page.tsx`
  - `client/app/admin/settings/page.tsx`
  - `client/app/admin/audit/page.tsx`
  - `server/tests/api/admin-dashboard.test.ts`
  - `docs/PROGRESS.md`
- **Tests run**:
  - `tests/api/admin-dashboard.test.ts`: 9 passed
  - Full workspace `type-check`: passed (0 errors across shared, server, client)
  - Full workspace `lint`: passed (0 errors)
- **Incomplete items**: None for Phase 12.
- **Assumptions**: None. All rules ADM-1 through ADM-10 strictly verified.
