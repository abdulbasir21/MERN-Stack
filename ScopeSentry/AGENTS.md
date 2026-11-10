# AGENTS.md — How the agent must work on ScopeSentry

Path: `AGENTS.md` (repo root). The agent must NOT overwrite or rewrite this file.

Source-of-truth files: `docs/MASTER_PROMPT.md` (requirements), `docs/PHASES.md` (roadmap), `docs/ARCHITECTURE.md` (conventions), `design/` (UI reference), `docs/design-tokens.md` (derived tokens). If files disagree: MASTER_PROMPT wins on features, roles, permissions and business rules; the design wins on visuals.

## 1. Workflow

1. One phase at a time. Never start the next phase without the owner saying "approved".
2. At the end of each phase: run type-check, lint and tests; paste the REAL command output; give a short summary; STOP and wait for review.
3. Never claim tests passed, or a feature works, without running it and showing the output. If something could not be run, say so plainly.
4. Hard phases are split into (a) pure functions + tests, then STOP for review, then (b) endpoints and screens.
5. Make small atomic commits with clear messages. Commit messages must never contain secret values.
6. Do not ask the owner to re-explain the spec. Read the files first. Ask only about genuinely unclear items.

## 2. Scope discipline

- No features, roles, modules, libraries or infrastructure outside `docs/MASTER_PROMPT.md`. Ask first.
- Respect the OUT OF SCOPE list (MASTER_PROMPT section 14). No "v2" ideas, no extras.
- Do not build anything that appears in the design but not in the spec.
- Anything you think is missing goes under "Suggestions" in your summary, not into the code.

## 3. Code quality

- Keep code simple and readable. Modular monolith, one backend, one database.
- No premature abstractions. No new dependency without a stated reason and owner approval.
- For fast-changing libraries (LangChain.js, LangGraph.js, `@langchain/google-genai`, Gemini models/API, Atlas Vector Search and Atlas Search index syntax, ImageKit SDK, Tailwind, shadcn/ui, Vite, React Router, PDF/DOCX parsers), check the CURRENT official docs before writing code. Name the doc page or package version you used in your plan and in your summary. Do not rely on memory for APIs of these libraries.
- Money: exact decimals (decimal library), never floating point. Derived values are calculated, never stored (see MASTER_PROMPT section 7).

## 4. Secrets and environment (mandatory)

- The owner's REAL env files already exist with working values: **`server/env`** (backend) and **`frontend/env`** (frontend, may be created by you with non-secret values only).
- USE these files for everything that needs configuration: running the app, seed, indexing, builds, and tests (tests use the test database variable only). Do not ask the owner for keys.
- You may edit these files to add new variable lines or change non-secret config. NEVER print, log, copy, summarize, echo, diff-display or commit their values anywhere, including summaries, error output, test output and commit messages. If a command would print a value, redact it.
- If a variable is missing, ask the owner for the variable NAME only. The owner adds the value.
- The files are named `env`, not `.env`. Load the backend one by explicit path (check current dotenv docs). Vite auto-loads only `.env`-style names: check current Vite docs and, if `frontend/env` cannot be loaded, tell the owner and propose `frontend/.env`; do not decide silently.
- Only `server/env.example` and `frontend/env.example` (names + placeholders) are committed. `.gitignore` must exclude `server/env`, `frontend/env`, `.env*`.
- Never place a secret in a `VITE_` variable or anywhere in frontend code.
- Tests use a separate test database and MOCK Gemini, ImageKit and email. Never hit real paid or file-storage services in automated tests. Real-Gemini tests are a separate opt-in suite.
- Remind the owner to rotate any secret ever pasted into a chat.

## 5. Security rules for EVERY route

1. Authenticate (except public pages/demo routes).
2. Permission check.
3. Scope check: resolve every id with an owner-scoped query. Foreign or unknown id → 404.
4. Validate ALL input (body, params, query, headers, files) with a schema.
5. Enforce everything server-side. A hidden button is not security.
6. Rate-limit auth, upload, investigation start and demo run.
7. Safe errors: no stack traces, no internals, no other users' data.
8. Never log passwords, tokens, document text or env values.
9. Retrieval always filters by `ownerId` and `projectId`. No retrieval function may exist without them.
10. Uploaded document text is untrusted DATA. It can never change instructions, tools, permissions or ids. The LLM has no mutating tools.

## 6. Critical business rules (short form; full text in MASTER_PROMPT)

- Gemini never does authoritative math. All arithmetic is backend decimal code: `quantityDifference = revised − original`; `estimatedCostDifference = quantityDifference × unitPrice`; no unit price → no estimate ("cannot estimate").
- Confirmed (from documents) vs Estimated (computed) vs AI-interpreted (Gemini) are always labeled differently.
- Every evidence item must reference a real chunk and its snippet must exist in that chunk. No invented citations. Missing evidence → "not found".
- Exact quantities, clause numbers, identifiers and dates are compared deterministically, never by embedding similarity alone.
- Approval = "reviewed by the user", never a legal determination. Review actions are audited (append-only).
- Duplicate investigation start returns the existing active one (unique partial index + idempotency key).
- Documents: PDF/DOCX only, validated by extension + MIME + magic bytes + size. Private storage only. Downloads via authenticated route.
- Deleting a document referenced by an investigation is blocked (409).
- Demo data is read-only; demo runs are rate-limited; visitors never see user data.
- Never use fake data in production code paths. Sample data only in labeled demo seed.
- Calculated values (differences, estimates, dashboard counts, report summary counts) are never stored.

## 7. Design rules

- The owner's design (for example from Google Stitch) is saved in `/design`. Follow it for every screen it contains.
- Any needed screen missing from the design must be designed in the SAME style: same colors, typography, spacing, components.
- Do not build features that appear in the design but not in the spec; list them under "Suggestions".
- Write `docs/design-tokens.md` from the design (colors, typography, spacing, radii, shadows, components) and reuse it everywhere. Do not hardcode ad-hoc colors.
- Visual direction: clean light backgrounds, navy typography, subtle blue accents, professional data tables, restrained motion; no heavy gradients, decorative statistics, or clutter. Responsive and accessible.
- Animation and polish happen in the LAST phase only.

## 8. Testing rules

- Each phase includes tests for its OWN business rules (not only at the end), referencing BR ids where possible.
- Unit tests (Vitest): pure domain functions, validation, permission checks.
- API tests (Supertest): auth, CRUD, ownership (including wrong-user access → 404), unauthenticated → 401, validation errors.
- E2E (Playwright): public demo, register/login, project, upload (mocked storage), investigation (mocked Gemini), review, report download.
- AI: fictional documents with known expected findings; deterministic tests mock Gemini; a separate opt-in suite tests real Gemini.
- Tests must be deterministic and independent of external services.

## 9. Definition of done (every phase)

A phase is done only when ALL are true:
1. Everything listed for the phase in `docs/PHASES.md` is implemented and nothing outside it.
2. Tests for the phase's business rules exist and pass; real output shown.
3. Type-check (or equivalent static check) and lint pass; real output shown.
4. `npm audit` result shown (report, do not auto-fix breaking changes).
5. No secret value appears in any file, log or commit.
6. Every route in the phase passes the section 5 checklist.
7. The "done when" line for the phase in PHASES.md is satisfied.
8. A short summary is written (what was built, decisions, doc pages/versions used, Suggestions, how to run) and the agent STOPS for the owner's "approved".
