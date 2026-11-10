# MASTER_PROMPT — ScopeSentry

Path: `docs/MASTER_PROMPT.md`
Status: source of truth for FEATURES, ROLES, PERMISSIONS and BUSINESS RULES. If another file disagrees, this file wins on those. The `design/` folder wins on visuals.

---

## 1. Working rules

1. Work on ONE phase at a time (see `docs/PHASES.md`). After each phase: run type-check/lint/tests, show the real output, write a short summary, then STOP until the owner says "approved".
2. Never claim a feature works or a test passed unless it was implemented and the command was actually run. Paste real output.
3. No features, roles, modules, libraries or infrastructure outside this spec. If something seems missing, ask the owner or list it under "Suggestions". Do not silently add it.
4. Keep code simple and readable. Modular monolith. No premature abstractions.
5. For fast-changing libraries (LangChain.js, LangGraph.js, `@langchain/google-genai`, Gemini API/model names, MongoDB Atlas Vector Search / Search index syntax, ImageKit SDK, Tailwind, shadcn/ui, Vite, React Router, PDF/DOCX parsers), check the current official docs BEFORE writing code and name the doc page or package version used in the plan and summary.
6. Secrets: real values live only in the owner's env files (see section 4). Never print, log, copy, summarize or commit values. Not in code, docs, summaries, test output or commit messages.
7. Security rules in section 11 apply to every route and every phase.
8. Never use fake data in production functionality. Sample data exists only for the labeled demo (section 13).
9. Calculations, permissions, validation and business rules are ordinary backend code. Gemini only interprets text and writes explanations.

## 2. Project overview

**ScopeSentry — AI Construction Change Detective.** Tagline: *Every project change has a cost. Make sure you see it.*

A portfolio SaaS where project managers upload original and revised construction documents (contracts, specifications, change requests, meeting notes), run an AI investigation, and receive evidence-backed findings about what changed, the estimated cost/schedule impact, and whether approval evidence exists. A human reviews every finding. Reports are downloadable PDFs.

Core principle: the product must clearly separate three kinds of information everywhere (UI, API, reports):

| Kind | Meaning | Label |
|---|---|---|
| CONFIRMED | A value or text actually present in an uploaded document, with a reference | "Confirmed from document" |
| ESTIMATED | Computed by backend code from confirmed values plus stated assumptions | "Estimate" |
| AI-INTERPRETED | Gemini's explanation or classification | "AI interpretation" |

Estimates are never presented as verified financial or legal conclusions. "Approved" means "reviewed by the user", never a legal or contractual determination.

## 3. Fixed technology stack

Do not change without asking the owner first.

- Frontend (folder `frontend/`): React, Vite, JavaScript (reusable components), Tailwind CSS, shadcn/ui, React Router. React Flow/XYFlow ONLY for the investigation workflow visualization, and only if it genuinely helps.
- Backend (folder `server/`): Node.js, Express.js, REST.
- Database: MongoDB Atlas + Mongoose. One database.
- File storage: ImageKit, private files only.
- AI: Google Gemini API via LangChain.js; LangGraph.js for the one investigation workflow.
- Retrieval: Hybrid RAG = Atlas Vector Search + Atlas Search (keyword/BM25) + Reciprocal Rank Fusion. Reranking only if justified by measured results and approved by the owner.
- Extraction: a maintained PDF text library (verify maintenance status before choosing; `pdf-parse` only if still maintained), `mammoth` for DOCX. OCR is a later enhancement, not in the MVP phases.
- Testing: Vitest, Supertest, Playwright.
- Deployment: Vercel (frontend), Render (backend), MongoDB Atlas, ImageKit.
- Money math: `decimal.js` (or equivalent decimal library) — never floating point.
- PDF report generation: one server-side PDF library (suggested: `pdfkit` or `pdf-lib`; confirm choice in Phase 6 plan).
- NOT allowed unless a demonstrated requirement is approved: Redis, BullMQ, microservices, Kubernetes, a second database or vector store, a knowledge graph, additional LLM providers.

## 4. Environment

The owner's real env files already exist with working values:

- Backend: `server/env`
- Frontend: `frontend/env` (the agent may create it; contains non-secret values only)

