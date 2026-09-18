# Person A — profile implementation and handoff

Implemented locally: résumé text/PDF intake, a server-side Gemini REST adapter, exact evidence validation, review/correction UI, immutable PostgreSQL profile versions, confirmation and 768-dimensional embeddings, conservative path-specific résumé suggestions, API handlers, and a synthetic local harness. This is A's slice, not the completed authenticated MVP. No infrastructure or live provider credentials were provisioned.

## Run and verify

Use Node 24 LTS, as pinned in `.nvmrc`. From the repository root:

```sh
npm ci --ignore-scripts
PROFILE_DEMO_MODE=true npm run dev
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:browser
npm run format:check
```

Open `/profile` and start a sample session. Choose one of five synthetic résumés, extract, correct, save/confirm, and request a sample-path suggestion. The PDF tab downloads a generated sample PDF and accepts it back through the real parser. The no-evidence sample exercises a useful failure. Refresh restores the current profile while the process and sample cookie remain alive.

The harness is opt-in, non-production, loopback-bound by the dev command, and unavailable on Vercel. It accepts only supplied sample text/PDFs. It uses opaque HttpOnly sample session cookies and in-memory adapters; these are not Auth0 or durable application storage. No live AI calls occur by default. Simulated vectors are explicitly labeled and cannot be used by `matchingProfile()` or persisted by the PostgreSQL adapter. Restart clears demo data.

To smoke-test Gemini on synthetic inputs, configure the placeholder variables from `.env.example`, set `PROFILE_DEMO_GEMINI=true` alongside demo mode, and restart. Use available model IDs supporting structured `generateContent` and `embedContent` with 768 output dimensions. This opt-in makes billable provider calls. Only exact approved fixture summaries reach live embedding; edited or differently extracted summaries use clearly marked simulated vectors. Editing remains available, and draft saves do not embed. No live-provider quality claim follows from fixture tests.

## Contracts for Person B

`src/profile/contracts.ts` is the executable A contract. The API returns `facts[]`, discriminated by `kind: skill | experience | education`, rather than three independently maintained arrays. A fact has `id`, `label`, `detail`, nullable `dateText`, and either exact résumé evidence or `user_reported` provenance. Unknown dates are null. The source offsets refer to normalized, contact-line-minimized input, which is discarded after extraction.

- `POST /api/resumes`: JSON `{text}` or one multipart PDF `file`; requires an idempotency key.
- `GET /api/resumes/:id`: returns the current owner-scoped profile; no owner ID or vector values leave this API.
- `PATCH /api/resumes/:id`: `{expectedVersion, corrections, confirm}`; complete replacement of the fact list. Omit IDs for additions, preserve IDs for existing facts. Omitted facts are removed. Unknown/duplicate IDs and caller-supplied evidence are rejected. Requires an idempotency key.
- `GET /api/resumes/:id/suggestions?pathId=…&version=…`: returns up to three suggestions with fact/requirement IDs and profile/path versions. `PathCatalog` must resolve the path from B's reviewed catalog, never from client-supplied requirements.

Only `ProfileService.matchingProfile(owner, id, version)` supplies confirmed, current, non-simulated vectors. A profile edit creates a new version and clears or recomputes its embedding. B must check current version when reading cached matches, not just rely on an eventual event consumer. `profile_invalidation_events` is written in the same PostgreSQL transaction as each revision; B/C consume events to invalidate/recompute their stored results.

Embedding contract: `profile-semantic-v1`, 768 dimensions, Gemini `SEMANTIC_SIMILARITY`, normalized nonzero finite values. B must embed role summaries with the same model/configuration. Store and compare model/configuration when querying. A future change to dimensions/task/config requires an explicit schema/config migration and re-embedding both corpora; do not silently reinterpret stored vectors.

Suggestions deliberately foreground existing confirmed experience verbatim, matched against an explicit skill in reviewed requirements. They do not invent impact metrics or credentials. Exact text checks cannot prove semantic truth; the user reviews facts and the source context. Accept/edit/reject/copy controls are local draft controls, not automatic updates to the confirmed profile. Edited drafts require the user's accuracy check. No future learning action becomes completed experience.

## Contracts for Person C

