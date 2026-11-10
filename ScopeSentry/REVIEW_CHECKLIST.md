# REVIEW_CHECKLIST — for the owner

Path: `REVIEW_CHECKLIST.md` (repo root). This file is for YOU, not the agent.

Accounts for spot checks (create them yourself in the running app):
- **User A** (owns projects) and **User B** (a different registered user). There is no admin role.
- **Visitor** = logged out (use a private window).

---

## 1. Every-phase checks

- [ ] The agent stopped and waited. It did not start the next phase.
- [ ] The summary lists: what was built, doc pages/versions used for fast-changing libraries, decisions made, and "Suggestions" (not built).
- [ ] Real command output is pasted for type-check, lint, tests and `npm audit`. You can see pass counts, not just "tests pass".
- [ ] Nothing was built outside `docs/PHASES.md` for this phase (no extra pages, roles, libraries, "v2" features).
- [ ] `git status` shows no `server/env`, `frontend/env` or `.env*` file staged. Run `git log -p` search for any key-looking string.
- [ ] No secret value appears in the summary, test output or commit messages.
- [ ] New dependencies were justified and are not brand-new releases.
- [ ] Money uses decimals; no stored derived values (differences, estimates, dashboard counts, report totals).
- [ ] Every new route does: authenticate → permission → ownership → validation (ask the agent to list the routes and show each check).
- [ ] UI follows `design/` and `docs/design-tokens.md`; any missing screen matches the same style.
- [ ] Loading, empty and error states exist for new data views.
- [ ] Remember to rotate any secret you ever pasted into a chat.

---

## 2. Permission spot checks (wrong-role accounts)

Do these after Phases 3, 4, 6, 7 and 8, and again before deployment.

Visitor (logged out):
- [ ] `/app/*` pages redirect to Login.
- [ ] Calling any `/api/v1/projects`, `/documents`, `/investigations`, `/findings`, `/reports`, `/dashboard`, `/settings` route returns 401.
- [ ] Demo routes work read-only; any write attempt on a demo id fails.
- [ ] No upload is possible in the demo.

User B against User A's data (copy ids from User A's URLs):
- [ ] `GET/PATCH/DELETE /projects/:A_projectId` → 404.
- [ ] `GET /documents/:A_docId`, `/download`, `DELETE` → 404.
- [ ] `POST /projects/:A_projectId/documents` → 404.
- [ ] `POST /projects/:A_projectId/investigations` using A's document ids → 404.
- [ ] `GET /investigations/:A_id`, `/findings`, `PATCH /findings/:A_id/review`, `/unit-price`, `/comments` → 404.
- [ ] `POST /investigations/:A_id/reports` and `GET /reports/:A_id/download` → 404.
- [ ] Mixing: User B creates an investigation using their own original document and User A's revised document id → 404/400, never accepted.
- [ ] AI retrieval isolation: User B uploads the same text as User A; B's investigation evidence never cites A's documents.

State-changing without CSRF token (use the API client or curl without the header):
- [ ] Rejected.

Rate limits:
- [ ] Repeated wrong logins, upload spam, investigation spam and demo spam eventually return 429.

---

## 3. Phase-specific checks

**Phase 0:** app and tests start with the real env files; `/health` reveals no secrets or DB details; `docs/design-tokens.md` matches the design.

**Phase 1:** run the pure-function tests yourself; confirm `0.1 + 0.2` style cases, negative differences, null price, percent change with zero original.

**Phase 2:** register; duplicate email rejected; weak password rejected; login error identical for unknown email and wrong password; cookie is httpOnly (browser dev tools, Application tab); logout works; reset link works once only, expires, and logs out old sessions; reset request gives the same message for unknown emails.

**Phase 3:** create a project with dates reversed → rejected; delete a project with documents → everything disappears (check Atlas collections and ImageKit); archived project is read-only.

**Phase 4:** upload a renamed `.exe` as `.pdf` → rejected; oversize file → rejected; password-protected/empty-text PDF → clear failure message; document is not reachable through a public ImageKit URL; deleting a document removes the ImageKit file.

**Phase 5a/5b:** exact identifiers (clause numbers, "32 windows") are retrieved by keyword even if semantic search misses them; Atlas indexes exist and filter by owner/project; user B can never retrieve user A's chunks.

**Phase 6a/6b:** the "20 → 32 windows" case gives +12 and a quantity/material finding; no unit price → "cannot estimate", never a guessed number; every evidence item opens the real document location; missing evidence is shown as "not found"; clicking Start Investigation twice creates one investigation; a document containing "ignore previous instructions" does not change results; labels Confirmed / Estimate / AI interpretation are visible.

**Phase 7a/7b:** each review change appears in the history; "Approved" wording never implies legal approval; the PDF contains all 12 sections with real values, labeled estimates and the limitations text; dashboard numbers match what you can count by hand.

**Phase 8:** three demo projects are labeled "Demo data"; a visitor can run a real investigation; results disappear after expiry; the daily limit works; no way to touch real users' data.

**Phase 9:** the route-by-route authorization table passes; Playwright full flow passes; production env values were set by you in Vercel/Render, not by the agent.

**Phase 10:** nothing changed functionally; reduced-motion respected; mobile, tablet, desktop all usable; keyboard navigation works.

---

## 4. Pre-deployment checklist

- [ ] All suites green (unit, API, E2E, deterministic AI). The live-Gemini suite was run once and results reviewed.
- [ ] `npm audit` reviewed; no unresolved high/critical issues in production dependencies.
- [ ] `server/env`, `frontend/env`, `.env*` are not in git history (check history, not only the working tree).
- [ ] Production secrets are NEW values (not the dev ones), set by you in Render/Vercel dashboards. Any secret ever pasted into a chat has been rotated.
- [ ] `CLIENT_ORIGIN` is exactly the production frontend origin; CORS rejects other origins.
- [ ] Cookies are `Secure` and `httpOnly`; CSRF works across Vercel and Render (test login on the deployed site).
- [ ] MongoDB Atlas: production database separate from test; IP/network access reviewed; Vector Search and Atlas Search indexes created for production with the correct dimensions; TTL indexes present.
- [ ] ImageKit: private files confirmed (direct URL attempt without signature fails).
- [ ] Rate limits enabled in production; demo daily cap set to a sensible cost limit; Gemini usage/billing alerts configured.
- [ ] Error responses show no stack traces; logs contain no passwords, tokens, document text or env values.
- [ ] Health check works; Render cold-start behavior is acceptable or documented.
- [ ] Demo data seeded in production and labeled; no real user data in demo.
- [ ] README explains setup, env variable names, tests and deploy.
- [ ] Limitations text is visible in the app and in reports.
