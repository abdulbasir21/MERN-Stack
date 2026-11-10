# ARCHITECTURE — InterviewPilot

Everything in this file is a **suggestion**. If it conflicts with `docs/MASTER_PROMPT.md`, the master prompt wins. The agent may propose changes, but must ask the owner before deviating.

## 1. Suggested repo layout

(suggested; D-7 in MASTER_PROMPT: confirm `client/` and `server/` folder names)

```
interviewpilot/
  client/                  (suggested) Next.js App Router
    app/                   routes: (public), (auth), (app), admin
    components/            ui/ (shadcn), room/, reports/, admin/
    hooks/                 useMicrophone, useWaveform, useInterviewRoom
    lib/                   api client, auth helpers, format helpers
    styles/
    .env                   real values already exist (NEXT_PUBLIC_* only)
  server/                  (suggested) Express + TypeScript
    prisma/                schema.prisma, migrations/, seed.ts
    src/
      config/              env.ts (schema-validated), constants.ts (thresholds)
      modules/
        auth/  users/  documents/  rag/  interviews/  engine/
        voice/  reports/  quotas/  demo/  admin/
      middleware/          auth, requireRole, validate, rateLimit, errorHandler, requestId
      services/            gemini/, storage/ (ImageKit), email/, audit/
      lib/                 scoring.ts, chunking.ts, decideNext.ts, contextBuilder.ts (pure functions)
      routes/              router wiring only
    tests/                 unit/, api/, db/
    .env                   real values already exist
  shared/                  (suggested) zod schemas, enums, API types used by client and server
  design/                  Google Stitch design files (reference)
  docs/                    MASTER_PROMPT.md, ARCHITECTURE.md, PHASES.md, design-tokens.md, ANTIGRAVITY_PROMPTS.md
  AGENTS.md
  REVIEW_CHECKLIST.md
  .env.example files       (committed, names only)
```

Pure functions (scoring, chunking, `decideNext`, context builder, waveform mapping, quota math) live in their own files with no database or network access, so they can be unit-tested directly.

## 2. Backend layering (suggested)

`route → controller → service → repository (Prisma)`
- **Route**: wiring and middleware order only.
- **Controller**: parse validated input, call a service, shape the response. No business rules.
- **Service**: business rules, transactions, calls to Gemini/storage through adapters.
- **Repository**: Prisma queries, always scoped by owner when the resource is user-owned.
- **Adapters** (`services/gemini`, `services/storage`, `services/email`): one thin interface each, so a provider can be replaced and mocked in tests.
- **Quota guard**: a single `withAiUsage(operation, fn)` wrapper that every AI call must use (QTA-1). No service calls Gemini directly.

Middleware order (suggested): request id → security headers → CORS → body limits → rate limit → cookie parse → authenticate → requireRole → validate → handler → error handler.

## 3. API response and error format (suggested)

Success:
```json
{ "data": { }, "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```
Error:
```json
{ "error": { "code": "EXCEEDS_QUOTA_LIMIT", "message": "Plain message for the user", "details": { } } }
```
Every response carries an `X-Request-Id` header. `details` never contains secrets, stack traces or raw provider output.

