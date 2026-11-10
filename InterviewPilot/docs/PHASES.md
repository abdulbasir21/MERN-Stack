# PHASES — InterviewPilot

Order: setup → auth/permissions/helpers → people → quota engine → documents → RAG → interview setup → engine → voice → room → reports → dashboards/demo → admin → public site → tests/docs/deployment → animation/polish last.

Rule IDs (for example `QTA-2`) are defined in `docs/MASTER_PROMPT.md`. Every rule ID appears in at least one phase below.

**★ = hardest phase.** Split into **(a)** pure functions + unit tests, then **STOP for owner review**, then **(b)** endpoints and screens.

**Every phase ends with:** type-check, lint and tests run with real output; a summary (what was built, files changed, tests run, what is incomplete, how to run and verify, questions); then STOP and wait for "approved". Every phase follows `AGENTS.md` (secrets, security, design, definition of done).

## Ambiguous decisions fixed in advance

- UTC for all days, months and timestamps. Round half up to integers. Scores are 0–100 integers. Money is `Decimal`.
- Durations in whole seconds; shown as `mm:ss`.
- Pagination: 20 per page, newest first.
- Emails lowercase and trimmed. English only.
- Another user's resource → 404.
- Folder names `client/` and `server/` are assumed; the agent confirms real names first (D-7).
- Open decisions D-1 to D-7 (MASTER_PROMPT section 16) must be asked about, not guessed, when their phase arrives: D-1 in Phase 1, D-2 in Phase 5, D-3 in Phase 4, D-4 in Phase 7, D-5 in Phase 10, D-6 in Phase 11.

---

## Phase 0 — Setup and foundation

**Build**
- Monorepo with `client/`, `server/`, `shared/`, `docs/`; TypeScript strict; ESLint and formatter; scripts for dev, build, type-check, lint, test.
- Confirm `server/.env` and `client/.env` exist (names only). Validated config module (`env.ts`) that prints names and OK/MISSING, never values. `.env.example` files with names only. `.gitignore` covers `.env`.
- Express app with health endpoint, request id, security headers, CORS to `CLIENT_ORIGIN`, central error handler with the standard error format.
- Next.js app with Tailwind and shadcn/ui; a page that calls the health endpoint through the API client. Decide and document the cookie approach (ARCHITECTURE section 5, item 6).
- Prisma connected to Neon; initial migration enabling `vector` extension; `DIRECT_URL` for migrations; test database config using `TEST_DATABASE_URL`.
- Write `docs/design-tokens.md` from `/design`.
- Propose the dependency list for owner approval.

**Rules involved:** SEC-4, SEC-6, SEC-7, SEC-8.

**Tests:** config fails clearly when a required variable is missing and never prints values; health endpoint; error handler hides stack traces; CORS rejects another origin; test DB connection uses the test database, not the main one.

**Done when:** front end calls the backend health check locally; migration applied; `npm` scripts pass; no secret values appear in any output or commit.

## Phase 1 — Authentication, roles, permissions, helpers

**Build**
- Register, login, logout, me, forgot password, reset password, change password (backend). Auth middleware reading status and `tokenVersion` from the database; `requireRole`/permission middleware; validation middleware; rate limiting; audit-log helper; seed script for quota profiles placeholder and the first ADMIN.
- Frontend: Login, Register, Forgot password, Reset password pages from the design, with validation and error/loading states.
- Ask the owner about D-1 (email provider) before building reset email delivery.

**Rules:** AUTH-1 to AUTH-8, SEC-1, SEC-2, SEC-3, SEC-5 (helper for later), QTA-13 (login and global rate limits), PUB-3.

**Tests:** register validation and duplicates; password hashed; login generic error; rate limit after 5 failures; blocked user rejected even with a valid old token; password change invalidates old tokens; reset token single-use and expires; role cannot be set from the client; USER gets 403 and anonymous gets 401 on an admin-only test route; logout clears the cookie (AUTH-8); the seed script creates the first ADMIN from `ADMIN_BOOTSTRAP_EMAIL` and no endpoint can grant ADMIN (AUTH-7).

**Done when:** a user can register, log in, log out and reset a password through the UI; wrong-role access is rejected.

## Phase 2 — Users, profile, onboarding, settings

**Build**
- Onboarding flow (skippable), profile read/update, password change page, privacy settings (delete interview/document/account controls wired as far as existing data allows), account deletion flow with the `DELETING` state and a storage-cleanup hook (no-op until Phase 4).
- Profile/Settings screens and sidebar navigation shell.

**Rules:** USR-1 to USR-4.

**Tests:** only fullName required; skip works; "me" routes ignore ids in the body; deletion needs the password, blocks login during `DELETING`, cascades data, keeps audit rows; user A cannot read or update user B's profile; only the three privacy controls exist (delete interview, delete document, delete account) and no other privacy toggles (USR-4).