Rules:
- The agent MUST use these files for everything needing configuration: running the app, seeding, indexing, tests (test DB only), and builds. The agent must not ask the owner for keys.
- The agent may edit the env files to add new variable lines or change non-secret configuration. It must never print, log, copy, summarize or commit their values. If a secret variable is missing or invalid, the agent asks for the variable NAME only; the owner adds the value.
- The files are named `env` (not `.env`). Backend loading must point to that path explicitly (check current dotenv docs). Vite only auto-loads `.env`-style names; the agent must check current Vite docs on how `frontend/env` is loaded and, if it cannot be, tell the owner and propose `frontend/.env` instead of silently choosing.
- Committed: `server/env.example` and `frontend/env.example` with names and placeholders only. Never commit `server/env`, `frontend/env`, or any `.env*` file. `.gitignore` must exclude all of them.
- Tests use a separate test database and MOCK Gemini, ImageKit, and email. Real-Gemini tests are a separate opt-in suite using a dedicated command.
- Remind the owner to rotate any secret ever pasted into a chat.

Variable NAMES (values never written in any doc):

Backend (`server/env`): `NODE_ENV`, `PORT`, `CLIENT_ORIGIN`, `MONGODB_URI`, `MONGODB_DB_NAME`, `MONGODB_TEST_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CSRF_SECRET`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `GEMINI_EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, `MAX_UPLOAD_MB`, `DEMO_RUN_LIMIT_PER_DAY`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (email names are suggested; see open decision D-1).

Frontend (`frontend/env`): `VITE_API_BASE_URL`. No secret may ever be placed in a `VITE_` variable.

## 5. Roles and permission matrix

There are only two actors. No admin role. No teams or sharing.

- **Visitor** (not logged in): public pages and the public demo only.
- **User** (registered, logged in): full functionality on resources they OWN.

Ownership rule: a resource belongs to a user if `ownerId === req.user.id` (directly or through its project). Any other user's resource returns `404 Not Found` (not 403) to avoid revealing existence.

| Action | Visitor | User (owner) | User (not owner) |
|---|---|---|---|
| View public pages | Yes | Yes | Yes |
| Browse demo projects/documents (read-only) | Yes | Yes | Yes |
| Run a demo investigation | Yes (rate-limited) | Yes (rate-limited) | Yes |
| Modify demo data | No | No | No |
| Register / log in / recover password | Yes | n/a | n/a |
| Create project | No | Yes | n/a |
| View / edit / delete project | No | Yes | No (404) |
| Upload / list / download / delete document | No | Yes | No (404) |
| Start / view investigation | No | Yes | No (404) |
| Review finding (status, comment) | No | Yes | No (404) |
| Generate / download report | No | Yes | No (404) |
| View dashboard, settings | No | Yes (own data) | n/a |

Permission strings (suggested names are in `docs/ARCHITECTURE.md`). Every protected route performs: (1) authenticate, (2) permission check, (3) ownership/scope check, (4) input validation, all server-side.

## 6. Modules and business rules

Every rule is written to be testable. IDs (BR-xx) are referenced by `docs/PHASES.md` tests.

### 6.1 Authentication (Phase 1–2)
- BR-A1: Email is unique, stored lowercase and trimmed. Duplicate registration returns a generic validation error that does not reveal whether the email exists beyond the registration response.
- BR-A2: Password minimum 10 characters, maximum 128. Hashed with a modern adaptive hash (bcrypt cost ≥ 12 or argon2id). Plain passwords never stored or logged.
- BR-A3: Login issues a signed session token in an httpOnly, Secure cookie. Cookie attributes are chosen for cross-site Vercel→Render use (see ARCHITECTURE) and a CSRF token header is required on all state-changing requests.
- BR-A4: Login, register and password-recovery endpoints are rate-limited per IP and per email. Login failure message is identical for unknown email and wrong password.
- BR-A5: Password reset tokens are random, single-use, stored only as a hash, expire in 30 minutes. Using a token invalidates all of that user's existing sessions. The recovery-request endpoint always returns the same response whether or not the email exists.
- BR-A6: Logout clears the cookie server-side.

### 6.2 Projects (Phase 2)
- BR-P1: Fields: name (required, 1–120 chars), description (≤ 2000), projectType (enum, see below), location (≤ 200), budget (optional, decimal ≥ 0), startDate (optional), expectedCompletionDate (optional).
- BR-P2: If both dates are present, `expectedCompletionDate >= startDate`, otherwise validation error.
- BR-P3: projectType enum: `commercial_building`, `residential_development`, `office_renovation`, `other`.
- BR-P4: A user can only list/read/update/delete projects where `ownerId` equals their id. Unknown or foreign id returns 404.
- BR-P5: Deleting a project deletes all its documents (including the ImageKit files), chunks, investigations, findings, review actions and reports. The database part runs in ONE transaction; ImageKit deletions run after commit and failures are recorded for retry/cleanup, never silently ignored.
- BR-P6: "Active project" means `status === "active"`. Projects default to `active`. Allowed statuses: `active`, `archived`. Archived projects are read-only except unarchive and delete.
- BR-P7: Currency is a label on the project (`currency`, default `"USD"`, ISO 4217 3-letter). No conversion between currencies. All amounts inside one investigation share the project currency.

### 6.3 Documents (Phase 3)
- BR-D1: Allowed types: PDF and DOCX only. Validate by extension AND MIME AND file signature (magic bytes). Max size is `MAX_UPLOAD_MB` (suggested default 10). Reject everything else.
- BR-D2: Categories (enum): `original_contract`, `original_specification`, `revised_specification`, `change_request`, `meeting_notes`, `supporting_document`.
- BR-D3: Upload flow order: validate → upload to ImageKit (private) → create document record (`processingStatus: "pending"`) → extract text → save text + status. If any step after the ImageKit upload fails before the record is saved, delete the uploaded ImageKit file (compensation).
- BR-D4: `processingStatus` enum: `pending`, `extracting`, `extracted`, `indexing`, `ready`, `failed`. A failed document stores a safe `failureReason` (no stack traces) and may be retried.
- BR-D5: Documents are never served via public URLs. Downloads go through an authenticated backend route that verifies ownership, then returns a short-lived signed ImageKit URL or streams the file.
- BR-D6: Original filenames are sanitized for display; storage names are generated server-side (random id), never trusted from the client.
- BR-D7: Deleting a document removes its chunks and the ImageKit file. Deleting a document that is referenced by an existing investigation is BLOCKED with a clear error (investigations keep their evidence integrity). The user must delete the investigation first.
- BR-D8: Extracted text is untrusted data (see 11.5).
- BR-D9: Scanned PDFs with no extractable text get `failed` with reason `no_extractable_text` (OCR is out of MVP scope).

### 6.4 Chunking and indexing (Phase 3–4)
- BR-C1: Text is split section-aware where headings/clause numbers are detectable, otherwise by page, then by size. Suggested size ~800 tokens with ~100 overlap; sizes are configuration constants in one file.
- BR-C2: Each chunk stores: `ownerId`, `projectId`, `documentId`, `documentCategory`, `chunkIndex`, `text`, `pageNumber` (when known), `sectionLabel` (when detected, e.g. clause number), `embedding`.
- BR-C3: Re-processing a document replaces its chunks atomically (delete old + insert new in one transaction).
- BR-C4: Every retrieval query MUST apply `ownerId` and `projectId` filters (plus `documentId`/category when relevant). A retrieval function that cannot receive `ownerId` and `projectId` must not exist.

### 6.5 Investigation (Phase 5)
- BR-I1: Input: one original document, one revised document, 0..N supporting documents, all in the same project, all `ready`, all owned by the user. Violations return 400/404.
- BR-I2: Original must have category `original_specification` or `original_contract`; revised must have category `revised_specification` or `change_request`. Supporting documents may be any category other than the two selected.
- BR-I3: Duplicate prevention: an `inputHash` is computed from (projectId, originalDocumentId, revisedDocumentId, sorted supportingDocumentIds). If an investigation with the same `inputHash` is in status `queued` or `running`, the request returns the existing investigation (HTTP 200) instead of creating a new one. Enforced by a unique partial index, not only by app code. An `Idempotency-Key` header is also honored.
- BR-I4: `status` enum: `queued`, `running`, `completed`, `failed`. Runs in-process (no queue infrastructure). The start endpoint returns 202 and the client polls. On server startup, investigations stuck in `running` older than a configured timeout are marked `failed` with reason `interrupted`.
- BR-I5: Completed investigation results are immutable except for finding review fields. Re-running creates a NEW investigation.
- BR-I6: Fixed LangGraph workflow with four stages, in order:
  1. **Document Understanding** — extract requirements, quantities, materials, specifications, dates, costs, clauses from original and revised; output validated with a schema (zod). Invalid output → one bounded retry → else investigation `failed` with a safe reason.
  2. **Change Detection** — deterministic comparison first (exact quantities, clause numbers, identifiers, dates, unit prices), then AI-assisted matching for items whose wording differs. Exact values are never matched by embedding similarity alone.
  3. **Impact Analysis** — hybrid retrieval for evidence; numeric impact computed by backend functions; approval-evidence lookup.
  4. **Report Generation** — assemble structured findings; every claim links to evidence or states "evidence not found".
- BR-I7: Gemini never performs authoritative arithmetic. All arithmetic is in backend functions (section 7).
- BR-I8: Gemini must not invent citations. Every evidence item stored on a finding must reference a real `chunkId` + `documentId`; the backend verifies that the quoted/snippet text exists inside that chunk before saving. If verification fails, the evidence item is dropped and the finding gets the flag `evidence_not_found` where appropriate.
- BR-I9: If no approval evidence is found for a finding, `approvalEvidence.status = "not_found"`. It is never guessed.
- BR-I10: Each finding has `confidence` in {`high`, `medium`, `low`} computed by deterministic rules (suggested: high = exact match on identifier/quantity in both documents; medium = AI-matched with supporting evidence; low = AI-matched without evidence) plus an `uncertaintyNote`.
- BR-I11: Change categories (enum): `quantity_changed`, `material_changed`, `specification_changed`, `requirement_added`, `requirement_removed`, `date_changed`, `cost_changed`, `other`.

### 6.6 Findings and review (Phase 6)
- BR-R1: `reviewStatus` enum: `pending`, `approved`, `rejected`, `needs_further_review`. Default `pending`.
- BR-R2: Any status transition among these four is allowed for the owner. Each change writes an audit record (who, when, from, to, optional comment) in the SAME transaction as the finding update.
- BR-R3: Comments are plain text, 1–2000 chars, stored as audit entries of type `comment`. Audit entries are append-only: never edited or deleted (except by cascade when the project/investigation is deleted).
- BR-R4: UI and reports state: "Approved = reviewed by the user. Not a legal or contractual determination."
- BR-R5: A user can override the unit price on a quantity/material finding (`unitPriceOverride`, decimal ≥ 0). Overriding recomputes the estimate on read (it is not stored) and writes an audit record.

### 6.7 Reports (Phase 6)
- BR-RP1: Reports are generated only from a `completed` investigation using stored findings and current review statuses. No fabricated or sample values.
- BR-RP2: Sections in this order: project info; investigation date; executive summary; documents compared; detected changes; original vs revised values; supporting evidence; potential cost impacts; potential schedule impacts; approval findings; assumptions and limitations; human review status.
- BR-RP3: The executive summary counts (changes, per-status review counts, total estimated cost) are computed from findings at generation time and are not stored on the investigation.
- BR-RP4: The PDF is stored in ImageKit (private) and a `reports` record keeps metadata. Generating again creates a new report record (history kept).
- BR-RP5: Every estimate in the report is labeled "Estimate" with its assumptions. The report includes the limitations text from 12.2.

## 7. Calculations — computed, NEVER stored

All in pure, unit-tested functions (`server/src/domain/`). Decimal arithmetic only.

- `quantityDifference = revisedQuantity − originalQuantity` (signed; may be negative).
- `estimatedCostDifference = quantityDifference × unitPrice` where `unitPrice = unitPriceOverride` if present, else the unit price found in documents (CONFIRMED source required), else `null`.
- If `unitPrice` is `null`: `estimatedCostDifference = null` and the UI says "Cannot estimate: no unit price supplied". Never guess a price.
- If a unit price itself changed between documents: `priceDelta = (revisedUnitPrice − originalUnitPrice) × revisedQuantity` is reported separately, labeled estimate, with both prices shown.
- `dateDifferenceDays = days between two calendar dates` (UTC calendar dates, signed). Schedule impact = `dateDifferenceDays` only when both dates are CONFIRMED values for the same milestone; otherwise "schedule impact not determinable".
- Percent change = `(revised − original) / original × 100`; if `original = 0` → `null`.
- Rounding: keep full decimal precision in calculation; round half-up to 2 decimals for money and 2 decimals for percentages ONLY at display/report time.

NEVER STORED (always recalculated on read or at report time): quantity difference, estimated cost difference, price delta, date difference, percent change, total estimated impact, dashboard counts, report summary counts, project investigation counts.

STORED (they are facts or state): extracted original/revised values with references, `unitPrice` found in documents (as extracted fact), `unitPriceOverride`, review status, audit entries, processing/investigation statuses, evidence references.

## 8. Operations that MUST run in one database transaction

(Atlas supports multi-document transactions; use a session.)

1. Delete project cascade (DB part).
2. Delete investigation cascade (findings, audit entries, reports metadata).
3. Replace chunks when re-processing a document.
4. Create investigation record + duplicate guard (the unique partial index must also protect against races).
5. Review action: update finding `reviewStatus` + insert audit entry.
6. Unit price override: update finding + insert audit entry.
7. Password reset: mark token used + update password hash + invalidate sessions.
8. Save investigation results: insert findings + mark investigation `completed`.

Not transactional (external side effects): ImageKit upload/delete, Gemini calls, email. Use compensation or retry records as described in the rules above.

## 9. Dashboards and reports data

Dashboard (user-scoped, computed from real data, no decorative metrics):
- Total projects; active projects; total investigations; changes awaiting review (findings with `reviewStatus` = `pending` or `needs_further_review`, in the user's completed investigations); reports generated.
- Recent projects (last 5 by `updatedAt`); recent investigations (last 5 by `createdAt`).
- Empty states must be shown when there is no data.

## 10. Data model (entities and relationships)

All user-owned documents carry `ownerId` for scoping; demo documents have `isDemo: true` and `ownerId: null`.

- **User** `{ email, passwordHash, name, createdAt }`
- **PasswordResetToken** `{ userId, tokenHash, expiresAt, usedAt }` (TTL index on expiry)
- **Project** `{ ownerId, name, description, projectType, location, budget?, currency, startDate?, expectedCompletionDate?, status, isDemo }` — 1 User → many Projects
- **Document** `{ ownerId, projectId, category, originalFilename, storedFileId, storedFilePath, mimeType, sizeBytes, processingStatus, failureReason?, extractedText, pageCount?, isDemo }` — 1 Project → many Documents
- **DocumentChunk** `{ ownerId, projectId, documentId, documentCategory, chunkIndex, text, pageNumber?, sectionLabel?, embedding }` — 1 Document → many Chunks
- **Investigation** `{ ownerId, projectId, originalDocumentId, revisedDocumentId, supportingDocumentIds[], inputHash, status, failureReason?, startedAt, finishedAt?, demoSessionId?, isDemo }` — 1 Project → many Investigations
- **Finding** `{ investigationId, ownerId, projectId, title, category, originalValue, revisedValue, unit?, extractedUnitPrice?, unitPriceOverride?, description, evidence[ { documentId, chunkId, snippet, page?, section? } ], approvalEvidence { status, evidence[] }, scheduleInfo?, confidence, uncertaintyNote, reviewStatus, flags[] }` — 1 Investigation → many Findings
- **ReviewAction** (audit, append-only) `{ findingId, investigationId, ownerId, type (status_change | comment | price_override), fromStatus?, toStatus?, comment?, createdAt }`
- **Report** `{ investigationId, ownerId, projectId, storedFileId, filename, generatedAt }`

Relationships: User 1→N Project 1→N Document 1→N DocumentChunk; Project 1→N Investigation 1→N Finding 1→N ReviewAction; Investigation 1→N Report. Investigation references three kinds of Documents by id.

Indexes (suggested): unique `users.email`; `projects.ownerId`; `documents.projectId`; `documentChunks (ownerId, projectId, documentId)`; unique partial index on `investigations.inputHash` where status in (`queued`,`running`); Atlas Vector Search index on `documentChunks.embedding` with filter fields `ownerId`, `projectId`, `documentId`, `documentCategory`; Atlas Search index on `documentChunks.text` with the same filter fields; TTL on reset tokens and on demo investigations.

## 11. Security and API conventions

11.1 Every route: authenticate → permission check → scope/ownership check → validate input → act. All server-side. Hiding a button is never enough.
11.2 Never trust client-supplied ids. Resolve every id with an owner-scoped query (`{ _id, ownerId }`).
11.3 Passwords hashed; httpOnly + Secure cookies; CSRF protection on state-changing routes; rate limiting on auth, upload, investigation start and demo run; strict CORS allowing only `CLIENT_ORIGIN`; security headers (helmet); request body size limits; safe error responses (no stack traces, no internal ids of other users' data).
11.4 Secrets backend-only. No secret in any `VITE_` variable or frontend bundle.
11.5 Untrusted documents: extracted text is DATA. Prompts must put document text inside clearly delimited data blocks, instruct the model to ignore any instructions inside them, and the model has NO tools that can mutate data, read other projects, or call external systems. The model's output is parsed against schemas; it can never choose which ids, permissions or tools apply.
11.6 Response format: JSON, `{ "data": ... }` on success and `{ "error": { "code", "message", "details?" } }` on failure. Status codes: 200, 201, 202, 204, 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found or not yours), 409 (conflict, e.g. blocked delete), 413, 429, 500.
11.7 Pagination on list endpoints (`page`, `limit`, hard max).
11.8 Logging: never log passwords, tokens, document text, or env values.
11.9 Dependency hygiene: pin versions, avoid brand-new releases for production dependencies, run `npm audit` at each phase end and report real output.

## 12. Frontend requirements

12.1 Public pages: Home, How It Works, Features, Interactive Demo, Login, Register (plus Forgot/Reset Password).
12.2 App pages: Dashboard, Projects, Project Details, Documents, Investigations, Investigation Details, Change Reports, Settings.
12.3 Investigation Details shows: status/progress, findings table, finding detail panel (original vs revised, evidence with document + page/section, estimates labeled, AI interpretation labeled, confidence, review controls), and a workflow visualization only if it genuinely helps.
12.4 Limitations text shown in app and in every report: "ScopeSentry highlights potential changes and estimates impacts to help project managers investigate. Estimates depend on supplied prices and extracted values and are not verified financial or legal conclusions. AI interpretations may be wrong. A human must review every finding. Approval means reviewed by the user, not a legal or contractual determination."
12.5 Responsive (desktop, tablet, mobile), accessible forms and controls (labels, focus states, keyboard use, contrast), loading/empty/error states on every data view.
12.6 Visual direction: clean light backgrounds, navy typography, subtle blue accents, professional data tables, consistent spacing, restrained motion. Avoid generic AI-generated look, heavy gradients, decorative statistics, clutter. The design in `design/` is the visual reference (see AGENTS.md design rules).

## 13. Seed and demo data

- Three fictional, clearly labeled DEMO projects: commercial building, residential development, office renovation. Each has several fictional documents (original specification, revised specification, change request, meeting notes, contract excerpt) with KNOWN expected findings (for AI evaluation).
- Required example in the commercial project: original "Install 20 standard windows." vs revised "Install 32 premium insulated windows." Expected: quantity 20→32, difference +12, material/spec changed, estimate only if a unit price is present in the documents.
- Demo data is read-only: flagged `isDemo: true`, `ownerId: null`; no write endpoint accepts a demo id.
- Visitors may run a REAL AI investigation on demo documents. Results are stored with a `demoSessionId` from an httpOnly cookie, readable only with that cookie, auto-expiring (TTL, suggested 24h). Strict per-IP and global daily limits (`DEMO_RUN_LIMIT_PER_DAY`).
- No file upload in the public demo.
- Seed script is idempotent, uses the real env, and never touches non-demo data.
- A UI badge reads "Demo data" wherever demo content appears.

## 14. OUT OF SCOPE (do not build, do not suggest as part of an MVP phase)

Admin role or admin panel; teams, organizations, sharing or collaboration; roles beyond Visitor/User; social login/SSO; MFA; billing/subscriptions/payments; email notifications beyond password recovery; real-time collaboration or websockets; OCR (until the owner approves it as an enhancement); file types other than PDF and DOCX; image/CAD/BIM/drawing analysis; public demo uploads; additional LLM providers; fine-tuning; knowledge graph; second vector DB; Redis/BullMQ/queues; microservices; mobile apps; i18n/multi-language UI; currency conversion; automated contract/legal advice; automatic approval decisions; exporting formats other than PDF; third-party integrations (ERP, Procore, etc.); analytics/tracking; dark mode (unless in the design); "v2" ideas of any kind. If you believe something here is needed, ask the owner.

## 15. Build phases

Defined in `docs/PHASES.md` (Phase 0 setup through Phase 10 polish). One phase at a time; stop for review after each.

## 16. Decisions addendum

(Empty. The owner appends later decisions here with date. Agent never edits this section without being told.)

- Open decision D-1: email provider for password recovery (suggested: SMTP via Nodemailer; owner to supply SMTP variables). Must be decided before Phase 2b.
- Open decision D-2: confirm `frontend/env` is loadable by Vite or switch to `frontend/.env`.

---

Do not start building until the owner gives a phase instruction.