Suggested error codes: `UNAUTHENTICATED`, `ACCOUNT_BLOCKED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `USER_QUOTA_EXCEEDED`, `EXCEEDS_QUOTA_LIMIT`, `GLOBAL_BUDGET_EXHAUSTED`, `AI_DISABLED`, `AI_UNAVAILABLE`, `DEMO_DISABLED`, `DEMO_LIVE_DISABLED`, `DEMO_RESTRICTED`, `INTERVIEW_ALREADY_ACTIVE`, `INQUIRY_LIMIT_REACHED`, `DOCUMENT_NOT_READY`, `INVALID_FILE`, `TRANSCRIPTION_FAILED`, `TTS_FAILED`, `INVALID_STATE_TRANSITION`.

## 4. Status codes (suggested)

| Code | Use |
|---|---|
| 200 / 201 | OK / created |
| 400 | bad request, invalid file |
| 401 | not logged in or session expired |
| 403 | logged in but not allowed, blocked account, demo restriction |
| 404 | not found **or not yours** |
| 409 | conflict (active interview, duplicate email, wrong state) |
| 422 | valid shape but rule violated (quota limit, document not ready) |
| 429 | rate limit or user quota exceeded |
| 502 | upstream AI/transcription failure |
| 503 | AI disabled, budget exhausted, quota tracking unavailable, demo disabled |

## 5. Auth flow (suggested)

1. Register → validate → hash with bcrypt (cost 12) → create user + profile in one transaction.
2. Login → generic error on failure → on success sign a JWT `{userId, tokenVersion}` → set httpOnly, Secure cookie.
3. Every request: verify JWT → load user from the database → reject if status is not `ACTIVE` or `tokenVersion` differs → attach `{id, role, isDemo}` to the request.
4. Password change/reset → increment `tokenVersion`.
5. Logout → clear cookie.
6. Cookie across sites (**Phase 0 Decision — Adopted**): Client (`client/next.config.ts`) proxies `/api/:path*` to `${NEXT_PUBLIC_API_URL}/api/:path*` via Next.js `rewrites()`, so the browser operates on a single first-party origin (`httpOnly: true`, `sameSite: 'lax'`, `secure: NODE_ENV === 'production'`). Direct API calls with `credentials: 'include'` from `CLIENT_ORIGIN` are also allowed by CORS.
7. CSRF (**Phase 0 Decision — Adopted**): `SameSite=Lax` cookie plus required custom header `X-Requested-With: InterviewPilot` enforced by server middleware on all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`).

## 6. Draft permission-string table (suggested)

Roles map to permission strings; middleware checks strings, not role names. An **anonymous** visitor (not logged in) holds no permission strings: only public pages, register/login/reset and "start demo" are open.

| Permission | USER | Demo | ADMIN |
|---|---|---|---|
| `profile:read:own`, `profile:update:own` | yes | read | yes |
| `document:create` | yes | no | yes |
| `document:read:own`, `document:delete:own` | yes | no | yes |
| `document:read:any`, `document:delete:any` | no | no | yes (audited) |
| `interview:create` | yes | yes (demo limits) | yes |
| `interview:read:own`, `interview:delete:own` | yes | yes | yes |
| `interview:read:any` | no | no | yes (audited) |
| `report:read:own` / `report:read:any` | yes / no | yes / no | yes / yes (audited) |
| `user:list`, `user:block`, `user:delete` | no | no | yes (audited) |
| `usage:read`, `audit:read` | no | no | yes |
| `settings:update`, `quota:update`, `ai:shutdown`, `demo:manage` | no | no | yes (audited) |

## 7. Data model conventions (suggested)

- Ids: `cuid` or `uuid` strings. Timestamps: `createdAt`, `updatedAt` on every table; all in UTC.
- Enums for statuses, roles, types, modes. Names in `UPPER_SNAKE_CASE`.
- Foreign keys always explicit. Cascade: user-owned data cascades from `User`; `AIUsageRecord` and document links on configuration use `SET NULL`; `AdminAuditLog.targetId` is a plain string with no FK.
- Indexes on every foreign key used in filters, plus the ones listed in MASTER_PROMPT section 8.
- JSON columns only for AI-shaped payloads (plan, criteria, summaries). Anything queried or counted gets real columns.
- pgvector: declare the column with Prisma `Unsupported("vector(N)")`, create the extension and the HNSW index in a hand-edited migration (`prisma migrate dev --create-only`, then edit the SQL), and use `$queryRaw` for similarity search. Check the current Prisma and Neon docs for the exact syntax and any preview features.
- Partial unique index for one active interview per user: raw SQL in a migration.
- Migrations use `DIRECT_URL` (non-pooled); the running app uses `DATABASE_URL` (pooled).

## 8. Transactions list (suggested implementation)

Use Prisma interactive transactions for the 12 operations in MASTER_PROMPT section 9. For quota reservation use one SQL statement of the form "update counter set reserved = reserved + n where used + reserved + n <= limit returning ..." and treat zero rows as a denial. Keep transactions short; never call Gemini inside a transaction.

## 9. Derived-value rule

If a value can be computed from stored rows (scores, durations, remaining time, remaining quota, dashboard stats), compute it in a pure function at read time and do not store it. Only store source data. Money is `Decimal`.