**Done when:** onboarding saves to the database; deleting an account removes all of that user's rows.

## Phase 3 — Quota and AI budget engine ★

**(a) Pure functions + tests**
- Period math (UTC day/month), effective-limit calculation, reservation math, cost estimation with `Decimal`, warning flag, settle/release decision, idempotency-key helper.
- **Review stop.**

**(b) Database + endpoints**
- `UsageCounter`, `AIUsageRecord`, `QuotaConfiguration`, `UserQuota`, `ApplicationSetting` with seed defaults; the single `withAiUsage` wrapper implementing the 10-step order; atomic conditional reservation; lazy expiry of stale reservations; emergency shutdown flag; model price check; typed errors; a dev-only endpoint or script to simulate AI calls with a mock provider.

**Rules:** QTA-1 to QTA-8, QTA-10, QTA-12 (helper), QTA-13 (AI endpoint limits), QTA-15, SEC-1.

**Tests:** check order (a blocked user never reaches the quota step; no AI call on any denial); **20 parallel requests vs limit 5 → exactly 5 succeed**; fail closed when the counter update throws; `aiEnabled=false` blocks immediately; model without price blocked; price 0 allowed; failed provider call counts 1 request and releases tokens; expired reservations released; UTC day rollover; per-user override beats profile default; Decimal math has no float drift; the warning flag turns on at the threshold and is calculated, not stored (QTA-10).

**Done when:** a mock AI call cannot exceed any limit under parallel load, and every denial returns the right typed error without calling the provider.

## Phase 4 — Documents (upload, storage, extraction, summaries)

**Build**
- Upload endpoint (PDF/DOCX ≤ 5 MB, signature check), pasted-JD endpoint, private ImageKit storage through an adapter, authorized preview/download route, delete, list.
- Local text extraction; one AI summary call through `withAiUsage`; status flow; storage cleanup hook from Phase 2 now deletes files.
- Frontend: upload and paste UI with status and errors (used later in interview setup).
- Ask the owner about D-3 (shared analysis counter) before building.

**Rules:** DOC-1 to DOC-9, QTA-1 (document analysis uses it), SEC-5.

**Tests (storage and AI mocked):** wrong type/size/signature rejected; no public URL ever returned; user B gets 404 on user A's document; demo visitor blocked; limit of 5 per type; scanned PDF → `FAILED/NO_TEXT`; summary contains only facts present in the fixture CV (an unrelated project is not invented); re-using a READY document costs no analysis; delete removes file, chunks, summary and keeps interview history; a pasted JD over 15,000 characters is rejected (DOC-1); status moves only `UPLOADED → PROCESSING → READY | FAILED` (DOC-5).

**Done when:** a user uploads a CV, sees it become READY with a summary, and can only access their own files.

## Phase 5 — RAG (embeddings and retrieval) ★

**(a) Pure functions + tests**
- Deterministic chunking, context-size capping, retrieval-result shaping, dimension check.
- **Review stop.** Ask the owner about D-2 (corpus) here.

**(b) Database + services**
- `DocumentChunk` with `vector(EMBEDDING_DIMENSIONS)` and HNSW index via a hand-edited migration; embed chunks at document processing through `withAiUsage`; retrieval function filtered by `userId` and the interview's document ids; reprocess replaces chunks in one transaction.

**Rules:** RAG-1 to RAG-8, QTA-1.

**Tests:** same text → same chunks; **user B never retrieves user A's chunks even with identical text**; retrieval limited to the interview's own documents; top-k and character cap respected; dimension mismatch fails at startup; non-READY document blocks the interview (`DOCUMENT_NOT_READY`); embeddings mocked; retrieval is called only for inquiries and CV/JD-linked follow-ups, never for general questions or scoring (RAG-5); chunks are embedded once per document and every embedding call goes through `withAiUsage` (RAG-6).

**Done when:** retrieval on a fixture CV returns the relevant chunk and never another user's chunk.

## Phase 6 — Interview setup and plan generation

**Build**
- Setup screens for the four modes, shared fields, quota-aware disabled options, optional question count; device-check page shell may come in Phase 9.
- Create-interview endpoint: validate mode vs documents, compute effective limits, create `Interview` + `InterviewConfiguration` + counters in one transaction, one plan call (greeting, topics, criteria, first question) through `withAiUsage`.

**Rules:** SET-1 to SET-5, QTA-9, QTA-11, QTA-14.

**Tests:** each mode requires the right documents; GENERAL needs none; selecting 45 minutes on a 15-minute limit → 422 with allowed values; question default `floor(minutes/3)` capped; second active interview → 409; interview counts at creation; CV plan references a real CV item (fixture) and never an invented one; plan has no pre-generated follow-ups; AI mocked.