A small Next.js harness was necessary because M0 had no scaffold. C can integrate the modules into its app shell and shared Tailwind/shadcn components. The harness uses plain CSS and accessible native controls; it is not a replacement platform design system.

Supply `ProfileRuntime` from `src/profile/runtime.ts` through `installProfileRuntime()` in the server bootstrap (or inject it into `createProfileHandlers`). Production without this binding returns 503. Required bindings:

1. `authorize(request, operation)`: validate the Auth0 session, resolve issuer/sub to an internal UUID, check deletion/expiry, reserve per-user/global quotas, and apply platform lifecycle policy. Never accept browser-provided owner IDs. Authorize every route, including suggestion reads.
2. `authorizeIntake(owner, text)`: enforce demo/pilot eligibility and processing consent before any AI call. Keep real intake disabled until pilot gates pass. The module's contact-line minimization is not comprehensive anonymization.
3. `ProfileService`: inject `PostgresProfileRepository` with C's Drizzle connection, `GeminiProfileAI`, durable `Operations`, and B's catalog. No production in-memory fallback.
4. `Operations`: owner + operation + key + input digest; processing lease/deadline, bounded replay state, and atomic claim. Honor stale version/deletion checks. Purge sensitive cached responses on deletion/expiry. A's in-memory executor is test-only; it does not claim distributed idempotency or recovery after a crash.
5. Shared UI: provide the authenticated page/session wrapper, real catalog path picker, and login/expiry handling in place of the local sample session controls. The supplied `/profile` page is intentionally a sample harness until this wiring exists.

Review `src/profile/schema.ts` and `schema.sql` as domain migrations before running them in C's ordered migration system. The SQL and Drizzle schema include profile state/embedding constraints; preserve them when integrating migrations. Add owner foreign keys against the authoritative users table. Current PostgreSQL storage uses heads + immutable versions rather than the earlier conceptual single `resume_profiles` table. History and vectors follow the original profile's 30-day expiration; editing does not extend it.

Call `deleteOwner()` during deletion: its lifecycle row serializes deletion against create/revise and prevents late writes from recreating data. C must independently deny all operations while deletion is pending, cancel/reconcile provider/operation state, run expiry cleanup, and manage eventual tombstone retention after all operation deadlines. Reads filter expired/deleted profiles immediately. B's matching data needs its own cascades/cleanup hooks.

Set `APP_BASE_URL` to the canonical application origin for CSRF checks behind a proxy.

Before any future hosted release, verify the PDF worker's output tracing and bundling, approved body/time limits, and connection pool/TLS configuration. A bounds uploads to 2 MB, five pages, 20,000 characters; parses in a worker with a 10-second/128-MB limit; rejects password-protected/unreadable PDFs; and offers text fallback. Parsing does not write files or invoke OCR. Gemini gets a 45-second deadline shared across at most two extraction attempts. It has no tools and receives contact-line-minimized text only. Provider errors are sanitized.

## Verification limits

Unit/contract and browser tests use synthetic data and mocked Gemini responses. Live Gemini accuracy and Tiger Data transactions still require credentialed integration tests. Auth0, global quotas, distributed operations, deployment, scheduled expiry cleanup, production pilot consent, and B's real catalog/matching are outside this slice and must be wired before real use. The build is not an indication that those services are configured.

## Shared application integration

Profile routes live in root `app/` alongside `/opportunities`; `src/profile/` contains domain logic. Profile CSS is scoped beneath `.profile-demo` to avoid changing the Opportunities UI. One `tsx` test command runs both tracks, including TypeScript parameter properties in the profile slice. Shared Node 24, lint/format/type checks and Opportunities smoke checks remain in CI.

## Integrated verification — 2026-09-18

Node 24.20.0: all 131 unit tests and five Playwright Chromium tests pass, including the HTTP live-embedding boundary, exact loopback origin handling, and navigation between profile and Opportunities. Formatting, lint, type checks and the combined production build pass. Production smoke checks cover homepage assets, both Opportunities loopback hosts, profile assets and disabled profile API gates. Live Gemini and PostgreSQL were not exercised.

Screenshots: [desktop](../screenshots/profile/desktop.png), [mobile](../screenshots/profile/mobile.png).
