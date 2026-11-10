# MASTER PROMPT — InterviewPilot

Source of truth for requirements. If files disagree: this file wins on **features and permissions**; the `/design` folder wins on **visuals**. Each fact lives in one file only.

Items marked **DEFAULT** are decisions made in advance so the agent does not debate them. The owner can change them (see Addendum, section 16). Items marked **OPEN** are not decided: the agent must ask the owner and must not guess.

---

## 1. Working rules (short form; full rules in `AGENTS.md`)

1. Work on ONE phase at a time. Stop at the end of each phase and wait for the owner to say "approved".
2. Do not add features, roles, modules or libraries that are not in this file. If something seems missing, ask.
3. Never claim tests passed without running them. Show real command output.
4. Never print, log, copy, summarize or commit values from `.env` files. Use variable names only.
5. Check current official docs before using Gemini, LangGraph.js, Talking Avatar SDK, ImageKit, Prisma, Neon or pgvector. Name the doc page and version used.
6. Keep code simple and readable. Do not invent SDK methods, endpoints, model names or config options.

## 2. Project overview

InterviewPilot is a web app for practicing job interviews by voice. A 3D human-like AI recruiter speaks questions (real generated speech, real lip-sync). The candidate answers with a microphone (no webcam). The AI evaluates answers, asks adaptive follow-ups, answers the candidate's questions on request, and produces a saved report. An owner-only admin dashboard manages users, documents, interviews, AI usage, quotas and demo access.

Core promises:
- Real backend, real database, real AI. No fake data in real pages. Sample data only in clearly labelled demo experiences and dev fixtures.
- Strict server-side AI cost protection. The owner must not lose free-tier quota to visitors.
- Private documents stay private.
- Light AI context: never send the whole conversation to the AI on every call.

Tagline: "Practice smarter. Interview with confidence."

## 3. Fixed tech stack

