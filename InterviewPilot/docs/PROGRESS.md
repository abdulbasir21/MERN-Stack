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