## 10. Interview runtime (suggested)

- One endpoint per user action, each idempotent by `clientRequestId`: start, submit answer, submit inquiry, retry, end, get state.
- The answer endpoint does the whole turn in one request: transcribe → save answer → evaluate + decide + next question (one call) → TTS → return `{runtimeState, caption, audio, progress}`. Expect 10–30 seconds; the frontend shows the AI_THINKING / GENERATING states while waiting.
- LangGraph.js runs inside the request; the graph checkpoint is saved to PostgreSQL after each node.
- Context builder produces the prompt (ENG-6). Add a dev-only log of prompt **size** (never content).

## 11. Frontend conventions (suggested)

- App Router with route groups: `(public)`, `(auth)`, `(app)`, `admin`. Admin layout re-checks the role by calling the API (UX only; the API enforces).
- Data fetching through one typed API client in `lib/`. No direct `fetch` scattered in components.
- Forms: schema validation using the shared schemas.
- State: React state and a small interview-room state machine (reducer) that mirrors the backend `runtimeState`; the backend value always wins.
- Components stay small; the room is split into `RecruiterPanel`, `CandidatePanel`, `Waveform`, `RoomControls`, `StatusBadge`.
- Styling from `docs/design-tokens.md` as Tailwind theme values; no hardcoded colors in components.
- Framer Motion only in Phase 15.
- Avatar: wrap the SDK in one component; keep SDK calls in one file; record exact API usage in "SDK notes" below.
- Microphone: one hook handles permission, stream, `AnalyserNode`, `MediaRecorder`, mute and disconnect.

## 12. Environment variable names

See MASTER_PROMPT section 4 (single source of truth). `.env.example` files list names only.

## 13. Libraries likely needed (suggested; owner must approve at Phase 0)

zod (validation), Prisma, bcrypt, jsonwebtoken, helmet, cors, express-rate-limit, cookie-parser, multer (uploads), a PDF text extractor, mammoth (DOCX text), `@google/genai` (check the current official Gemini SDK name in the docs), LangGraph.js (`@langchain/langgraph`), pino (logging), Vitest or Jest, supertest, Playwright (browser tests), `@interviewflowai/talking-avatar`, ImageKit Node SDK. The agent verifies each package name and version in the official docs before installing.

## 14. Technical risks to remember (suggested)

- **Free-tier limits**: requests per minute/day and tokens per minute can be hit even when your own quotas allow it. The owner enters provider limits in settings; handle provider 429 gracefully (no retry storms).
- **Latency**: one answer turn can take several seconds (transcribe + LLM + TTS). The UI must show clear thinking states.
- **Cold starts**: free Render and Neon can sleep; first requests are slow. Add a loading state and consider a health ping before the interview starts.
- **Cookies across sites**: see auth flow item 6.
- **Browser microphone/echo**: headphones recommended; echo cancellation helps but is not perfect. Because there is no voice interruption, the mic is off while the recruiter speaks.
- **Browser autoplay rules**: audio must start after a user gesture; the "Start Interview" click provides it.
- **Prisma and vectors**: raw SQL needed for vector queries.
- **Avatar SDK**: check bundle size, supported browsers and audio format in the docs before Phase 8.
- **Provider quotas are separate**: also configure budget alerts and quota caps on Google's side where available.

## 15. SDK notes (agent fills in during Phase 8)

Record here: Talking Avatar SDK version, exact methods used to load an avatar, play audio and lip-sync, the audio format required, doc page links, and the date checked. Same for the Gemini TTS, transcription and embedding calls (model names are in env, not here).

## 16. Ambiguous decisions fixed in advance (so nobody debates them)

- **Time**: store everything in UTC. A "day" and a "month" for quotas and dashboards are UTC calendar days and months.
- **Rounding**: round half up to integers for scores. Never round money; use `Decimal`.
- **Score scale**: 0–100 integers everywhere.
- **Durations**: whole seconds in storage and calculations; formatted as `mm:ss` in the UI.
- **Pagination**: 20 per page, newest first.
- **Text**: emails lowercase and trimmed; names and roles trimmed; max lengths from the schemas.
- **IDs in URLs** are never trusted for ownership; always check the owner.
- **Language**: English only.
