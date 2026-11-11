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