**Done when:** a user creates an interview in each mode and receives a saved plan within their quota.

## Phase 7 — Interview engine (LangGraph.js) ★

**(a) Pure functions + tests**
- `decideNext`, difficulty stepping, question de-duplication hash, status and runtime-state transition tables, time/question calculations, context builder with caps, rolling-summary size limit, AI-call counter.
- **Review stop.** Ask the owner about D-4 (inquiry scope) here.

**(b) Graph and endpoints**
- LangGraph nodes (`init`, `askQuestion`, `awaitAnswer`, `evaluateAndDecide`, `answerInquiry`, `closeInterview`) with state saved to PostgreSQL after each transition; endpoints for start, submit text answer, submit text inquiry, retry, end, get state (text-only; voice comes next); structured output validation with one retry; idempotency by `clientRequestId`; lazy timeout.

**Rules:** ENG-1 to ENG-10, QTA-12.

**Tests:** every transition in the tables allowed and every other rejected; terminal statuses immutable; `decideNext` for each branch (≥75, 40–74, <40, empty, limit reached, ≤60 s left); same question never repeated; **50-turn fixture stays under the 12,000-character cap**; call counter never exceeds 1 evaluation call per answer; invalid AI JSON → one retry then `ERROR`; same `clientRequestId` makes no new AI call; inquiry leaves question count and difficulty unchanged and respects the inquiry limit; prompt snapshots contain the tone rule and the "do not reveal the ideal answer" rule; `TIMED_OUT` and `ENDED_EARLY` statuses; state survives a server restart (reload from database).

**Done when:** a full text-only interview runs end to end (start → several adaptive turns → close) with state in PostgreSQL and mock AI.

## Phase 8 — Voice and avatar ★

**(a) Pure functions + tests**
- RMS → bar-height mapping with `SILENCE_THRESHOLD`, empty-answer detector, recorder-allowed-state function, audio upload validator, 120-second limit logic.
- **Review stop.** The agent reads the Talking Avatar SDK docs and fills "SDK notes" in ARCHITECTURE before part (b).

**(b) Backend voice + browser integration**
- Backend: audio upload endpoint (type and size checks, temp handling, deletion after transcription), transcription via the configured Gemini audio model, TTS endpoint via the configured TTS model, all through `withAiUsage`.
- Frontend: microphone hook (permission, echo cancellation, `AnalyserNode`, `MediaRecorder`, mute, disconnect), waveform component, avatar wrapper using the SDK.
- Browser tests with a fake microphone.
- Owner-approved **live smoke test**: one real TTS call and one real transcription call to confirm audio plays and lips move (report the call count).

**Rules:** VOI-1 to VOI-11.

**Tests:** silence → flat bars; speech fixture → bars move; recorder inactive in the four non-listening states (browser); no audio stored after a request (including failures); empty answer detection (<1 s, <2 words, silence only) makes no evaluation call; transcription failure → 502 and no answer saved; TTS failure retries once then `ERROR`; microphone disconnect discards the recording; the microphone is requested with echo cancellation and noise suppression and a recording stops and submits at 120 s (VOI-1); avatar plays real generated audio and mouth movement is driven by the SDK (manual check by the owner, recorded in REVIEW_CHECKLIST).

**Done when:** a recruiter question is spoken with real lip-sync, the waveform reacts to the real microphone and is flat in silence, and an answer is transcribed.

## Phase 9 — Live interview room

**Build**
- Device-check page (permission, input level test, output test, avatar preview, instructions, "no webcam needed", permission-denied help).
- Room layout from the design: recruiter panel, candidate panel (name, waveform, mic status, timer, progress), buttons and enable rules (ROOM-2), "Ask a Question" flow (ROOM-3), End Interview with confirmation, reload recovery, error mapping, network retry with the same `clientRequestId`.
- Frontend state machine mirroring the backend `runtimeState`.
- Ask the owner to confirm the ROOM-3 button behavior after a demo of it.

**Rules:** ROOM-1 to ROOM-7, ENG-2, ENG-10, VOI-11.

**Tests:** button enable table per state; reload restores state and shows the caption without new audio; replay costs one TTS call; inquiry returns to the same pending question; end interview at any state; failed submit retries 3 times idempotently; every error shows a plain message with no raw server text; browser test of a full short interview with mocked AI and a fake microphone.

**Done when:** the owner completes a real short interview in the browser (live smoke test, approved, call count reported).

## Phase 10 — Evaluation, reports, history ★

**(a) Pure functions + tests**
- Answer-score mean with half-up rounding, overall score, skill breakdown, STAR coverage, duration, history filters, progress comparison.
- **Review stop.** Ask the owner about D-5 (empty answers) here.

