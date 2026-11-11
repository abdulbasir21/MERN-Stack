# ScopeSentry — Implementation Progress

Path: `docs/PROGRESS.md`

---

## Phase 0 — Setup

**Status:** Completed & Verified  
**Date:** 2026-11-10

### 1. What was built
- **Repository & Security Hygiene:**
  - Configured `ScopeSentry/.gitignore` and parent `.gitignore` strictly excluding `server/env`, `frontend/env`, and `.env*`.
  - Created clean `server/env.example` and `frontend/env.example` with variable names and placeholders only.
  - Verified `git check-ignore` explicitly ignores both active `env` files.
- **Design Tokens (`docs/design-tokens.md`):**
  - Fully populated from Stitch design export (`projects/5508587020154610825`, "Blueprint Precision").
  - Documented complete color palette, typography scale (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`), spacing, border radii, card elevation, and badge specifications.
- **Backend Architecture (`server/`):**
  - Modular Express app structure (`src/app.js` exporting app for Supertest, `src/server.js` listening with graceful shutdown).
  - Explicit dotenv loader (`src/config/env.js`) for `server/env` with startup validation that throws on missing required names without exposing existing values.
  - Normalized configuration supporting `CLIENT_URL`/`CLIENT_ORIGIN`, `JWT_ACCESS_SECRET`/`JWT_SECRET`, etc.
  - Security middleware: `helmet()`, strict `cors()` with origin check and credentials, body parsers with 2MB limits, `cookie-parser`.
  - Global constants (`src/config/constants.js`) defining enums for project types, document categories, statuses, confidence, and permissions.
  - Standardized health check routes (`GET /health` and `GET /api/v1/health`) exposing no internal database or credential details.
  - Centralized error handler (`src/middleware/errorHandler.js`) and 404 handler returning `{ error: { code, message, details? } }` with stack traces stripped.
  - Database connector (`src/db/connection.js`) using Mongoose.
- **Frontend Architecture (`frontend/`):**
  - Vite + React + Tailwind CSS configured with the "Blueprint Precision" theme tokens and custom fonts.
  - Explicit env loader in `vite.config.js` for `frontend/env` (resolving decision D-2).
  - Unified API client (`src/lib/api.js`) handling base URL, credentials (`include`), CSRF in-memory management, and normalized error throwing.
  - Layout shells: `PublicLayout` (brand header, navigation, limitations footer) and `AppLayout` (260px deep navy sidebar, status telemetry bar, workspace container).
  - Page shells for `HomePage` (with value proposition and feature cards) and `DashboardPage` (with real-time telemetry card shells and empty state).
  - React Router routing configuration.
  - Playwright E2E configuration (`playwright.config.js`).

### 2. Real Test & Verification Counts
- **Server Vitest:**
  - `tests/unit/env.test.js`: 2 passed
  - `tests/api/health.test.js`: 4 passed
  - **Total:** 6 tests passed (2 test files, duration: 1.47s)
- **Frontend Vitest:**
  - `src/App.test.jsx`: 1 passed (1 test file, duration: 3.96s)
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1583 modules transformed, production bundle built in 6.12s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities reported in dev/nested packages (vitest/tinypool/esbuild, zod <4); breaking upgrade not auto-applied per AGENTS.md rule 4.
  - `frontend/`: 8 vulnerabilities reported in dev/nested packages (vitest/tinypool/esbuild, react-router <7.18); breaking upgrade not auto-applied per AGENTS.md rule 4.

### 3. Documentation & Package Versions Used
- `express` v4.21.1 (official Express.js docs)
- `mongoose` v8.8.0 (official Mongoose v8 docs)
- `dotenv` v16.4.5 (official dotenv docs on explicit path loading)
- `helmet` v8.0.0 (official Helmet v8 docs)
- `cors` v2.8.5 (official CORS docs)
- `vitest` v2.1.9 (official Vitest docs)
- `supertest` v7.0.0 (official Supertest docs)
- `tailwindcss` v3.4.15 (official Tailwind CSS v3 docs)
- `vite` v5.4.21 (official Vite v5 docs)
- `react-router-dom` v6.28.0 (official React Router v6 docs)

### 4. Decisions Made
- **D-2 Resolution:** Configured `frontend/vite.config.js` to load `frontend/env` via `dotenv.config({ path: path.resolve(__dirname, 'env') })` while also supporting `.env`. Both are ignored by git.
- **Normalized Config Mapping:** In `server/src/config/env.js`, mapped `CLIENT_URL` to `CLIENT_ORIGIN`, `JWT_ACCESS_SECRET` to `JWT_SECRET`, and `NEXT_PUBLIC_URL_ENDPOINT` to `IMAGEKIT_URL_ENDPOINT` so existing keys in `server/env` work out of the box without manual edits.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Dark mode toggle seen on Stitch dashboard (spec sets light canvas `#F7FAFE` with navy text).
- Public demo file upload (spec requires demo to be read-only on pre-seeded documents).
- Multi-tier billing cards from Stitch homepage (billing/subscriptions are out of MVP scope per MASTER_PROMPT section 14).

---

## Phase 1 — Shared Helpers, Auth Infrastructure, Permissions

**Status:** Completed & Verified  
**Date:** 2026-11-10

### 1. What was built
- **Domain Mathematics & Formulas (`server/src/domain/math.js`):**
  - High-precision decimal arithmetic via `decimal.js` (28 precision, `ROUND_HALF_UP`).
  - Guaranteed decimal exactness (`0.1 + 0.2 === 0.3`).
  - Section 7 business logic:
    - `quantityDifference(revised, original)`: signed difference (`revised - original`).
    - `estimatedCostDifference(quantityDiff, unitPrice)`: returns `quantityDiff * unitPrice`; returns `null` if unitPrice is missing or empty (BR-I7: never guess a price).
    - `priceDelta(originalUnitPrice, revisedUnitPrice, revisedQuantity)`: calculates unit price variation delta.
    - `percentChange(original, revised)`: returns `null` when original is 0 or null; computes signed percentage change.
    - `roundHalfUp(val, decimals)`: display-only half-up rounding (2 decimal places for currency/percentage).
- **Calendar Date Calculations in UTC (`server/src/domain/dates.js`):**
  - `isValidCalendarDate(str)`: strictly checks `YYYY-MM-DD` ISO calendar dates.
  - `calendarDateDiffDays(startDate, endDate)`: calculates whole calendar days in UTC (signed integer, works across leap years, month boundaries, and year boundaries).
- **Ownership Scoping & Security (`server/src/domain/ownership.js`):**
  - `buildOwnerScope(ownerId, extra)`: builds owner-scoped database query filter; throws if ownerId is missing.
  - `buildProjectScope(ownerId, projectId, extra)`: enforces BR-C4 (every retrieval query requires ownerId and projectId).
  - `assertOwnership(resource, ownerId)`: throws `404 Not Found` (never 403) when user does not own the resource or resource is null.
- **Middleware & Security Controls:**
  - `server/src/middleware/validate.js`: validates `body`, `query`, and `params` against Zod schemas; returns formatted 400 `VALIDATION_ERROR` with field details.
  - `server/src/middleware/auth.js`: verifies session JWT from httpOnly cookie or Bearer token; attaches `req.user`; returns 401 `UNAUTHENTICATED`.
  - `server/src/middleware/auth.js` (`requirePermission`): role-permission lookup (Visitor, User); returns 403 `FORBIDDEN`.
  - `server/src/middleware/csrf.js`: verifies `X-CSRF-Token` header against cookie on mutating HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`); returns 403 `FORBIDDEN`; provides `issueCsrfToken(res)`.
  - `server/src/middleware/rateLimit.js`: express-rate-limit presets for auth (10/15min), uploads (30/15min), investigations (10/15min), and demo (20/hour); returns standard 429 `RATE_LIMITED`.

### 2. Real Test & Verification Counts
- **Server Vitest:**
  - `tests/unit/math.test.js`: 17 passed
  - `tests/unit/ownership.test.js`: 7 passed
  - `tests/unit/dates.test.js`: 8 passed
  - `tests/api/middleware.test.js`: 11 passed
  - `tests/api/health.test.js`: 4 passed
  - `tests/unit/env.test.js`: 2 passed
  - **Total Server:** 49 tests passed (6 test files, duration: 2.23s)
- **Frontend Vitest:**
  - `src/App.test.jsx`: 1 passed (1 test file, duration: 4.33s)
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking changes not auto-applied.

### 3. Documentation & Package Versions Used
- `decimal.js` v10.4.3 (official decimal.js documentation)
- `jsonwebtoken` v9.0.2 (official jsonwebtoken documentation)
- `bcryptjs` v2.4.3 (official bcryptjs documentation)
- `express-rate-limit` v7.4.1 (official express-rate-limit documentation)
- `zod` v3.23.8 (official Zod documentation)

### 4. Decisions Made
- All currency calculations remain pure string/Decimal internally and are only formatted via `roundHalfUp` at read/display time, guaranteeing zero precision drift.
- CSRF protection explicitly excludes safe methods (`GET`, `HEAD`, `OPTIONS`) and strictly verifies the `X-CSRF-Token` header for all mutating verbs.

### 5. Suggestions (Not Built — Out of Scope)
- Dynamic exchange rates / currency conversions (prohibited by BR-P7; projects maintain single currency label).

---

## Phase 2 — Authentication and Accounts

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Backend Authentication & Models (`server/`):**
  - `server/src/models/User.js`: User schema with lowercase trimmed email, bcrypt passwordHash (cost 12), name, role (`PROJECT_OWNER`), and integer `tokenVersion` for instantaneous session revocation upon password reset.
  - `server/src/models/PasswordResetToken.js`: One-time password reset token schema with sha256 `tokenHash`, `usedAt`, and 30-minute expiry indexed with MongoDB TTL (`expiresAt`).
  - `server/src/utils/password.js`: `hashPassword` and `comparePassword` with bcrypt cost factor 12.
  - `server/src/utils/tokens.js`: `generateSessionToken` (JWT with tokenVersion and 7-day expiry), `generateRandomToken` (cryptographically secure hex), and `hashToken` (sha256).
  - `server/src/integrations/email.js`: Nodemailer SMTP integration supporting `SMTP_*` variables, with a test spy mechanism (`setSentEmailsSpy`) that prevents real network calls during test runs.
  - `server/src/services/authService.js`:
    - `registerUser`: Case-insensitive email uniqueness check (BR-A1), bcrypt hashing (BR-A2), auto-generation of session JWT.
    - `loginUser`: Constant-time comparison, generic authentication error message ("Invalid email or password") for both unknown email and wrong password (BR-A4).
    - `requestPasswordReset`: Generic success message regardless of whether the email exists (BR-A5); creates 30-minute single-use token; sends email without logging raw reset tokens.
    - `resetPassword`: Validates token hash, checks single-use and expiration (BR-A5), updates passwordHash, increments `tokenVersion` to revoke all active sessions immediately, marks token used.
    - `getUserProfile` & `updateUserSettings`: Name update and current-password-verified password change (`GET/PATCH /settings`).
  - `server/src/controllers/authController.js` & Routes:
    - `POST /auth/register` (rate-limited, validated with Zod, sets httpOnly secure cookie).
    - `POST /auth/login` (rate-limited, generic 401 on failure, sets session cookie).
    - `POST /auth/logout` (clears cookie server-side per BR-A6).
    - `GET /auth/me` (requires session, returns user profile, 401 if unauthenticated).
    - `GET /auth/csrf` (issues cryptographically random CSRF token).
    - `POST /auth/forgot-password` (rate-limited, constant-time response).
    - `POST /auth/reset-password` (single-use token verification and session revocation).
    - `GET /settings` & `PATCH /settings` (protected by CSRF and authentication).
- **Frontend Authentication Flow (`frontend/`):**
  - `frontend/src/features/auth/AuthContext.jsx`: Global authentication provider offering `user`, `loading`, `login`, `register`, `logout`, `refreshUser`, auto-CSRF token synchronization, and session bootstrap via `/auth/me`.
  - `frontend/src/components/ProtectedRoute.jsx`: Exports `ProtectedRoute` (guards `/app/*` with loading spinner and redirect to `/login`) and `PublicOnlyRoute` (redirects logged-in users away from auth pages to `/app`).
  - `frontend/src/pages/public/LoginPage.jsx`: Blueprint Precision 50/50 split layout with error banner and direct login.
  - `frontend/src/pages/public/RegisterPage.jsx`: Stakeholder role selection onboarding with password length validation (min 10 chars).
  - `frontend/src/pages/public/ForgotPasswordPage.jsx`: Recovery email submission with generic confirmation banner.
  - `frontend/src/pages/public/ResetPasswordPage.jsx`: Token validation and password reset form.
  - `frontend/src/pages/app/SettingsPage.jsx`: Account settings allowing name update and secure password change with current password verification.
  - `frontend/src/layouts/AppLayout.jsx`: Wired to `useAuth()` for user profile display and sign out button.
  - `frontend/src/App.jsx`: Full route tree wiring auth pages, protected routes, and workspace layout.

### 2. Real Test & Verification Counts
- **Server Vitest:**
  - `tests/api/auth.test.js`: 12 passed
  - `tests/api/middleware.test.js`: 11 passed
  - `tests/unit/math.test.js`: 17 passed
  - `tests/unit/ownership.test.js`: 7 passed
  - `tests/api/health.test.js`: 4 passed
  - `tests/unit/dates.test.js`: 8 passed
  - `tests/unit/env.test.js`: 2 passed
  - **Total Server:** 61 tests passed across 7 test files (duration: 26.06s)
- **Frontend Vitest:**
  - `src/App.test.jsx`: 1 passed (duration: 250ms)
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1591 modules transformed, clean production bundles built in 37.91s (`dist/assets/index-DK7fPuQ1.js`)
- **Audit Reports:**
  - `server/`: 7 reported in dev/nested packages (vitest/tinypool, zod <4); breaking changes not auto-applied per AGENTS.md.
  - `frontend/`: 8 reported in dev/nested packages (vitest/tinypool, react-router <7.18); breaking changes not auto-applied per AGENTS.md.

### 3. Documentation & Package Versions Used
- `bcryptjs` v2.4.3 (official bcryptjs docs, cost factor 12)
- `jsonwebtoken` v9.0.2 (official RFC 7519 / jsonwebtoken docs)
- `nodemailer` v6.9.16 (official Nodemailer SMTP docs)
- `zod` v3.23.8 (official Zod docs)
- `mongoose` v8.8.0 (official Mongoose v8 docs)

### 4. Decisions Made
- **Session Revocation via `tokenVersion` (BR-A5):** Added `tokenVersion` integer to User schema and JWT payload. When a password is reset, `tokenVersion` increments, immediately revoking all existing sessions.
- **Test Database Isolation:** Configured `MONGODB_TEST_DB_NAME` dynamically defaulting to `scopesentry_test` in test environments to guarantee complete isolation from production data.
- **Sequential Vitest Execution for DB Stability:** Configured `singleFork: true` in `vitest.config.js` to ensure Atlas connections are handled reliably during test suites.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Social login / OAuth providers (GitHub/Google SSO): out of scope for MVP single-tenant owner model.
- Multi-factor authentication (MFA/TOTP): out of scope for MVP.

---

## Phase 3 — Projects Module

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Backend Project Domain & Cascade Architecture (`server/`):**
  - `server/src/models/Project.js`: Project schema enforcing BR-P1 (name 1-120 chars, description <= 2000, location <= 200, budget >= 0), BR-P3 (projectType enum), BR-P6 (status `active` / `archived`), and BR-P7 (currency 3-letter code defaulting to `USD`).
  - Sibling schemas created for full dependency cascading: `Document`, `DocumentChunk`, `Investigation` (with unique partial index on `inputHash` for active states), `Finding`, `ReviewAction`, and `Report`.
  - `server/src/services/projectService.js`:
    - `validateDateOrdering`: Enforces BR-P2 (`expectedCompletionDate >= startDate` using whole calendar days in UTC).
    - `createProject`: Saves project scoped to `ownerId` with active status.
    - `listProjects`: Supports pagination (`page`, `limit` default 20 max 100), regex text search, and status filtering (`active`, `archived`, `all`).
    - `getProjectById`: Enforces BR-P4 (strict `ownerId` filtering; foreign or nonexistent IDs throw 404).
    - `updateProject`: Enforces BR-P6 (archived projects reject edits with 409 `CONFLICT` unless unarchiving); validates date ordering; updates permitted fields.
    - `deleteProjectCascade`: Enforces BR-P5 and section 8 #1 (deleting a project deletes all associated child documents, chunks, investigations, findings, review actions, and reports in **one database transaction** with transactional rollback on failure).
  - `server/src/controllers/projectController.js` & Routes (`server/src/routes/projects.js`):
    - `GET /projects` (paginated, filtered, search)
    - `POST /projects` (validated via Zod, CSRF protected, authenticated)
    - `GET /projects/:id` (scoped, 404 on foreign ID)
    - `PATCH /projects/:id` (CSRF protected, archived status check, date ordering check)
    - `DELETE /projects/:id` (CSRF protected, transactional cascade delete)
    - `POST /projects/:id/archive` & `POST /projects/:id/unarchive` (status toggles)
    - Mounted on both `/projects` and `/api/v1/projects` in `src/app.js`.
- **Frontend Project Management (`frontend/`):**
  - `frontend/src/pages/app/ProjectsPage.jsx`:
    - Project portfolio dashboard with active, archived, and all tabs.
    - Live search filter by project name, description, and location.
    - Responsive card grid displaying project type icons, live active/archived badges, budget with currency formatting, and timeline dates.
    - "New Project" modal form with full validation and inline date ordering check.
    - Archive / Unarchive toggle actions.
    - Cascade deletion confirmation dialog with warning message (BR-P5).
    - Empty, loading skeleton, and error banner states.
  - `frontend/src/pages/app/ProjectDetailsPage.jsx`:
    - Executive banner with project type badge, active status pill, budget, location, and dates.
    - Breadcrumb navigation (`Projects / [Project Name]`).
    - Quick actions: Edit Project modal (with archived lock check), Archive/Unarchive, and Delete Project.
    - Tab navigation shell: Overview (pipeline readiness & governance rules), Documents (ready for Phase 4), Investigations (ready for Phase 6), Change Reports (ready for Phase 7).
  - `frontend/src/App.jsx`: Wired `/app/projects` and `/app/projects/:id` under `ProtectedRoute`.

### 2. Real Test & Verification Counts
- **Server Vitest:**
  - `tests/api/projects.test.js`: 9 passed
    - Unauthenticated access returns 401
    - Mutating requests without CSRF return 403
    - BR-P1 & BR-P3: validates limits and rejects invalid projectType
    - BR-P2: rejects completion date earlier than start date
    - BR-P7: currency validation and default USD
    - BR-P4: User B cannot read, update, or delete User A project (returns 404)
    - BR-P6: Archived project rejects edits with 409 but allows unarchive/delete
    - BR-P5: cascade deletes all child records in one database transaction
    - BR-P5 Transactional Rollback: forced failure during cascade delete preserves all records
  - `tests/api/auth.test.js`: 12 passed
  - `tests/api/middleware.test.js`: 11 passed
  - `tests/unit/math.test.js`: 17 passed
  - `tests/unit/ownership.test.js`: 7 passed
  - `tests/api/health.test.js`: 4 passed
  - `tests/unit/dates.test.js`: 8 passed
  - `tests/unit/env.test.js`: 2 passed
  - **Total Server:** 70 tests passed across 8 test suites (duration: 63.54s)
- **Frontend Vitest:**
  - `src/App.test.jsx`: 1 passed (duration: 183ms)
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1593 modules transformed, production bundle built in 14.64s (`dist/assets/index-BaZL0flI.js`)
- **Audit Reports:**
  - `server/`: 7 reported in dev/nested packages (vitest/tinypool, zod <4); breaking changes not auto-applied per AGENTS.md.
  - `frontend/`: 8 reported in dev/nested packages (vitest/tinypool, react-router <7.18); breaking changes not auto-applied per AGENTS.md.

### 3. Documentation & Package Versions Used
- `mongoose` v8.8.0 (multi-document transactions via `session.withTransaction`)
- `zod` v3.23.8 (ISO calendar date regex and enum validation)
- `lucide-react` v0.468.0 (architectural and portfolio iconography)

### 4. Decisions Made
- **Transactional Rollback Verification:** Built explicit unit/integration test using `options.simulateFailure` inside `session.withTransaction()` to prove atomic rollback across Project and Document collections.
- **Combined Auth & CSRF Cookie Handling in API Tests:** Ensured test helper registers both session cookie and CSRF cookie concurrently, matching browser cookie jar behavior.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Multi-currency conversion rates (spec explicitly mandates project-level currency label with no conversion).
- Project templates / cloning functionality (out of MVP scope).

---

## Phase 4 — Documents and Text Extraction

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Backend Storage & Extraction Engine (`server/`):**
  - `server/src/integrations/storage.js`: Official `@imagekit/nodejs` integration (v7.14.0) supporting private file uploads (`isPrivateFile: true`), short-lived signed download URLs (`getPrivateDownloadUrl`), and file deletions (`deletePrivateFile`), with complete in-memory mock isolation for automated tests per AGENTS.md rule 4.
  - `server/src/utils/sanitizer.js`: Filename sanitization function enforcing BR-D6 (strips directory traversal sequences `../`, HTML/script tags, and control characters; preserves file extension).
  - `server/src/middleware/upload.js`: Multipart memory storage upload middleware enforcing BR-D1:
    - File extension check (`.pdf`, `.docx` only)
    - MIME type validation (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
    - Binary magic bytes / file signature validation (`%PDF` for PDF, `PK\x03\x04` for DOCX)
    - File size limit (`MAX_UPLOAD_MB`, 413 `PAYLOAD_TOO_LARGE` on violation)
  - `server/src/services/textExtractionService.js`:
    - PDF text and page-count extraction via `pdf-parse` (v2.4.5)
    - DOCX text extraction via `mammoth` (v1.8.0)
    - Scanned/empty document detection throwing safe `no_extractable_text` error (BR-D9)
  - `server/src/services/documentService.js`:
    - `uploadDocument`: Implements strict BR-D3 sequence (validate -> upload private file -> create DB record -> extract text -> update status). Includes compensation hook: deletes uploaded cloud file if database record saving throws.
    - `listDocuments`: Scoped by `ownerId` and `projectId`.
    - `getDocumentById`: Enforces 404 on foreign document access (BR-D5).
    - `getDocumentDownloadUrl`: Generates short-lived signed download URL (BR-D5).
    - `deleteDocument`: Enforces BR-D7 (blocks deletion with 409 `CONFLICT` if document is referenced in any investigation). Deletes chunks and document record in one transaction, with post-commit cloud file cleanup.
    - `reprocessDocument`: Re-runs extraction machine for failed documents (BR-D4).
  - `server/src/controllers/documentController.js` & Routes (`server/src/routes/documents.js`):
    - `POST /projects/:projectId/documents` (upload with rate limiting and CSRF protection)
    - `GET /projects/:projectId/documents` (list project documents)
    - `GET /documents/:id` (fetch metadata and plain text)
    - `GET /documents/:id/download` (authenticated signed download link)
    - `DELETE /documents/:id` (transactional cascade delete with 409 investigation reference guard)
    - `POST /documents/:id/reprocess` (document retry endpoint)
- **Frontend Document Management (`frontend/`):**
  - `frontend/src/features/documents/DocumentsManager.jsx`:
    - Responsive document table showing document name, category badge, status badge (`ready`, `extracting`, `failed`), page count, and formatted file size.
    - Upload modal supporting PDF and DOCX files, category selection (`original_specification`, `revised_specification`, `original_contract`, `change_request`, `meeting_notes`, `supporting_document`), client-side 10MB size validation, and upload spinner.
    - Authenticated download action opening signed URL in a secure new tab.
    - Plain text preview modal (BR-D8: untrusted document text rendered strictly as plain text, never evaluated as HTML).
    - Cascade deletion confirmation dialog with conflict banner if referenced in investigations.
    - Empty and loading skeleton states.
  - `frontend/src/pages/app/ProjectDetailsPage.jsx`: Embedded `DocumentsManager` directly into the "Documents" tab shell.

### 2. Real Test & Verification Counts
- **Server Vitest:**
  - `tests/api/documents.test.js`: 9 passed
    - BR-D6: sanitizes malicious filenames stripping path traversal and script tags
    - BR-D1: rejects unsupported file extension, invalid MIME, and fake magic bytes
    - BR-D2: rejects invalid document category
    - BR-D3: compensation logic deletes uploaded ImageKit file if DB record creation fails
    - BR-D4 & BR-D8: uploads valid PDF, extracts text, and sets ready status
    - BR-D1 & BR-D4: uploads valid DOCX, extracts text, and sets ready status
    - BR-D9: scanned PDF with no extractable text sets failed status with reason no_extractable_text
    - BR-D5: authenticated download route returns signed URL; foreign user access returns 404
    - BR-D7: deleting a document referenced by an investigation is BLOCKED with 409
  - `tests/api/projects.test.js`: 9 passed
  - `tests/api/auth.test.js`: 12 passed
  - `tests/api/middleware.test.js`: 11 passed
  - `tests/unit/math.test.js`: 17 passed
  - `tests/unit/ownership.test.js`: 7 passed
  - `tests/api/health.test.js`: 4 passed
  - `tests/unit/dates.test.js`: 8 passed
  - `tests/unit/env.test.js`: 2 passed
  - **Total Server:** 79 tests passed across 9 test suites (duration: 100.63s)
- **Frontend Vitest:**
  - `src/App.test.jsx`: 1 passed (duration: 282ms)
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1594 modules transformed, production bundle built in 13.75s (`dist/assets/index-Creia_2s.js`)
- **Audit Reports:**
  - `server/`: 7 reported in dev/nested packages (vitest/tinypool, zod <4); breaking changes not auto-applied per AGENTS.md.
  - `frontend/`: 8 reported in dev/nested packages (vitest/tinypool, react-router <7.18); breaking changes not auto-applied per AGENTS.md.

### 3. Documentation & Package Versions Used
- `@imagekit/nodejs` v7.14.0 (official modern Node SDK for private upload and signed URLs)
- `pdf-parse` v2.4.5 (official PDFParse class for plain text and page metadata)
- `mammoth` v1.8.0 (official DOCX raw text extraction)
- `multer` v1.4.5-lts.1 (memory storage multipart upload handler)

### 4. Decisions Made
- **Test ImageKit Mocking:** Configured `storage.js` to automatically isolate ImageKit calls when `NODE_ENV === 'test'` unless `USE_REAL_IMAGEKIT` is explicitly enabled, fulfilling AGENTS.md rule 4.
- **Vitest Timeout Tolerance for Atlas:** Increased `testTimeout` and `hookTimeout` to 60000ms in `server/vitest.config.js` to ensure resilient test execution under Atlas network conditions during multi-file test suites.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- OCR text recognition for scanned PDFs and drawings (explicitly out of scope for MVP per MASTER_PROMPT section 14).
- In-browser visual PDF annotation / side-by-side highlighting (out of scope for MVP).

---

## Phase 5 — Chunking, Embeddings, Hybrid Retrieval

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Phase 5a: Pure Domain Functions (`server/src/domain/`):**
  - `server/src/domain/chunker.js`: Section- and clause-aware document chunking:
    - CSI MasterFormat 6-digit division recognition (`Section 08 51 13`, `Division 03 30 00`), clause identifiers (`Clause 4.2.1`, `Section 12.4`), and hierarchical sub-parts (`PART 1 - GENERAL`, `PART 2 - PRODUCTS`).
    - Sliding token window targeting ~500 tokens (~2000 chars) with configurable overlap (~100 tokens / 400 chars).
    - Page-tracking metadata preserving `pageNumber`, `sectionNumber`, `clauseNumber`, `charStart`, `charEnd`.
    - Sanitizes null bytes and invalid characters.
  - `server/src/domain/rrf.js`: Reciprocal Rank Fusion implementation:
    - Standard RRF formula: $RRF(d) = \sum_{m \in M} \frac{1}{k + rank_m(d)}$ with constant $k = 60$.
    - Deterministic tie-breaking on matching chunk IDs.
  - `server/src/domain/retrievalFilter.js`: Strict scoped filter builder (BR-C4):
    - Validates presence of both `ownerId` and `projectId`. Throws `Error('BR-C4: Retrieval query strictly requires ownerId and projectId')` if missing.
  - `server/src/domain/snippetVerifier.js`: Grounding and citation verification (BR-I8):
    - Strict substring match and normalized case/whitespace containment verification.
    - Prevents hallucinated citations by verifying that every cited evidence snippet actually exists in its corresponding chunk text.
- **Phase 5b: Embeddings, Indexing & Hybrid Retrieval Integration:**
  - `server/src/models/DocumentChunk.js`: Document chunk Mongoose schema with `ownerId`, `projectId`, `documentId`, `chunkIndex`, `text`, `embedding` (768-dim vector), `pageNumber`, `sectionNumber`, `clauseNumber`.
  - `server/src/ai/embeddingService.js`: Integration with Google GenAI (`@google/genai`) using `text-embedding-004` (768 dimensions), with deterministic mock fallback in test mode.
  - `server/src/ai/indexes/`:
    - `atlas-vector-index.json`: Atlas Vector Search definition on `DocumentChunk.embedding` (768 dims, cosine similarity, scoped on `ownerId` and `projectId`).
    - `atlas-search-index.json`: Atlas Search definition on `DocumentChunk.text` and metadata fields.
    - `README.md`: Step-by-step Atlas setup instructions.
  - `server/src/services/indexingService.js`:
    - Chunks document text, generates embeddings in batches.
    - Replaces chunks atomically in a database transaction (`BR-C3`), transitioning document status to `ready`.
  - `server/src/services/retrievalService.js`:
    - Executes vector similarity search and exact keyword search.
    - Graceful scoped fallback when Atlas Search indexes are pending creation.
    - Merges results via Reciprocal Rank Fusion (`RRF`, $k = 60$).
    - Strict cross-user isolation and project scoping (`BR-C4`).

### 2. Real Test & Verification Counts
- **Server Vitest (Phase 5 Suites):**
  - `tests/unit/chunking-retrieval.test.js`: 13 passed
    - Chunker splits empty text safely into empty array
    - Chunker preserves CSI MasterFormat section numbers (Section 08 51 13)
    - Chunker tracks clause headers and inherits parent sections
    - Chunker chunks long text into ~500-token chunks with overlap
    - RRF formula computes reciprocal scores with k=60
    - RRF deterministically breaks score ties
    - RetrievalFilter throws error when ownerId is missing (BR-C4)
    - RetrievalFilter throws error when projectId is missing (BR-C4)
    - RetrievalFilter produces valid Mongoose query with documentIds
    - SnippetVerifier returns true for exact substring match (BR-I8)
    - SnippetVerifier returns true for normalized whitespace/casing
    - SnippetVerifier returns false for hallucinated/altered text
    - SnippetVerifier returns false for missing or empty inputs
  - `tests/api/indexing-retrieval.test.js`: 4 passed
    - BR-C3: re-processing replaces chunks atomically in a transaction
    - BR-C4: Cross-user isolation: User A retrieval NEVER returns User B chunks even for identical document text
    - BR-C4: Retrieval strictly requires project scope and throws if ownerId or projectId is missing
    - Hybrid Retrieval: finds exact keyword matches (e.g. Section 08 51 13, 32 windows)
  - **Total Phase 5 Tests:** 17 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- `@google/genai` v0.1.2 (official Google GenAI SDK for `text-embedding-004`)
- MongoDB Atlas Vector Search documentation: `vectorSearch` aggregation stage syntax with numDimensions=768 and cosine similarity.

### 4. Decisions Made
- **Scoped Atlas Fallback:** Atlas `$vectorSearch` and `$search` return an empty array if the index is not yet built in the Atlas Web UI. `retrievalService.js` detects this and runs scoped in-database vector cosine similarity and regex token scoring, ensuring 100% test reliability and identical contract fulfillment in all environments.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Dynamic re-ranking cross-encoder model (Cohere or Gemini Flash reranker) for top-20 chunk reranking (out of scope for MVP).

---

## Phase 6 — Investigation Engine

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Phase 6a: Pure Domain Functions (`server/src/domain/`):**
  - `server/src/domain/inputHash.js`: Deterministic order-independent input hash function (`computeInvestigationInputHash`) calculating SHA-256 over `(projectId, originalDocumentId, revisedDocumentId, sorted supportingDocumentIds)` (BR-I3).
  - `server/src/domain/itemMatcher.js`: Item normalization (`normalizeItemKey`) and deterministic comparison (`matchItems`, `hasDeterministicChanges`). Strips common prefix keywords (`Section`, `Clause`, `Division`), normalizes alphanumeric identifiers, and compares quantities, materials, specs, dates, and prices deterministically.
  - `server/src/domain/changeClassifier.js`: Category classification (`classifyChange`, `detectAllChangeCategories`) enforcing BR-I11: `quantity_changed`, `material_changed`, `specification_changed`, `requirement_added`, `requirement_removed`, `date_changed`, `cost_changed`, `other`.
  - `server/src/domain/impactCalculator.js`: Impact calculation (`calculateFindingImpact`) strictly wiring to Phase 1 decimal math and UTC calendar date helpers:
    - `quantityDifference = revised - original`
    - `estimatedCostDifference = quantityDifference * unitPrice` (unitPriceOverride takes precedence over extracted; returns `null` with "Cannot estimate: no unit price supplied" when absent per BR-I7)
    - `priceDelta = (revisedUnitPrice - originalUnitPrice) * revisedQuantity`
    - `scheduleDifferenceDays = calendarDateDiffDays(origDate, revDate)`
    - Percent change via `percentChange`
  - `server/src/domain/confidence.js`: Deterministic confidence rules (`evaluateFindingConfidence`) adhering to BR-I10:
    - High: exact clause and quantity match with verified grounding evidence
    - Medium: AI-assisted matching with verified evidence or partial exact match
    - Low: AI-matched without verified evidence
    - Includes deterministic `uncertaintyNote`
  - `server/src/domain/approvalStatus.js`: Approval status rules (`evaluateApprovalEvidence`) adhering to BR-I9:
    - `approved_in_writing`, `pending_signature`, or `not_found` (never guessed or assumed)
  - `server/src/domain/investigationSchemas.js`: Zod schemas for the 4 LangGraph workflow stages.
- **Phase 6b: LangGraph Workflow, Endpoints & UI:**
  - `server/src/ai/investigationWorkflow.js`:
    - 4-stage LangGraph workflow (`understand` -> `detect` -> `analyzeImpact` -> `generateFindings`).
    - Untrusted document prompt isolation using clearly delimited `<DOCUMENT_DATA>` tags with explicit injection mitigation instructions (BR-I6, section 11.5).
    - Grounding snippet verification (`verifySnippetInChunk`) dropping fabricated citations and setting `evidence_not_found` flag (BR-I8).
    - In-memory mock support and offline deterministic fallback for test suites.
  - `server/src/models/Investigation.js` & `server/src/models/Finding.js`:
    - Investigation status lifecycle (`queued`, `running`, `completed`, `failed`).
    - Unique partial index on `inputHash` for active jobs (`queued`, `running`) preventing duplicate or concurrent race jobs (BR-I3).
  - `server/src/services/investigationService.js`:
    - `createInvestigation`: Validates project ownership, document categories (BR-I2: original specification/contract, revised specification/change request), ready status (BR-I1). Returns HTTP 200 with existing job on duplicate, HTTP 202 on new job.
    - `runInvestigation`: Executes workflow in-process and persists findings + completes investigation in ONE database transaction (section 8 #8).
    - `cleanupStaleInvestigations`: Startup task marking jobs stuck in `running` older than 15 minutes as `failed` with reason `interrupted` (BR-I4).
    - `getInvestigationFindings`: Reads findings and calculates all Section 7 derived values dynamically (derived values never stored).
    - `deleteInvestigation`: Cascade deletes investigation, findings, review actions, and reports in ONE database transaction.
  - `server/src/routes/investigations.js` & `server/src/controllers/investigationController.js`:
    - `POST /projects/:projectId/investigations` (rate-limited, CSRF protected, validated)
    - `GET /projects/:projectId/investigations`
    - `GET /investigations/:id`
    - `GET /investigations/:id/findings`
    - `DELETE /investigations/:id`
  - **Frontend UI (`frontend/`):**
    - `frontend/src/features/investigations/InvestigationsManager.jsx`: Embedded in Project Details "Investigations" tab. Shows investigation list, status telemetry, and "Start New Investigation" modal with document category filtering and validation.
    - `frontend/src/pages/app/InvestigationDetailsPage.jsx`: Full report view with live polling during workflow execution, mandatory limitations disclaimer banner (MASTER_PROMPT 12.4), aggregate telemetry cards, detected findings table, 3-tier information badges (Confirmed vs Estimate vs AI), approval grounding badges, and expandable citation drawer with verified quotes.
    - `frontend/src/pages/app/InvestigationsPage.jsx`: Portfolio overview of investigations by project.
    - `frontend/src/App.jsx`: Registered routes `/app/investigations` and `/app/investigations/:id`.

### 2. Real Test & Verification Counts
- **Server Vitest (Phase 6 Suites):**
  - `tests/unit/investigation-engine.test.js`: 31 passed
    - Input hash computation, order-independence, and input differences (BR-I3)
    - Item normalization, clause prefix stripping, deterministic matching
    - Change classification for quantity, material, specification, date, added, removed (BR-I11)
    - Fictional scenario "20 standard windows -> 32 premium insulated windows": +12 qty, 60% increase, cost diff $5,400 with unit price, null with message when no unit price (BR-I7)
    - Unit price override precedence over extracted price
    - Unit price delta when unit price itself changed
    - Calendar date difference in whole UTC days
    - Confidence rules evaluation (high, medium, low) (BR-I10)
    - Approval evidence evaluation defaults to `not_found` (BR-I9)
    - Stage Zod schema validation and rejection of invalid data
  - `tests/api/investigations.test.js`: 9 passed
    - BR-I1: requires documents to be in the same project, ready, and owned (foreign doc returns 404)
    - BR-I2: original must be original_specification or original_contract; revised must be revised_specification or change_request
    - BR-I3: double submit returns the same investigation (HTTP 200) and creates exactly one record
    - BR-I4: clean up stale running jobs on server startup
    - BR-I6, BR-I7, BR-I8, BR-I9, BR-I10: runs full workflow, calculates math, verifies citations, and produces findings
    - BR-I8: drops fabricated citations and flags evidence_not_found
    - Prompt injection fixture in document text does not alter permissions or instructions
    - BR-D7: Deleting a document referenced by an investigation is BLOCKED with 409 CONFLICT
    - Security: unauthenticated and foreign user requests are rejected (401 and 404)
  - **Total Phase 6 Tests:** 40 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1597 modules transformed, production bundle built cleanly in 38.89s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- `@langchain/langgraph` v1.7.3 (official LangGraph.js StateGraph and Annotation API)
- `@langchain/core` v1.1.28
- `@langchain/google-genai` v2.3.6
- `@google/genai` v3.1.0

### 4. Decisions Made
- **Transactional Findings Persistence:** Findings and investigation completion status are inserted/updated in one single database transaction session per MASTER_PROMPT section 8 #8.
- **In-process Background Runner with Idempotency:** Duplicate investigations are caught both at the service query level and at the database partial unique index level (Mongo error code 11000 fallback), guaranteeing race-condition safety under concurrent client requests.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Interactive visual graph view (React Flow / XYFlow) of the LangGraph state execution (spec: only if owner requests; omitted for simplicity).
- Multi-party approval assignment workflow (out of scope for MVP).

---

## Phase 7 — Findings Review, Reports, Dashboard

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Phase 7a: Review and Audit Ledger (`server/`):**
  - `server/src/models/ReviewAction.js`: Append-only audit model (`timestamps: { createdAt: true, updatedAt: false }`) tracking finding reviews, comments, and price overrides.
  - `server/src/services/reviewService.js`:
    - `updateFindingReviewStatus`: Updates finding status (`pending`, `approved`, `rejected`, `needs_further_review`) and logs audit entry in ONE database transaction (BR-R1, BR-R2).
    - `addFindingComment`: Appends comment (1–2000 chars) to audit history (BR-R3).
    - `overrideFindingUnitPrice`: Sets `unitPriceOverride` and logs audit entry in ONE transaction; dynamically recomputes estimated cost delta on read (Section 7, BR-R5). Rejects negative prices.
    - `getFindingHistory`: Retrieves chronological audit trail for a finding.
  - `server/src/routes/findings.js` & `server/src/controllers/reviewController.js`:
    - `PATCH /findings/:id/review` (authenticated, CSRF protected, validated)
    - `POST /findings/:id/comments` (validated 1–2000 chars)
    - `PATCH /findings/:id/price-override` (validated non-negative decimal)
    - `GET /findings/:id/history`
- **Phase 7b: Reports and Live Dashboard:**
  - `server/src/services/reportService.js`:
    - Server-side PDF generation using `pdfkit` (v0.20.2) implementing all 12 required sections in exact order (BR-RP2):
      1. Project Information
      2. Investigation Date
      3. Executive Summary
      4. Documents Compared
      5. Detected Changes
      6. Original vs Revised Values
      7. Supporting Evidence
      8. Potential Cost Impacts (Estimate)
      9. Potential Schedule Impacts
      10. Approval Findings
      11. Assumptions and Limitations (Section 12.4 text)
      12. Human Review Status ("Approved = reviewed by user; not legal determination")
    - Enforces generation only from `completed` investigations (BR-RP1).
    - Computes executive summary counts dynamically from findings at generation time (BR-RP3).
    - Stores PDF privately in ImageKit with signed download URL (BR-RP4).
    - Labels every cost delta as "Estimate" with price source (BR-RP5).
  - `server/src/services/dashboardService.js`:
    - Live database telemetry query calculating:
      - `totalProjects`, `activeProjects`
      - `totalInvestigations`
      - `changesAwaitingReview` (findings in pending/needs_further_review in user's completed investigations)
      - `reportsGenerated`
      - Last 5 recent projects & last 5 recent investigations
    - Counts computed dynamically on read, never stored (MASTER_PROMPT section 9).
  - `server/src/routes/reports.js` & `server/src/routes/dashboard.js`:
    - `POST /investigations/:id/reports`
    - `GET /reports/:id/download` (authenticated signed URL)
    - `GET /projects/:projectId/reports`
    - `GET /dashboard`
- **Frontend User Interface (`frontend/`):**
  - `frontend/src/features/review/ReviewControls.jsx`:
    - Status transition controls (Approve, Reject, Needs Review, Reset) with audit justification modal.
    - Prominent legal limitation notice: "Approved = reviewed by you; not a legal determination" (BR-R4).
    - PM comment modal for audit entries.
    - Unit price override modal with immediate recalculation.
    - Audit Trail Ledger slide-over drawer showing chronological history.
  - `frontend/src/features/reports/ReportsManager.jsx`:
    - Embedded into Project Details "Reports" tab.
    - Generate PDF report action with loading spinner.
    - Report history table with authenticated signed PDF download action.
  - `frontend/src/pages/app/ReportsPage.jsx`:
    - Global portfolio report browser across user's projects.
  - `frontend/src/pages/app/DashboardPage.jsx`:
    - Live executive dashboard wired to `GET /dashboard`.
    - Real-time KPI cards for Active Projects, Investigations, Changes Awaiting Review, Reports.
    - Recent projects & recent investigations feeds with direct navigation.
  - `frontend/src/pages/app/InvestigationDetailsPage.jsx`:
    - Embedded `ReviewControls` in each finding drawer.
    - "Generate PDF Report" top action button with direct download.

### 2. Real Test & Verification Counts
- **Server Vitest (Phase 7 Suite):**
  - `tests/api/review-reports-dashboard.test.js`: 8 passed
    - BR-R1: defaults to pending; rejects invalid review status
    - BR-R2: review status transition writes exactly one audit record in same transaction
    - BR-R3: comment length validation and history retrieval
    - BR-R5: unit price override recomputes estimate on read and rejects negative values
    - Security: foreign user access returns 404
    - BR-RP1: generating a report on non-completed investigation returns 400
    - BR-RP2, BR-RP3, BR-RP4: generates 12-section PDF report and stores record
    - Dashboard: calculates live metrics without storing derived counts (Section 9)
  - **Total Phase 7 Tests:** 8 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1600 modules transformed, production bundle built cleanly in 6.85s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- `pdfkit` v0.20.2 (official PDFKit document generator)

### 4. Decisions Made
- **Transactional Audit Preservation:** Status transitions and price overrides execute inside a single Mongoose transaction session together with the audit action, guaranteeing zero drift between findings and history.
- **Dynamic Cost Delta on Override:** Overriding a price stores only the fact of the override (`unitPriceOverride`); the mathematical cost delta is computed on read by `calculateFindingImpact` in pure decimal code.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Multi-currency conversion in executive reports (spec BR-P7 requires single project currency, no conversions).
- Export to spreadsheet (CSV/Excel) (spec section 14: exporting formats other than PDF are out of scope for MVP).





---

## Phase 8 — Public Interactive Demo

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Idempotent Demo Data Seed (`server/src/db/seedDemo.js`):**
  - Seeds the 3 canonical fictional construction projects (Section 13):
    1. *Commercial Plaza Tower (Demo)*: Commercial office tower (32 stories). Documents: `Plaza_Spec_Rev0_Original.pdf` (20 standard aluminum windows @ $450/unit), `Plaza_Spec_Rev1_Revised.pdf` (32 premium insulated aluminum windows @ $450/unit), `OAC_Meeting_Minutes_Week12.docx` (supporting change order discussion).
    2. *Riverside Residential Estates (Demo)*: 48-unit master planned townhome community. Documents: `Riverside_Prime_Contract.pdf` (48 Douglas Fir framing packages @ $12,000/frame), `Change_Request_02_Framing_Material.pdf` (substitution to cold-formed steel @ $14,500/frame).
    3. *Metro Tech Hub Renovation (Demo)*: Corporate HQ tenant improvement. Documents: `TechHub_Interior_Fitout_Spec.pdf` (16 acoustic panels @ $2,200/room), `TechHub_Fitout_Addendum_1.pdf` (emergency generator installation, decorative acoustic panel removal).
  - All demo entities marked `isDemo: true` and `ownerId: null`. Chunks chunked and indexed in parallel. Idempotent cleanup and re-creation ensures zero duplication on rerun. Never modifies user data.
- **Demo Service & Controllers (`server/src/services/demoService.js`, `server/src/controllers/demoController.js`):**
  - `listDemoProjects`: Unauthenticated retrieval of demo projects.
  - `getDemoProject`: Unauthenticated retrieval of single demo project with demo document summaries.
  - `listDemoDocuments`: Scoped demo documents listing.
  - `runDemoInvestigation`: Executes the real investigation engine on demo documents, attaches anonymous `demoSessionId` cookie, and stores demo investigation and findings.
  - `getDemoFindings`: Retrieves findings for a demo investigation, with complete Section 7 decimal calculations.
- **Demo Routes & Rate Limiting (`server/src/routes/demo.js`):**
  - `GET /demo/projects`
  - `GET /demo/projects/:id`
  - `GET /demo/projects/:projectId/documents`
  - `POST /demo/investigations` (rate-limited via standard demo rate limiter, bypassable in tests with header)
  - `GET /demo/investigations/:id/findings`
  - Strict isolation: mutating user endpoints reject demo entities (`ownerId: null`), demo endpoints never query or return non-demo data.
- **Frontend Interactive Demo Experience (`frontend/src/pages/public/DemoPage.jsx`):**
  - Full-featured interactive public demo page at `/demo` accessible without login.
  - 3 selectable sample project cards with metadata, badges, and document inventories.
  - Single-click "Run Live Investigation" button triggering real backend analysis.
  - Animated progress indicator showing investigation stages.
  - Interactive findings breakdown with 3-tier certainty badges (Confirmed vs Estimate vs AI-interpreted).
  - Evidence snippet drawer displaying ground-truth excerpts and CSI section references.
  - Prominent Call to Action ("Start Free Trial", "Register Free Account") to convert visitors.
  - Banner indicating read-only demo status.
- **Navigation Integration:**
  - Route `/demo` configured in `frontend/src/App.jsx`.
  - "Interactive Demo" button added to Landing Page hero and header nav.

### 2. Real Test & Verification Counts
- **Server Vitest (Phase 8 Suite):**
  - `tests/api/demo.test.js`: 5 passed (48.01s)
    - Seed Idempotency: seeds exactly 3 projects without duplicating on rerun
    - Visitor Access: lists demo projects and documents without authentication
    - Read-Only Guard: user mutating routes reject demo entities (401/404)
    - Demo Investigation Runner: executes real investigation and returns grounded findings (e.g. +12 qty diff, $5,400 cost diff)
    - Demo Rate Limiting: enforces limits when rate limit threshold is reached
  - **Total Phase 8 Tests:** 5 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1601 modules transformed, production bundle built cleanly in 7.14s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- Express 4.21.1
- Vitest 2.1.9
- Lucide React 1.16.0

### 4. Decisions Made
- **Parallel Chunk Indexing in Seed:** Concurrently indexing the 7 sample documents using `Promise.all` reduced demo seeding time from ~35s to ~5s.
- **Anonymous Session Isolation:** Demo investigations use a session cookie (`scopesentry_demo_session`) ensuring visitors only view their own demo runs while preventing persistent pollution.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Pre-cached investigation replays for instant zero-latency demo runs (out of scope for MVP).
- Custom visitor upload sandbox in demo mode (spec section 13: visitors select from pre-loaded scenarios only).


---

## Phase 9 — Tests Hardening, Security Review, Docs, Deployment

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Route-by-Route Authorization Matrix Security Audit (`server/tests/security/authMatrix.test.js`):**
  - Systematic route-by-route security test exercising all 3 principal actors (Visitor, User A [Owner], and User B [Wrong User / Attacker]):
    - **Visitor (Unauthenticated):** Asserts HTTP 401 across all protected routes (`/auth/me`, `/projects`, `/documents`, `/investigations`, `/findings`, `/reports`, `/dashboard`) while preserving HTTP 200 public access to `/demo/projects`.
    - **User B (Wrong User / Attacker):** Asserts HTTP 404 for all User A resources (`GET/PATCH/DELETE /projects/:A_id`, `/documents/:A_id`, `/documents/:A_id/download`, `/investigations/:A_id`, `/findings/:A_id`, `/reports/:A_id/download`), strictly validating owner-scoped queries (Rule 5.3).
    - **CSRF Protection Matrix:** Asserts HTTP 403 Forbidden on state-changing operations (`POST /projects`, `PATCH /projects/:id`, `PATCH /findings/:id/review`) without the `x-csrf-token` header, and confirms HTTP 200/201 when valid CSRF tokens are supplied.
- **End-to-End Full Flow Integration Suite (`server/tests/api/fullFlow.test.js`):**
  - Exercises the full customer lifecycle end-to-end across 10 discrete steps:
    1. Visitor browses demo projects.
    2. User registers new account, receives session cookie and CSRF token.
    3. User creates a commercial project.
    4. User creates and indexes original and revised specification documents.
    5. User executes an investigation through the LangGraph engine and receives grounded findings (+12 window quantity change, $5,400 cost difference).
    6. User reviews finding, approves it with justification, and appends an audit comment.
    7. User overrides unit price ($500) and verifies dynamic cost difference recalculation ($6,000) on read.
    8. User generates a 12-section PDF executive report and verifies authenticated signed download.
    9. User queries live dashboard metrics dynamically computed from the database.
    10. User deletes the project and verifies cascade deletion cleans up project, documents, chunks, investigations, findings, reviews, and reports.
- **Git History Secrets Audit:**
  - Full history search (`git log --all --full-history -- "**/server/env" "**/frontend/env" "**/.env*"`) confirmed 0 secrets or env files committed.
  - `.gitignore` enforces exclusion of `server/env`, `frontend/env`, and `.env*`.
- **Documentation & Deployment Guides (`README.md`):**
  - Updated comprehensive `README.md` with architecture details, business rules, environment variable names only (no secrets), local development instructions, testing commands, MongoDB Atlas Vector Search / Atlas Search JSON index specifications, and production deployment instructions for Render (backend) and Vercel (frontend).

### 2. Real Test & Verification Counts
- **Server Vitest (Phase 9 Suites):**
  - `tests/security/authMatrix.test.js`: 17 passed (55.49s)
    - Visitor 401 matrix across all routes
    - Public demo 200 access
    - User B 404 cross-tenant isolation matrix across projects, documents, investigations, findings, reports
    - CSRF 403 enforcement on state-changing routes
  - `tests/api/fullFlow.test.js`: 10 passed (26.03s)
    - 10-step complete end-to-end lifecycle verification
  - **Total Phase 9 Tests:** 27 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1601 modules transformed, production bundle built cleanly in 9.11s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- Supertest 7.0.0
- Vitest 2.1.9
- Express 4.21.1

### 4. Decisions Made
- **Transactional Cascade Audit Verification:** Step 10 of `fullFlow.test.js` verifies that cascade deletion cleanly removes all child records across all 7 collections, leaving no orphaned data.
- **Render Cold-Start Transparency:** Documented cold-start behavior and health check ping configuration in `README.md` per Phase 9 spec.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Multi-region database replication monitoring (out of scope for MVP).
- Automated CI/CD pipeline configuration (GitHub Actions workflow) with encrypted secrets (spec: owner sets production values in dashboards).


---

## Phase 10 — Animation, Polish & Accessibility (Final Phase)

**Status:** Completed & Verified  
**Date:** 2026-11-11

### 1. What was built
- **Motion & Accessibility Preferences (`frontend/src/index.css`):**
  - Configured `@media (prefers-reduced-motion: reduce)` global override to eliminate or minimize transitions, animations, and smooth scrolls for users with vestibular or motion sensitivities.
  - Implemented `.focus-ring` utility class providing accessible, high-contrast outline styling (`focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`).
- **Accessible Loading Skeletons (`frontend/src/components/common/Skeleton.jsx`):**
  - Created reusable, accessible skeleton loading components (`Skeleton`, `CardSkeleton`, `TableRowSkeleton`) with smooth pulse animation (respects `prefers-reduced-motion`).
- **Responsive Mobile Navigation & Polish (`frontend/src/layouts/AppLayout.jsx`, `frontend/src/layouts/PublicLayout.jsx`):**
  - Added slide-over mobile drawer navigation on `< md` screens with backdrop blur overlay and hamburger toggle button.
  - Ensured all header action buttons, navigation tabs, and interactive drawer triggers incorporate accessible focus states and aria attributes (`aria-label`, `aria-hidden`, `aria-modal`).
  - Added horizontal overflow protection (`overflow-x-auto`) for data tables and responsive layout constraints across mobile, tablet, and desktop viewports.
- **Strict Scope Preservation:**
  - Preserved all existing business logic, decimal calculations, and deterministic confidence scoring without introducing out-of-scope features or external visual libraries.

### 2. Real Test & Verification Counts
- **Server Vitest (Full Test Suite across all 10 Phases):**
  - **17 test files, 176 tests passed (100% green, 264.66s):**
    - `tests/unit/math.test.js`: 17 passed
    - `tests/unit/dates.test.js`: 8 passed
    - `tests/unit/env.test.js`: 2 passed
    - `tests/unit/ownership.test.js`: 7 passed
    - `tests/unit/chunking-retrieval.test.js`: 13 passed
    - `tests/unit/investigation-engine.test.js`: 31 passed
    - `tests/api/health.test.js`: 4 passed
    - `tests/api/middleware.test.js`: 11 passed
    - `tests/api/auth.test.js`: 12 passed
    - `tests/api/projects.test.js`: 9 passed
    - `tests/api/documents.test.js`: 9 passed
    - `tests/api/indexing-retrieval.test.js`: 4 passed
    - `tests/api/investigations.test.js`: 9 passed
    - `tests/api/review-reports-dashboard.test.js`: 8 passed
    - `tests/api/demo.test.js`: 5 passed
    - `tests/security/authMatrix.test.js`: 17 passed
    - `tests/api/fullFlow.test.js`: 10 passed
- **Static Checks & Linting:**
  - Server ESLint: 0 errors, 0 warnings
  - Frontend ESLint: 0 errors, 0 warnings
  - Frontend Vite build: 1601 modules transformed, production bundle built cleanly in 8.43s
- **Audit Reports:**
  - `server/`: 7 vulnerabilities in dev/nested packages (vitest/tinypool, zod <4); breaking upgrade not auto-applied.
  - `frontend/`: 8 vulnerabilities in dev/nested packages (vitest/tinypool, react-router <7.18); breaking upgrade not auto-applied.

### 3. Documentation & Package Versions Used
- Lucide React 1.16.0
- Tailwind CSS 3.4.19
- Vite 5.4.21

### 4. Decisions Made
- **Zero New Dependencies:** Implemented all Phase 10 motion, responsive drawers, and accessible focus states using existing Tailwind CSS and Lucide React utilities, ensuring zero bundle bloat and zero new security surface.

### 5. Suggestions (Not Built — Out of Scope for MVP)
- Dark mode theme toggle (design tokens and specification are tailored for high-contrast light mode with deep navy hierarchy).
- Push notification webhooks for background investigation completion (spec: in-browser polling is sufficient for MVP).
