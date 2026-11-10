# AGENTS.md — How the agent must work on InterviewPilot

This file is for the coding agent. It must NOT be overwritten by setup tools. Requirements live in `docs/MASTER_PROMPT.md`; conventions in `docs/ARCHITECTURE.md`; the plan in `docs/PHASES.md`.

## 1. Working method

1. Work on **one phase at a time** (see `docs/PHASES.md`). When the phase is done, write a short summary and **STOP**. Do not start the next phase until the owner says "approved".
2. For phases marked ★, do part (a) first (pure functions + tests), show results, and stop for review before part (b).
3. Show **real command output** for type-check, lint and tests. Never say "tests pass" unless you ran them in this session and saw them pass. If you could not run something, say so.
4. Do not add features, libraries, roles, tables or endpoints that are not in the spec. If something seems missing, ask the owner first. Suggestions go in a "Suggestions" section of your summary, not in the code.
5. Keep code simple and readable: small functions, clear names, service layers, no clever abstractions, no copy-pasted logic. Use TypeScript strictly.
6. Before using a library that changes often (Gemini API, LangGraph.js, Talking Avatar SDK, ImageKit, Prisma, Neon/pgvector, Next.js), check the **current official docs** and say which page and version you used. Do not invent methods, endpoints, model names or options. Official starting points: Gemini API docs (https://ai.google.dev/gemini-api/docs), Talking Avatar (https://talking-avatar.dev/), Neon pgvector docs, Prisma docs, ImageKit docs, LangGraph.js docs.
7. Ask the owner to approve the list of new dependencies (name, purpose, version) before installing them.

## 2. Secrets and environment (most important rule)

- The owner's **real `.env` files already exist** in the project with real working values:
  - **`server/.env`** — backend (database URL, Gemini key, ImageKit, JWT secret, etc.)
  - **`client/.env`** — frontend (only `NEXT_PUBLIC_*` values)
  - Before Phase 0, list the project root to confirm these exact paths. If a folder is named differently, use the real name and tell the owner.
- **USE these files** for everything that needs configuration: running the app, migrations, seed scripts, tests (test DB excepted, see below). **Do not ask the owner for keys.**
- **NEVER** print, log, echo, copy, paste, summarize, hardcode or commit the **values**. This includes terminal output, summaries, commit messages, code comments, test output and error messages.
- Never run `cat`, `type`, `echo $VAR` or similar on `.env` files. To check what exists, list **names only**, for example:
  `grep -oE '^[A-Za-z_][A-Za-z0-9_]*' server/.env`
- Load variables in code through one validated config module (schema-checked at startup). The startup check prints variable NAMES and OK/MISSING only.
- If a variable is missing, ask the owner for the **variable name only** and tell them to add it themselves. If real names differ from `docs/MASTER_PROMPT.md` section 4, use the existing names and ask before renaming.
- Only `.env.example` files (names + placeholders) are committed. `.env` files are in `.gitignore`. Verify with `git status` before every commit.
- **Tests** use a separate test database (`TEST_DATABASE_URL`, for example a Neon branch) and **mock** Gemini and ImageKit. Tests must never touch the real database, the real Gemini quota or the real ImageKit account.
- **Live smoke tests** with the real Gemini key use real free-tier quota. Run them only when the owner explicitly approves each run, keep them to the minimum number of calls, and say how many calls were made.
- The Gemini key is used **only** by the backend. Nothing secret goes into client code or `NEXT_PUBLIC_*` variables.

## 3. Security rules for every route

Every route follows this order: **authenticate → permission check → scope/ownership check → validate input → act**. Enforcement is server-side only; hiding a button is never enough.

- Role comes from the database, never from the request or the token alone.
- Another user's resource returns **404**, not 403.
- Validate all input (body, query, params) with shared schemas; reject unknown fields.
- Passwords hashed (bcrypt), tokens in httpOnly cookies, login rate-limited, no secrets in client variables.
- Uploads: check type, size and signature; private storage; no public URLs.
- Errors show plain messages and codes. Never show stack traces, keys, SQL or raw provider errors.
- Admin actions on other users' data write an audit log row in the same request (if it fails, the action fails).
- Every AI call goes through the quota reservation (QTA-1). **Fail closed**: if quota tracking fails, make no AI call.

## 4. Critical business rules (short form; full text in MASTER_PROMPT)

- **Quota:** check order auth → status → user quota → interview quota → global budget → `aiEnabled`/model → reserve → run → record → settle. Reservation is one atomic conditional update. 20 parallel requests vs limit 5 → exactly 5 pass. Budget exhausted → block AI, keep dashboard, never switch to a paid model. Models need a configured price (0 allowed) or they are blocked.
- **Demo:** isolated ephemeral demo user per visitor (never a shared writable account). 1 live interview/day, 5 min, 3 questions, no uploads, GENERAL mode only. Admin can disable demo or live demo.
- **Documents:** private; owner or audited admin only; PDF/DOCX ≤ 5 MB; the AI summary may contain only facts present in the document.
- **RAG:** retrieval is filtered by `userId` AND the interview's own document ids. No cross-user chunks, ever.
- **Light context:** never send the full history. Send config, document summaries, a rolling summary (≤ 1,200 chars), the last 3 Q/A pairs, retrieved chunks, current question; prompt cap 12,000 chars. At most 1 transcription + 1 combined evaluate-and-next-question call per answer + 1 TTS call per recruiter utterance.
- **Interview flow:** server owns time; statuses and runtime states follow ENG-2 only; no question asked twice; empty answers make no evaluation call; **no voice interruption**; candidate asks questions with the "Ask a Question" button (ENG-10, ROOM-3).
- **Audio:** never stored; recorder inactive while the recruiter speaks or the AI works; waveform is flat in silence and driven by real microphone data; lip-sync is done by the Talking Avatar SDK with real generated audio.
- **Scores:** answer/overall/skill scores, durations, remaining quota and dashboard numbers are **calculated, never stored**. Money uses `Decimal`, never floats.
- **Roles:** USER and ADMIN only; ADMIN is created only by the seed script.

## 5. Design rules

A design exists in `/design` (made with Google Stitch). Follow it for every screen it contains. Any needed screen missing from it must be designed in the SAME style (same colors, typography, spacing, components). Do not build features that appear in the design but not in the spec. Write `docs/design-tokens.md` from the design in Phase 0 and reuse it everywhere. Animation libraries (Framer Motion) are used only in the last phase.

## 6. Testing rules

- Each phase includes tests for **its own** business rules (by rule ID), not only at the end.
- Test types: unit tests for pure functions, API tests (supertest-style) for permissions and validation, database tests for transactions and concurrency, browser tests for the avatar/waveform/microphone behavior (use Chromium fake-microphone flags; ask the owner to approve the browser test tool).
- Always include **wrong-role** tests: anonymous, demo visitor, USER on another user's data, blocked user.
- Mock all paid or external services in automated tests.

## 7. Definition of done (every phase)

A phase is done only when ALL are true:
1. Everything in the phase section of `docs/PHASES.md` is built (nothing silently skipped).
2. Tests for the phase's rule IDs exist and pass, with real output shown.
3. Type-check and lint pass, with real output shown.
4. No secret values appear in code, logs, output, or commits (`git status` checked).
5. `.env.example` files are updated with any new variable NAMES.
6. Docs updated if a convention changed.
7. The summary lists: what was built, files created or changed, tests run (with counts), what is incomplete, how to run and verify, and any questions.
8. The agent **stops** and waits for "approved".