**(b) Persistence, endpoints, screens**
- Evaluation schema and prompt (no length/vocabulary bias, no inflation); immutable `AnswerEvaluation`; one report call from a compact digest through `withAiUsage`; `PENDING` report fallback with a "Generate report" button; report page, history page (search, filters, 20 per page), progress and comparison views.

**Rules:** EVL-1 to EVL-5, RPT-1 to RPT-7.

**Tests:** score math for fixtures (including rounding .5 up and empty answers as 0); overall and skill numbers are not stored in any table; evaluations cannot be updated; report created only when ≥1 answer was evaluated; quota exhausted at the end → interview ends, report `PENDING`, numbers still shown; one report per interview; history shows only own interviews (user B gets 404 on user A's report); filters and pagination; prompt snapshot contains the "do not score by length" rule; the question-by-question section is built from stored rows (RPT-4).

**Done when:** a finished interview produces a saved report with accurate numbers, visible in history.

## Phase 11 — User dashboard and demo experience

**Build**
- Dashboard (stats, recent interviews, trend, recommendations from the latest saved report — no AI call).
- Demo: ephemeral demo users, `DemoSession`, IP-hash limits, global demo cap, lazy purge, read-only sample fixtures labelled "Sample data", demo dashboard, demo interview (GENERAL only, no uploads, demo limits), enable/disable switches honored.
- Ask the owner about D-6 (sample CV mode) before building any such mode.

**Rules:** RPT-8, DEM-1 to DEM-7.

**Tests:** dashboard numbers equal database-derived values for a fixture user (no hardcoded values); dashboard makes zero AI calls; demo visitor A gets 404 on demo visitor B's interview; demo upload → 403; second demo interview from the same IP hash → blocked; global demo cap; `demoEnabled=false` → 503 and `liveDemoEnabled=false` → live start blocked but samples visible; expired demo users purged; sample fixtures never appear in admin real-user metrics.

**Done when:** a visitor can explore the demo and run one limited live demo interview without seeing anyone else's data.

## Phase 12 — Admin dashboard

**Build**
- Admin pages and APIs: overview, users, documents, interviews, usage, settings, audit log, demo management; emergency AI shutdown; range-validated settings; every sensitive action audited in the same transaction.

**Rules:** ADM-1 to ADM-10, DEM-6, QTA-4, QTA-10, SEC-1.

**Tests:** every admin route returns 401 for anonymous and 403 for USER and demo; admin metrics equal database values; block/unblock works and an admin cannot block self or another admin; document preview/download/delete writes an audit row and **fails if the audit write fails**; viewing another user's transcript is audited; settings changes store before/after without secrets; emergency shutdown blocks new AI calls immediately but non-AI pages work; usage page labels costs "ESTIMATED"; no password, token or key appears in any admin response; "reset demo data" deletes all demo users and sessions by cascade (DEM-6); changing demo enable/disable switches and limits takes effect on the next demo request (ADM-9).

**Done when:** the owner can monitor usage, change a quota, disable AI and see each action in the audit log.

## Phase 13 — Public website

**Build**
- Landing page (all sections), privacy and data-retention page, "Try Demo" and "Start Interview" links, responsive layouts, SEO basics.

**Rules:** PUB-1, PUB-2.

**Tests:** all CTAs link to the right routes; privacy page statements match actual behavior (no audio stored, 24-hour demo purge); responsive snapshot checks; no mock statistics shown as real.

**Done when:** a new visitor can understand the product, start a demo or register.

## Phase 14 — Security review, test hardening, docs, deployment

**Build**
- Full security review against SEC-1 to SEC-8 and the permission matrix; add missing tests; dependency audit; production configuration for Vercel, Render and Neon; provider-side budget limits checklist; README, deployment guide, backup/restore note; logging and error monitoring setup.

**Rules:** SEC-1 to SEC-8 (all), QTA-3 (re-verify fail-closed), all permission matrix rows.

**Tests:** run the full suite; wrong-role matrix across every route (anonymous, demo, USER on another user's data, blocked user, ADMIN); concurrency test for quotas again against the deployed-like setup; secret scan of the repository history and build output; `.env` not tracked.

**Done when:** the full suite passes with real output, a secret scan is clean, and the owner has a deployment guide that works from scratch.

## Phase 15 — Animation and polish (last)

**Build**
- Framer Motion transitions, micro-interactions, loading skeleton polish, final spacing/typography pass against `/design`. No new features.

**Rules:** none new; behavior must not change.

**Tests:** full suite still passes; reduced-motion respected; interview room performance not degraded.

**Done when:** the UI matches the design and no rule or test regressed.
