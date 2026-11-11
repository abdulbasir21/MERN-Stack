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