| Area | Choice |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion (last phase only), Lucide React |
| Backend | Node.js, Express.js, TypeScript, REST, service-layer modules |
| Repo | One TypeScript monorepo: `client/` (Next.js), `server/` (Express), `shared/` (types + validation schemas) — folder names are an assumption, see ARCHITECTURE |
| Database | PostgreSQL on Neon, Prisma ORM, **pgvector** extension for RAG (vector column via Prisma `Unsupported` type + raw SQL) |
| Auth | Email + password, bcrypt, JWT in httpOnly cookie, roles USER and ADMIN |
| AI | Google Gemini API (backend only); LangGraph.js for interview orchestration |
| Models | Cheapest **free-tier** Gemini text model, cheapest free-tier TTS model, a free-tier embedding model. The agent picks them from current official docs (models, pricing, rate limits), shows a shortlist with doc page + date checked, and the owner approves BEFORE first use. Names go in env variables, never hardcoded. Never fall back to a paid model automatically. |
| Avatar | `@interviewflowai/talking-avatar` (docs: https://talking-avatar.dev/). It plays the audio and does the lip-sync. No hand-made mouth animation. |
| Browser audio | `getUserMedia`, `MediaRecorder`, Web Audio API (`AnalyserNode`) |
| Files | ImageKit (private files, backend-authorized access) |
| Deploy | Vercel (client), Render (server), Neon (DB), GitHub |

Not used: LiveKit, WebRTC servers, other AI providers, other vector databases.

## 4. Environment variable NAMES (never values)

Real `.env` files already exist with working values: **`server/.env`** (backend) and **`client/.env`** (frontend). Agents use them. Only `.env.example` files (names + placeholders) are committed.

Server (`server/.env`):
`NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DEMO_IP_HASH_SECRET`, `ADMIN_BOOTSTRAP_EMAIL`, `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, `GEMINI_TRANSCRIBE_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE`, `GEMINI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `EMAIL_PROVIDER_API_KEY` (OPEN D-1), `EMAIL_FROM` (OPEN D-1), `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (optional, only if owner asks for Google sign-in).

Client (`client/.env`): `NEXT_PUBLIC_API_URL`. Only `NEXT_PUBLIC_*` variables are allowed in the client. No secret ever goes in a client variable.

If the names in the real `.env` differ from this list, the agent uses the names that already exist and asks before renaming anything.

## 5. Roles and permission matrix

Roles stored in the database: `USER`, `ADMIN`. "Demo visitor" is a `USER` with `isDemo = true`. "Anonymous" means not logged in. The role is read from the database on every request, never from the frontend or the token alone.

| Action | Anonymous | Demo visitor | USER | ADMIN |
|---|---|---|---|---|
| View landing, privacy, login, register | Yes | Yes | Yes | Yes |
| Start demo session | Yes | n/a | n/a | n/a |
| Register / login / reset password | Yes | No | No | No |
| Read/update own profile | No | Limited (no profile edit) | Yes | Yes |
| Upload documents | No | **No** | Yes | Yes |
| Create interview | No | Yes (demo limits) | Yes (user limits) | Yes (user limits) |
| Read own interviews, reports, documents | No | Own only | Own only | Own only |
| Read another user's interview/report/document | No | **No** | **No** | Yes, **audited** |
| Delete own interview, document, account | No | Interview only | Yes | Yes (cannot delete admin accounts) |
| List/search/block/unblock/delete users | No | No | No | Yes, audited |
| Preview/download/delete any document | No | No | No | Yes, audited |
| View AI usage, audit logs | No | No | No | Yes |
| Change quotas, demo settings, AI switches, emergency shutdown | No | No | No | Yes, audited |
| Grant ADMIN role | No | No | No | **No** (seed script only) |

Wrong-role requests: unauthenticated → 401; authenticated but not allowed → 403; someone else's resource id → **404** (do not reveal it exists).

## 6. Modules and business rules

Every rule has an ID. Every ID must be covered by a test listed in `docs/PHASES.md`.

### M1 — Authentication and accounts
- **AUTH-1** Register needs: email (valid, stored lowercase and trimmed, unique), password (at least 8 chars, at least 1 letter and 1 digit — DEFAULT), confirmPassword equal to password. Role, status, isDemo and tokenVersion can never be set by the client.
- **AUTH-2** Passwords are hashed with bcrypt (cost 12 — DEFAULT). Hashes are never returned or logged.
- **AUTH-3** Login success sets an httpOnly, Secure cookie with a JWT holding `userId` and `tokenVersion` (7-day expiry — DEFAULT). Wrong email or password → generic 401 "Invalid email or password" (no user enumeration). More than 5 failed attempts per email+IP in 15 minutes → 429.
- **AUTH-4** User status `BLOCKED` or `DELETING` cannot log in (403 `ACCOUNT_BLOCKED`) and existing tokens stop working on the next request (status is read from the database every request).
- **AUTH-5** Changing or resetting a password increments `tokenVersion`, invalidating all older tokens. Changing a password requires the current password.
- **AUTH-6** Password reset token: 32 random bytes, only its hash is stored, expires in 30 minutes, single use. "Forgot password" gives an identical response whether or not the email exists. Needs an email provider (OPEN D-1).
- **AUTH-7** The first ADMIN is created only by a seed script using `ADMIN_BOOTSTRAP_EMAIL`. No API can grant ADMIN.
- **AUTH-8** Logout clears the cookie.

### M2 — Users, profile, onboarding, settings
- **USR-1** Onboarding fields: fullName (required), statusType (`STUDENT` | `PROFESSIONAL`), experienceLevel (`BEGINNER` | `INTERMEDIATE` | `EXPERIENCED`), targetRole, careerGoals, preferredCategories (any of TECHNICAL, HR, BEHAVIORAL). Everything except fullName is optional and skippable. `onboardingCompletedAt` is set when finished or skipped.
- **USR-2** "Me" routes take the user id from the session only, never from the request body or URL.
- **USR-3** Account deletion requires the current password. Order: (1) mark user `DELETING` (login blocked), (2) delete the user's stored files, (3) hard-delete the user; all user-owned rows cascade. If step 2 fails the user stays `DELETING` and deletion can be retried. Audit rows keep the target id as a plain string.
- **USR-4** Privacy controls in the MVP are exactly: delete an interview (with transcript and report), delete a document, delete the account. No other toggles.

### M3 — Quota and AI budget (core backend responsibility)
Defaults (stored in the database, editable by ADMIN only; env/seed only supplies first values):

| Setting | Demo | Free user |
|---|---|---|
| Interviews per day | 1 | 2 |
| Max duration (minutes) | 5 | 15 |
| Max questions per interview | 3 | 10 |
| Max candidate inquiries per interview | 1 | 3 |
| Document analyses per day | 0 (uploads blocked) | 2 |
| Report generations per day | 1 | 2 |
| Concurrent active interviews | 1 | 1 |

Global settings: `aiEnabled` (true), `demoEnabled` (true), `liveDemoEnabled` (true), global monthly request cap, global monthly token cap, global monthly cost budget (USD, Decimal), warning threshold (80%), demo global interviews per day (20), demo interviews per IP hash per day (1), reservation TTL (300 s), per-model prices (USD per million input/output tokens; the owner enters them, `0` is valid for free-tier models). Provider limits (requests per minute/day) are entered by the owner after reading Google's current docs. The agent never invents numbers.

- **QTA-1** Before ANY AI operation, in this order: (1) authenticate, (2) account status ACTIVE, (3) per-user quota, (4) interview quota, (5) global budget, (6) `aiEnabled` and model availability, (7) reserve usage, (8) run the operation, (9) record actual usage, (10) settle/release the reservation. Failing step returns a typed error and **no AI call is made**.
- **QTA-2** Reservation is atomic: one conditional SQL update inside a transaction that succeeds only if `used + reserved + needed <= limit`. Test: 20 parallel requests against a limit of 5 → exactly 5 succeed, 15 are denied.
- **QTA-3** If usage tracking or the reservation transaction fails for any reason, **fail closed**: deny with 503 `AI_UNAVAILABLE` and make no AI call.
- **QTA-4** Emergency shutdown: `aiEnabled = false` blocks all AI operations and starting interviews immediately (read from the database on every reservation, no caching). Non-AI pages and APIs keep working.
- **QTA-5** A "day" is the UTC calendar day; a "month" is the UTC calendar month (DEFAULT).
- **QTA-6** Settling: use token counts reported by the provider. If missing, settle at the reserved estimate. If the call failed after reaching the provider, count 1 request and release the tokens. Reservations still `RESERVED` after the TTL are released lazily at the next quota check and marked `EXPIRED`.
- **QTA-7** When the global budget is exhausted: block new AI requests and new interviews, show a clear message, keep dashboard and history working, never switch to another (paid) model.
- **QTA-8** A model with no configured price entry is blocked (fail closed). Free-tier models need an explicit price of `0`.
- **QTA-9** Effective limits for an interview: `maxDuration = min(selected, allowed)`, `maxQuestions = min(selected, allowed)`. If the user selects more than allowed → 422 `EXCEEDS_QUOTA_LIMIT` listing allowed values (the UI disables those options).
- **QTA-10** The warning flag is calculated: `used / limit >= warningThreshold`. It is shown in admin, never stored.
- **QTA-11** At most ONE interview with status `IN_PROGRESS` per user (transaction check plus a partial unique index). A second start → 409 `INTERVIEW_ALREADY_ACTIVE`.
- **QTA-12** Duplicate protection: every state-changing interview request carries a `clientRequestId`. Repeating the same id returns the stored result and makes **no new AI call**.
- **QTA-13** Rate limits (DEFAULT): 100 requests/minute/IP overall; 20 requests/minute/user on AI endpoints; 5 login attempts as in AUTH-3. Exceeded → 429.
- **QTA-14** An interview counts against "interviews per day" when it is **created** (plan generated), even if abandoned.
- **QTA-15** A `UserQuota` row (admin-set) overrides the profile defaults for that user only.

### M4 — Documents
- **DOC-1** Document types: `CV`, `JD`. A JD may be uploaded as a file or pasted as text (max 15,000 characters).
- **DOC-2** Allowed files: PDF and DOCX, max 5 MB (DEFAULT). Checked by extension, MIME type and file signature. Anything else → 400 `INVALID_FILE`.
- **DOC-3** Uploads go through the backend only and are stored as **private** ImageKit files. No public URL is stored or returned. Preview/download happens only through an authorized backend route (owner, or ADMIN with an audit record).
- **DOC-4** Max 5 documents per type per user (DEFAULT). Demo visitors cannot upload (403 `DEMO_RESTRICTED`).
- **DOC-5** Status flow: `UPLOADED → PROCESSING → READY | FAILED`. Analysing a new document consumes one "document analysis" (CV and JD share the counter — DEFAULT, confirm D-3). Re-using a `READY` document costs no new analysis.
- **DOC-6** Text is extracted locally (no AI). One Gemini call turns it into a structured summary. CV: name, education, skills, technologies, projects, work experience, certifications. JD: required skills, responsibilities, technologies, experience requirements, expectations. The summary may contain only facts present in the text. Test: a fixture CV without a given project must not produce that project.
- **DOC-7** Deleting a document deletes the file, its chunks and its summary. Interviews that used it keep their questions and answers; the configuration link becomes empty and the UI shows "document removed".
- **DOC-8** Every document route checks `document.userId == actor.id` (or ADMIN on admin routes). Another user's document → 404.
- **DOC-9** A PDF with no extractable text → status `FAILED`, reason `NO_TEXT`. OCR is out of scope.

### M5 — RAG (retrieval over the candidate's own documents)
- **RAG-1** Chunking is a deterministic pure function with constants in one config file (suggested: 1,200 characters, 150 overlap). Same text → same chunks.
- **RAG-2** Each chunk stores `documentId` and `userId`. Retrieval always filters by `userId = actor` AND `documentId IN (the interview's CV/JD ids)`. Test: user B never gets user A's chunks, even with identical text.
- **RAG-3** Embeddings use the configured free-tier Gemini embedding model. The vector column dimension must equal `EMBEDDING_DIMENSIONS`; a startup check fails if they differ.
- **RAG-4** Retrieval returns top-k chunks (k = 4, DEFAULT) by cosine distance, capped at 3,000 characters in total.
- **RAG-5** RAG is used ONLY for: (a) candidate inquiries (ENG-10), (b) follow-ups about a CV project or JD requirement. It is not used for general questions or scoring.
- **RAG-6** Every embedding call goes through QTA-1. Document chunks are embedded once at processing time; a retrieval costs one query embedding.
- **RAG-7** The only corpus in the MVP is the candidate's own CV/JD. A curated question bank is **out of scope** unless the owner adds it (OPEN D-2).
- **RAG-8** If an interview's document is not `READY` (or has no summary), starting that interview is blocked with 422 `DOCUMENT_NOT_READY`.

### M6 — Interview setup and plan
- **SET-1** Modes: `GENERAL`, `CV_BASED`, `JD_BASED`, `CV_JD`. "Uploads are optional" means GENERAL needs no document. `CV_BASED` requires a READY CV; `JD_BASED` requires a READY JD (file or pasted); `CV_JD` requires both.
- **SET-2** Fields: role (2–100 chars), experienceLevel, type (`TECHNICAL` | `HR` | `BEHAVIORAL`), difficulty (`EASY` | `MEDIUM` | `HARD`), durationMinutes in {15, 30, 45}, optional questionCount (min 3). QTA-9 applies.
- **SET-3** If questionCount is omitted: `floor(durationMinutes / 3)`, then capped by the allowed maximum (calculated, never stored separately from the effective value on the configuration).
- **SET-4** Plan generation is ONE Gemini call returning: greeting, topics, evaluation criteria, first question. It must NOT pre-generate follow-ups. The plan is saved in `Interview.state`.
- **SET-5** In CV modes at least one topic must reference an item that exists in the CV summary. Never invent experience.

### M7 — Interview engine (LangGraph.js)
- **ENG-1** Graph nodes: `init`, `askQuestion`, `awaitAnswer` (external), `evaluateAndDecide`, `answerInquiry`, `closeInterview`. State is saved to PostgreSQL after every node transition. Memory-only state is not allowed.
- **ENG-2** Interview status: `CREATED → IN_PROGRESS → COMPLETED | ENDED_EARLY | TIMED_OUT | FAILED`. No other transitions. Terminal statuses never change. Runtime states and legal transitions:
  - `INITIALIZING → RECRUITER_SPEAKING | ERROR`
  - `RECRUITER_SPEAKING → WAITING_FOR_CANDIDATE | INTERVIEW_COMPLETED | ERROR`
  - `WAITING_FOR_CANDIDATE → CANDIDATE_LISTENING | ERROR`
  - `CANDIDATE_LISTENING → PROCESSING_ANSWER | WAITING_FOR_CANDIDATE | ERROR`
  - `PROCESSING_ANSWER → AI_THINKING | WAITING_FOR_CANDIDATE | ERROR`
  - `AI_THINKING → GENERATING_NEXT_QUESTION | RECRUITER_SPEAKING | INTERVIEW_COMPLETED | ERROR`
  - `GENERATING_NEXT_QUESTION → RECRUITER_SPEAKING | INTERVIEW_COMPLETED | ERROR`
  - `ERROR → (retry) WAITING_FOR_CANDIDATE | RECRUITER_SPEAKING | INTERVIEW_COMPLETED`
  - `End Interview` from any non-terminal state → `INTERVIEW_COMPLETED` with status `ENDED_EARLY`.
  - Listening has a sub-mode `listeningMode = ANSWER | QUESTION` (no extra states).
- **ENG-3** `decideNext(state, evaluation)` is a pure function returning exactly one of `FOLLOW_UP_DEEPER`, `CLARIFY_SIMPLER`, `NEXT_TOPIC`, `CLOSE`:
  - If `questionsAsked >= maxQuestions` or `timeRemaining <= 60 s` → `CLOSE`.
  - Empty answer or "cannot answer" → `NEXT_TOPIC` (never repeat the same question).
  - Answer score >= 75 → `FOLLOW_UP_DEEPER` and raise difficulty one step (max HARD).
  - Answer score 40–74 → `NEXT_TOPIC`, difficulty unchanged.
  - Answer score < 40 → `CLARIFY_SIMPLER` and lower difficulty one step (min EASY), at most once per topic, then `NEXT_TOPIC`.
  - Follow-ups count toward the question limit. Thresholds are constants in one config file.
- **ENG-4** The same question is never asked twice in one interview (normalized text hash, unique per interview).
- **ENG-5** Prompts must contain the tone rule: respectful, never embarrassing or discouraging, especially when the candidate cannot answer. Test checks the prompt text.
- **ENG-6** Context builder (pure function) sends ONLY: instructions and rubric, interview configuration, CV/JD summaries (capped), a rolling summary (max 1,200 characters), the last 3 question/answer pairs (each answer cut to 1,500 characters), retrieved chunks (RAG-4), and the current question. Never the full history. Total prompt cap `PROMPT_MAX_CHARS` = 12,000 (DEFAULT). Test: a 50-turn fixture stays under the cap.
- **ENG-7** AI call budget per candidate answer on the normal path: at most 1 transcription call, 1 combined "evaluate + decide + rolling summary + next question" call, and 1 TTS call per recruiter utterance. Test with a counting mock.
- **ENG-8** AI output is JSON validated against a schema. Invalid → one retry (counted in quota). Still invalid → runtime state `ERROR` with a Retry button; no automatic loops.
- **ENG-9** The server owns time. `startedAt` is stored; elapsed and remaining time are calculated from it. At `maxDuration` no new question is generated and the status becomes `TIMED_OUT`. Normal close (question limit or `CLOSE`) → `COMPLETED`. User ends → `ENDED_EARLY`. A report is created only if at least one answer was evaluated. Interviews left `IN_PROGRESS` past `maxDuration + 10 minutes` become `TIMED_OUT` lazily when next accessed.
- **ENG-10** Candidate inquiries ("Ask a Question" button): the candidate asks by voice, it is transcribed, retrieval runs (RAG-4), the AI answers in at most 600 characters, the recruiter speaks the reply, and the **same pending question** remains. An inquiry does not count as a question and does not change difficulty. It counts against the inquiry limit (over limit → 422 `INQUIRY_LIMIT_REACHED`). The AI never reveals the ideal answer to the pending question (prompt rule, tested). DEFAULT scope: any topic, kept short; OPEN D-4 lets the owner restrict it to interview-related topics.

### M8 — Voice and avatar
- **VOI-1** Microphone request uses echo cancellation and noise suppression. `MediaRecorder` starts only in `CANDIDATE_LISTENING`. A single recording stops automatically at 120 seconds and is submitted.
- **VOI-2** Audio upload max 5 MB; allowed types webm/ogg/mp4 audio; validated on the server.
- **VOI-3** Audio is never stored. It is handled in memory or a temp file and deleted after transcription succeeds or fails. Only the transcript is saved. Test: no audio row or file remains.
- **VOI-4** Empty answer = recording shorter than 1 second, or transcript with fewer than 2 words, or silence only. It is marked `isEmpty`, and **no evaluation AI call is made**.
- **VOI-5** Transcription uses the configured Gemini audio capability. Failure → 502 `TRANSCRIPTION_FAILED`, nothing is recorded as an answer, state returns to `WAITING_FOR_CANDIDATE`.
- **VOI-6** For each recruiter utterance the backend generates speech with the configured TTS model and returns it in the format the Talking Avatar SDK needs (read the SDK docs). The text is always shown as a caption. TTS failure → retry once, then `ERROR` with a Retry button. No silent fallback to browser voices (lip-sync needs the real audio).
- **VOI-7** The Talking Avatar SDK plays the audio and does the lip-sync. The agent records the exact SDK calls used, with the doc version, in `docs/ARCHITECTURE.md` ("SDK notes"). No fake lip animation.
- **VOI-8** Waveform comes from a live `AnalyserNode`. A pure function maps RMS → bar heights. RMS below `SILENCE_THRESHOLD` (0.01 — DEFAULT) renders flat bars. No idle animation. Muted or idle → flat.
- **VOI-9** Mute disables the audio track. Finishing an answer that contains only silence → empty answer (VOI-4).
- **VOI-10** Microphone disconnect (`track` ended) discards the current recording, shows "Microphone disconnected", and offers Reconnect.
- **VOI-11** While the state is `RECRUITER_SPEAKING`, `PROCESSING_ANSWER`, `AI_THINKING` or `GENERATING_NEXT_QUESTION`, the recorder is not recording. No voice interruption (barge-in) exists. Browser test checks the recorder state.

### M9 — Live interview room
- **ROOM-1** The backend is the source of truth. Every state-changing response returns the new `runtimeState` and the next payload. Reloading the page restores state from `GET` interview. No WebSocket/LiveKit: request/response only.
- **ROOM-2** Layout: left = AI Recruiter avatar with state label (speaking / thinking / listening); right = candidate name, waveform, mic status, elapsed time, progress ("Question X of N"). No webcam. Buttons and when they are enabled:

| State | Mute | Finish Answer | Ask a Question | End Interview |
|---|---|---|---|---|
| RECRUITER_SPEAKING | yes | no | no | yes |
| WAITING_FOR_CANDIDATE | yes | no | no | yes |
| CANDIDATE_LISTENING | yes | yes | yes (if inquiries left) | yes |
| PROCESSING / AI_THINKING / GENERATING | no | no | no | yes |
| ERROR | no | no | no | yes (plus Retry) |

- **ROOM-3** "Ask a Question" (DEFAULT, confirm at Phase 9 review): pressing it during `CANDIDATE_LISTENING` discards the unsent recording and restarts recording with `listeningMode = QUESTION`. "Finish Answer" then submits it as an inquiry. After the recruiter's reply the same main question stays pending and the mic reopens in `ANSWER` mode.
- **ROOM-4** End Interview works at any time, asks for confirmation, sets `ENDED_EARLY`, releases unused reservations, and creates a report if at least one answer was evaluated.
- **ROOM-5** On reload the recruiter text is shown as a caption without regenerating audio. A "Replay question" button costs one TTS call.
- **ROOM-6** Every error maps to a plain message (no stack traces, keys or raw server text): microphone denied, microphone lost, audio playback failed, transcription failed, TTS failed, AI error, quota exceeded, budget exhausted, network lost, session expired.
- **ROOM-7** A failed submit keeps the recording in memory and retries up to 3 times with the same `clientRequestId` (idempotent, QTA-12).

### M10 — Evaluation, reports, history
- **EVL-1** Criteria are scored 0–100 integers. TECHNICAL: technical accuracy, conceptual understanding, depth, problem solving, practical experience, communication. HR/BEHAVIORAL: relevance, clarity, confidence reflected in content, communication, structure, examples and reasoning. BEHAVIORAL also records which STAR parts are present (situation, task, action, result) as booleans.
- **EVL-2** Answer score = mean of its criteria, rounded half up to an integer. It is **calculated, not stored**.
- **EVL-3** Evaluation output (schema validated): criteria scores, what was correct, what was missing, strengths, weaknesses, suggested improvements, ideal answer, follow-up recommendation, short reasoning. The prompt must say: do not score by length or vocabulary; do not inflate scores. Test checks the prompt text.
- **EVL-4** An empty answer gets 0 on every criterion, no AI call, and counts in averages (DEFAULT, confirm D-5).
- **EVL-5** `AnswerEvaluation` rows are immutable once saved.
- **RPT-1** Overall score = mean of all answer scores (including empty ones), rounded half up. Skill breakdown = mean per criterion across answers that have it. STAR coverage = share of behavioral answers containing each part. All **calculated at read time, never stored**.
- **RPT-2** The report narrative (summary, strengths, weaknesses, recommendations, study topics) is ONE Gemini call from a compact digest of stored evaluations (not full transcripts) and uses a "report generation" quota. Stored in `InterviewReport`. If quota or AI is unavailable, the interview still ends, the report status is `PENDING`, numbers still show, and the user can press "Generate report" later.
- **RPT-3** One report per interview. Regeneration is out of scope.
- **RPT-4** Question-by-question section comes from stored rows: question, transcript, score, evaluation, missing concepts, suggested answer.
- **RPT-5** Duration = `endedAt − startedAt` in whole seconds (calculated).
- **RPT-6** History: own interviews only, newest first, 20 per page; search by role text (case-insensitive contains); filter by role, type, date range (UTC).
- **RPT-7** Progress tracking: list of (date, overall score) for completed interviews, and a comparison of two selected interviews' skill breakdowns.
- **RPT-8** The dashboard makes **zero AI calls**. Its recommendations are read from the latest saved report.

### M11 — Demo
- **DEM-1** "Try Demo" creates an ephemeral `User` (`isDemo = true`, role `USER`, no password) and a `DemoSession` (expires after 24 hours — DEFAULT). No shared writable demo account exists.
- **DEM-2** `demoEnabled = false` → 503 `DEMO_DISABLED`. `liveDemoEnabled = false` → sample content works, starting a live interview → 403 `DEMO_LIVE_DISABLED`.
- **DEM-3** Demo abuse limits: demo interviews per IP hash per day (default 1) and global demo interviews per day (default 20). Only an HMAC hash of the IP is stored (`DEMO_IP_HASH_SECRET`).
- **DEM-4** Demo live interviews: GENERAL mode only; no uploads; demo limits from M3. A sample-CV demo mode is OPEN D-6 and not built unless approved.
- **DEM-5** Sample history, reports and statistics are read-only fixtures (not database rows), labelled "Sample data". Test: demo visitor A cannot read demo visitor B's interview (404).
- **DEM-6** Admin "reset demo data" deletes all demo users and sessions (cascade).
- **DEM-7** Expired demo users are purged lazily when a new demo session is created (up to 50 per call). No cron job.

### M12 — Admin
- **ADM-1** All `/admin` pages and `/api/admin/*` require `ADMIN`, checked on the server from the database. USER → 403, anonymous → 401. Hiding a button is never enough.
- **ADM-2** Overview metrics are defined in section 7.
- **ADM-3** Users: list (20 per page), search by email/name (contains), filter by status/role/isDemo, view profile, interview count, AI usage; block/unblock; delete via the USR-3 flow. An admin cannot block or delete themselves or another admin.
- **ADM-4** Documents: list metadata (name, owner, type, date, size, processing status, storage status); preview/download via backend stream; delete. Every preview, download and delete writes an `AdminAuditLog` row **in the same request**; if the audit write fails the action is denied (fail closed).
- **ADM-5** Interviews: list with user, type, role, date, duration, question count, status, score, AI usage. Viewing another user's transcript or report is audited. No endpoint exists for live microphone audio.
- **ADM-6** Usage: aggregates from `AIUsageRecord` by model, user, interview, day, month, operation. Costs are labelled **ESTIMATED** (tokens × owner-entered prices). No provider-billing import in the MVP.
- **ADM-7** Settings: edit quotas, demo limits, `aiEnabled`, budgets, model prices, thresholds. Values are range-validated. Every change is audited with before/after (never secrets). "Emergency AI shutdown" is a single action that sets `aiEnabled = false`.
- **ADM-8** Audit log: read-only list, paginated.
- **ADM-9** Demo management: enable/disable demo, enable/disable live demo, limits, reset, usage.
- **ADM-10** Admin pages never show passwords, tokens, API keys or env values.

### M13 — Public website
- **PUB-1** Landing page sections: navigation, hero ("Practice smarter. Interview with confidence."), Start Interview and Try Demo buttons, How It Works, feature highlights, interview room preview, supported interview types, benefits, FAQ, footer.
- **PUB-2** A privacy and data-retention page stating: audio is not stored; transcripts and reports are kept until the user deletes them or the account; documents are kept until deleted; an admin may access documents or transcripts for support and every such access is logged; demo data is purged after 24 hours.
- **PUB-3** Login, Register, Forgot password, Reset password pages with validation, clear errors and loading states. Google sign-in is optional and NOT built unless the owner asks.

## 7. Dashboards and reports (definitions)

All numbers come from real database rows (never hardcoded) and are calculated at read time.

User dashboard:
- Total interviews = user's interviews with status other than `CREATED`.
- Completed interviews = status `COMPLETED`.
- Average score = mean of overall scores (RPT-1) of `COMPLETED` interviews, rounded half up; `null` if none.
- Recent trend = overall scores of the last 10 `COMPLETED` interviews, oldest to newest.
- Recent interviews = last 5 interviews with role, type, date, duration, score and a "View report" link.
- Recommendations = from the latest saved report (RPT-8).

Admin overview:
- Total registered users = non-demo users. Active users = non-demo users with `lastLoginAt` in the last 7 days.
- Demo sessions = `DemoSession` rows not expired.
- Total interviews / interviews today (UTC) are shown separately for real and demo.
- Uploaded documents = count of `UploadedDocument` rows.
- AI consumption and remaining budget = from `UsageCounter` (`remaining = budget − used − reserved`, Decimal math).

## 8. Data model (entities and relationships)

| Entity | Key fields | Relations / rules |
|---|---|---|
| User | id, email (unique), passwordHash (nullable for demo), role, status (`ACTIVE`/`BLOCKED`/`DELETING`), isDemo, tokenVersion, lastLoginAt | 1–1 UserProfile |
| UserProfile | fullName, statusType, experienceLevel, targetRole, careerGoals, preferredCategories, onboardingCompletedAt | FK User, cascade |
| PasswordResetToken | tokenHash (unique), expiresAt, usedAt | FK User, cascade |
| UploadedDocument | type, sourceKind (`FILE`/`PASTED`), originalName, mimeType, sizeBytes, storageFileId, status, failureReason, summaryJson, pastedText | FK User, cascade; index (userId, type) |
| DocumentChunk | documentId, userId, chunkIndex, content, embedding vector(`EMBEDDING_DIMENSIONS`) | FK Document and User, cascade; unique (documentId, chunkIndex); vector index |
| Interview | mode, status, runtimeState, state (JSON: plan, difficulty, topicsCovered, rollingSummary, pending question, listeningMode), startedAt, endedAt, endReason | FK User, cascade; index (userId, createdAt); partial unique index on `userId` where status `IN_PROGRESS` |
| InterviewConfiguration | role, experienceLevel, type, startDifficulty, durationMinutes, maxQuestions (effective), cvDocumentId, jdDocumentId | 1–1 Interview, cascade; document FKs `SET NULL` |
| InterviewQuestion | orderIndex, kind (`MAIN`/`FOLLOW_UP`/`CLARIFICATION`), topic, difficulty, text, textHash | FK Interview, cascade; unique (interviewId, orderIndex) and (interviewId, textHash) |
| CandidateAnswer | transcript, isEmpty, durationSeconds, clientRequestId | 1–1 Question, cascade; unique (interviewId, clientRequestId) |
| AnswerEvaluation | criteriaScores (JSON), correct, missing, strengths, weaknesses, improvements, idealAnswer, followUpRecommendation, reasoning | 1–1 Answer, cascade; immutable |
| CandidateInquiry | questionId (pending), transcript, reply, clientRequestId | FK Interview, cascade; unique (interviewId, clientRequestId) |
| InterviewReport | status (`PENDING`/`READY`/`FAILED`), summary, strengths, weaknesses, recommendations, studyTopics, generatedAt | 1–1 Interview, cascade |
| AIUsageRecord | operation, model, status (`RESERVED`/`SETTLED`/`RELEASED`/`FAILED`/`EXPIRED`), reserved and actual requests/tokens, TTS units, costEstimated (Decimal) | userId and interviewId `SET NULL`; indexes (userId, createdAt), (model, createdAt) |
| UsageCounter | scopeType (`GLOBAL`/`USER`), scopeId, periodType (`DAY`/`MONTH`), periodStart, requests/tokens used and reserved, costUsed (Decimal), interviewsCreated, documentAnalyses, reportsGenerated, demoInterviewsCreated | unique (scopeType, scopeId, periodType, periodStart) |
| QuotaConfiguration | profile (`DEMO`/`FREE_USER`) and limits from M3 | unique profile |
| UserQuota | userId and nullable override fields | 1–1 User, cascade |
| ApplicationSetting | key, value (JSON): `aiEnabled`, `demoEnabled`, `liveDemoEnabled`, global caps, thresholds, model prices | unique key |
| DemoSession | userId, ipHash, expiresAt | 1–1 User, cascade |
| AdminAuditLog | actorId, action, targetType, targetId (plain string, no FK), metadata (JSON, no secrets), createdAt | never deleted with the user |

`UsageCounter` is an addition to the original entity list (needed for atomic reservations); no other tables beyond this list.

## 9. Transactions and derived values

**Must run in ONE database transaction:**
1. Register: user + profile (+ quota row if used).
2. Quota reserve: counter updates + `AIUsageRecord` insert.
3. Quota settle/release: counter updates + record update.
4. Create interview: interview + configuration + interview quota counter.
5. Start interview (`CREATED → IN_PROGRESS`) with the one-active-interview check.
6. Submit answer: answer insert + progress update (idempotent on `clientRequestId`).
7. Save evaluation + next question + interview state/runtime state.
8. Close interview: status, `endedAt`, release unused reservations.
9. Document create + analysis quota reservation; chunk replace on reprocess (delete old + insert new).
10. Account deletion steps (1) and (3) (see USR-3).
11. Any admin action together with its `AdminAuditLog` insert.
12. Demo session creation: ephemeral user + `DemoSession` + demo counters.

**Calculated, never stored:** answer score, overall score, skill breakdown, STAR coverage, interview duration, elapsed time, time remaining, questions asked/remaining, inquiries used, quota remaining, budget remaining, warning flags, all dashboard statistics, trends.
**Stored as source of truth:** usage counters, evaluation criteria scores, timestamps (`startedAt`, `endedAt`), transcripts, report narrative.
Money (cost estimates, budgets, prices) uses exact `Decimal`, never floating point.

## 10. Security and API conventions

- **SEC-1** Every route: authenticate → permission check → scope/ownership check → validate input → act. Enforcement is server-side only.
- **SEC-2** All input validated with shared schemas (body, query, params). Unknown fields rejected.
- **SEC-3** Cookies: httpOnly, Secure, SameSite set per the deployment choice in ARCHITECTURE; CSRF defence for state-changing routes.
- **SEC-4** Security headers (helmet-style), CORS limited to `CLIENT_ORIGIN`, rate limits (QTA-13).
- **SEC-5** Uploads: type, size and signature checks; random storage names; private storage; no path from user input.
- **SEC-6** Errors never expose stack traces, keys, SQL or provider messages. Each error has a code and a plain message; each request has a request id.
- **SEC-7** Secrets only in `.env`; no secret in logs, commits, summaries, client code or error messages. The Gemini key is used only by the server.
- **SEC-8** Logs contain ids and codes, never document text, transcripts, passwords or tokens.

API format (suggested detail in ARCHITECTURE): success `{ "data": ..., "meta": ... }`; error `{ "error": { "code", "message", "details?" } }`. Status codes: 200, 201, 400, 401, 403, 404, 409, 422, 429, 502, 503.

## 11. Frontend requirements

- Follow the design in `/design` for every screen it contains. Missing screens are designed in the SAME style. Do not build features that appear in the design but not here.
- Screens: landing, login, register, forgot/reset password, onboarding, user dashboard, interview setup (4 modes), device check, live interview room, report, history, profile/settings, privacy page, demo dashboard, admin (overview, users, documents, interviews, usage, settings, audit).
- Every data screen has loading, empty and error states. Forms show validation and loading.
- Live interview room is desktop-first; other pages are responsive (desktop, tablet, mobile).
- Accessible basics: labels, keyboard focus, contrast, buttons not icon-only without labels.
- Device check page: microphone permission, input level test, audio output test, avatar preview, short instructions, "no webcam needed", clear permission-denied help.
- No hardcoded statistics in real pages. Sample data only inside the demo (labelled).
- Quota/budget messages: "AI limit reached. Your dashboard and history are still available."

## 12. Seed and demo data

- Seed script creates: quota profiles (DEMO, FREE_USER), default application settings, model price entries (owner confirms values), and the first ADMIN from `ADMIN_BOOTSTRAP_EMAIL`.
- Demo fixtures (read-only, in code, clearly labelled sample data): one fictional candidate, 3–4 sample interviews with sample reports, sample statistics.
- Dev fixtures for tests: fixture CV, fixture JD, fixture audio, mock Gemini responses. Never real personal data.

## 13. OUT OF SCOPE (do not build, do not "prepare for")

Payments or subscriptions; candidate webcam or video; storing audio recordings; voice interruption (barge-in); LiveKit or WebRTC; other AI providers; OCR for scanned CVs; languages other than English; native mobile apps; teams, companies or recruiter accounts; social features; resume builder; job board; live coding editor; custom or uploaded avatars; curated question bank (until D-2); Google sign-in (until the owner asks); email marketing; analytics beyond the admin usage dashboard; report regeneration; importing provider billing data; any "v2" feature not listed in this file.

## 14. Build phases (summary; details and tests in `docs/PHASES.md`)

0 Setup · 1 Auth/permissions/helpers · 2 Users/profile/onboarding · 3 Quota and AI budget ★ · 4 Documents · 5 RAG ★ · 6 Interview setup and plan · 7 Interview engine ★ · 8 Voice and avatar ★ · 9 Live interview room · 10 Evaluation, reports, history ★ · 11 User dashboard and demo · 12 Admin dashboard · 13 Public website · 14 Security review, tests, docs, deployment · 15 Animation and polish.
★ = hardest; split into (a) pure functions + tests, then review, then (b) endpoints and screens.

## 15. Design rule (paste-ready)

A design exists in `/design` (made with Google Stitch). Follow it for every screen it contains. Any needed screen missing from it must be designed in the SAME style (same colors, typography, spacing, components). Do not build features that appear in the design but not in this spec. Write `docs/design-tokens.md` from the design and reuse it everywhere.

## 16. Addendum — decisions made later

Decisions already made by the owner:
- Env values live in `server/.env` (and `client/.env`); agents must use them without printing values.
- Cheapest free-tier Gemini text and TTS models; never silently use paid models.
- Candidate can ask the AI questions about their documents or other topics, using a button; **no voice interruption**.
- A RAG system is built (pgvector on Neon).
- AI context stays light (ENG-6, ENG-7).
- UI design comes from Google Stitch in `/design`.

OPEN decisions (agent asks the owner, does not guess):
- **D-1** Email provider for password reset (and `EMAIL_FROM`).
- **D-2** RAG corpus: candidate's own CV/JD only (current) or also a curated question bank.
- **D-3** Document-analysis counter shared by CV and JD (current default) or separate.
- **D-4** Inquiry scope: any topic, short answers (current default) or interview topics only.
- **D-5** Empty answers count as 0 in averages (current default).
- **D-6** Sample-CV mode in the demo (not built by default).
- **D-7** Folder names `client/` and `server/` (current assumption) versus `apps/web` and `apps/api`.

---

Do not start building until the owner gives a phase instruction.
