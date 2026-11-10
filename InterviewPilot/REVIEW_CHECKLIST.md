# REVIEW_CHECKLIST — for the owner (you)

Use this after every phase, before saying "approved". Do not approve if the agent only says "tests pass" without showing real output.

## A. Every phase

- [ ] The agent stopped and gave a summary: what was built, files changed, tests run (with counts), what is incomplete, how to run and verify.
- [ ] Real command output is shown for type-check, lint and tests (not just a claim).
- [ ] Nothing outside the phase was built (no extra features, libraries, tables, roles).
- [ ] No secret values in the output, summary, code, comments or commit messages. `git status` shows no `.env` file staged.
- [ ] `.env.example` has new variable NAMES only (no values).
- [ ] The agent used the real `server/.env` and `client/.env` without asking you for keys.
- [ ] You ran the app and checked the phase's "done when" line yourself.
- [ ] New libraries were approved by you first.
- [ ] Docs the agent relied on are named (page and version) for Gemini, LangGraph.js, Talking Avatar, ImageKit, Prisma, pgvector.
- [ ] UI matches `/design` for screens it contains; any extra screen matches the same style.

## B. Permission spot checks (use wrong-role accounts)

Create these accounts once: **USER A**, **USER B**, a **blocked user**, a **demo visitor** (two different browsers for demo A and demo B), and your **ADMIN**. Try each row.

| Check | Expected |
|---|---|
| Open any `/admin` page as an **anonymous** visitor (logged out) | redirected/401 |
| Open `/admin` as USER A | 403, no admin data shown |
| Call an `/api/admin/...` endpoint as USER A (browser dev tools) | 403 |
| USER A opens USER B's interview, report or document by id | 404 |
| Demo visitor opens a real user's interview id | 404 |
| Demo A opens demo B's interview id | 404 |
| Demo visitor tries to upload a CV | 403 `DEMO_RESTRICTED` |
| Blocked user uses an old, still-valid session | rejected on the next request |
| After changing a password, an older session | rejected |
| Change `role` in a request body or local storage | ignored by the server |
| Admin previews/downloads a user's document | works and appears in the audit log |
| Admin tries to block themselves or another admin | refused |
| Start a second interview while one is active | 409 |
| Start the 3rd interview in a day as a free user | blocked with a clear message |
| Select 45 minutes as a free user | option disabled / 422 |
| Admin turns `aiEnabled` off, then start an interview | blocked; dashboard still works |
| Open a document URL from ImageKit directly | not accessible without the backend |

## C. Phase-specific checks

**Phase 0** — App starts; health check works; startup prints variable NAMES only; test DB differs from main DB; folder names (`client/`, `server/`) confirmed or changed (D-7).
**Phase 1** — Register/login/logout/reset work; 6th wrong login is rate-limited; reset link works once only; email provider decision D-1 recorded.
**Phase 2** — Onboarding can be skipped; deleting an account removes its data; login blocked during deletion.
**Phase 3** ★ — After part (a): read the unit tests for the check order and Decimal math. After part (b): run the parallel-request test and see exactly 5 of 20 succeed; flip `aiEnabled` off and confirm immediate blocking; confirm every denial made zero provider calls.
**Phase 4** — Upload a real CV; see the summary; confirm it invents nothing; try a `.exe` renamed to `.pdf`; try 6 MB; delete the document and confirm the file is gone; D-3 decision recorded (shared or separate analysis counter).
**Phase 5** ★ — User B cannot get A's text back from retrieval; the vector column size matches the embedding size; D-2 decision recorded.
**Phase 6** — All four modes create a plan; CV mode asks about something really in your CV; creating an interview counts against the day limit.
**Phase 7** ★ — Read the `decideNext` tests; confirm a weak answer leads to a simpler question and a strong answer to a deeper one; confirm no repeated question; confirm prompt size stays under the cap; D-4 decision recorded.
**Phase 8** ★ — Speak and watch the waveform move; stay silent and see it flat; the recruiter's lips move with the real audio (not a loop); the microphone does not record while the recruiter talks; close the browser tab and confirm no audio file remains. Record the live smoke test call count: ______.
**Phase 9** — Complete a real interview; press "Ask a Question" and confirm the same question remains after the answer; reload mid-interview; unplug the microphone; end the interview early; confirm ROOM-3 behavior is what you want.
**Phase 10** ★ — Check a report by hand: recompute one answer score and the overall score; confirm numbers are not stored in the database; exhaust the report quota and confirm the report becomes PENDING; D-5 decision recorded.
**Phase 11** — Dashboard numbers match your real interviews; demo works in a private window; second demo from the same network is blocked; "Sample data" labels are visible; D-6 decision recorded.
**Phase 12** — Every admin metric matches the database; audit log has an entry for each sensitive action you try; emergency shutdown works; costs say ESTIMATED.
**Phase 13** — Landing and privacy pages match actual behavior; mobile layout acceptable.
**Phase 14** — Full test suite output; secret scan clean; deployment guide followed on a clean machine.
**Phase 15** — Nothing behaves differently; animations respect reduced-motion.

## D. Before deployment

- [ ] **Rotate every secret you have ever pasted into a chat** (Gemini key, JWT secret, database password, ImageKit private key, email provider key). Update `server/.env` and the hosting environment variables.
- [ ] `.env` files are not in Git history (`git log -p` secret scan clean).
- [ ] Production environment variables set on Vercel and Render by hand (not committed).
- [ ] Neon: separate production branch/database; backups understood; test database is a different branch.
- [ ] Gemini: provider-side quota or billing caps set in Google's console where available; the app budget is not a replacement.
- [ ] Model names in env are the approved free-tier models; prices entered (0 for free tier); provider limits entered in admin settings.
- [ ] Admin account created by seed using `ADMIN_BOOTSTRAP_EMAIL`; the account uses a strong password.
- [ ] CORS limited to the real client origin; cookies are Secure; cookie approach (proxy or cross-site) tested in Chrome and Safari.
- [ ] Cold starts on Render/Neon tested; first-request delay is acceptable.
- [ ] Rate limits and quotas verified on the deployed app with two test accounts.
- [ ] Privacy and retention page matches reality; demo purge works.
- [ ] Error pages show plain messages (no stack traces).
- [ ] Error monitoring and logging working (no document text or transcripts in logs).
- [ ] Microphone and autoplay tested on the browsers you support, with and without headphones.
