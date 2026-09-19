# Local development

The repository includes a Next.js/TypeScript app with synthetic profile and Opportunities flows, automated tests, optional Auth0 wiring and Gemini/PostgreSQL profile adapter code. Authenticated runtime binding, applied database migrations and connected provider verification remain pending. The screens currently use plain CSS; Tailwind CSS setup is planned. Docker is deferred. CI runs npm checks and HTTP smoke tests on pushes to `main`/`master` and pull requests; it does not deploy the app.

## Start the app

Use Node 24, as selected in `.nvmrc`. If you use nvm, run `nvm install` and `nvm use` first. Otherwise select Node 24 using your usual installation/version manager and verify `node --version` reports `v24.x`.

```sh
npm ci --ignore-scripts
npm run dev
```

Open `http://localhost:3000`. Both development and production scripts bind only to `127.0.0.1`. Edit `app/` for automatic reload; stop with Ctrl+C. If port 3000 is occupied, use `npm run dev -- --port 3001` and open that port. No `.env`, database, or API keys are required for this initial page.

## Checks and smoke tests

```sh
npm run check
npm run build
npm run start
```

In another terminal, run `npm run smoke`. It uses Node's built-in fetch to check HTTP status, homepage content, and referenced JavaScript/CSS assets with timeouts. Run it against the development server or the built production app. For a custom port, use `SMOKE_BASE_URL=http://127.0.0.1:3001 npm run smoke`.

The runner is `scripts/smoke.mjs`, exposed as `npm run smoke`. Unit/contract tests use Node’s test runner through tsx; browser tests use Playwright. No coverage threshold is configured. `npm run check` runs Prettier, ESLint, and TypeScript checks. Installs disable dependency lifecycle scripts; direct versions and the lockfile are pinned. See [dependency review](dependency-review.md).

CI installs Node 24, performs a clean npm install, runs checks/build, starts the production app, and runs the same smoke test. Smoke tests do not establish database connectivity or unimplemented product behavior.

## Remaining integrations

Use **TypeScript and Tailwind CSS** for the frontend. TypeScript is implemented; the synthetic screens currently use plain CSS, so Tailwind/shadcn setup remains work. Use Drizzle for server-side database queries/schema, with pg connecting to Tiger Data PostgreSQL/pgvector; Zod validates payloads. These serve different layers and coexist with TypeScript and Tailwind CSS. [Decision 006](decisions/006-retain-drizzle-with-tiger-data.md) retains Drizzle and supersedes its proposed removal. Existing Drizzle profile adapters are not yet bound to a live database runtime.

Complete Auth0, database and Gemini runtime integration, add reviewed catalog import/Octokit as needed, and keep Backboard optional. Configure exact Auth0 localhost callback/logout URLs for the selected SDK and app port. Review existing profile SQL/Drizzle constraints, create the pg pool and Drizzle bootstrap, and integrate ordered domain migrations and authenticated runtime bindings; no shared migrate/seed command exists yet. Remote database connections must use verified TLS. Follow the current [delivery roadmap](../roadmap.md).

The earlier Docker services were stopped without deleting their database volume. That volume is not used by this workflow. Existing ignored Docker `.env` values can be left in place; the initial page does not read them.

## Environment template

Placeholder inventory only. Replace privately; angle-bracket values are not valid runtime credentials. Optional worker settings are unnecessary for the first demo.

```dotenv
APP_BASE_URL=<APP_BASE_URL>
AUTH0_DOMAIN=<AUTH0_DOMAIN>
AUTH0_CLIENT_ID=<AUTH0_CLIENT_ID>
AUTH0_CLIENT_SECRET=<AUTH0_CLIENT_SECRET>
AUTH0_SECRET=<AUTH0_SESSION_SECRET>
DATABASE_URL=<TLS_POSTGRES_CONNECTION_URL>
GEMINI_API_KEY=<GEMINI_API_KEY>
GEMINI_MODEL=<STRUCTURED_OUTPUT_MODEL_ID>
GEMINI_EMBEDDING_MODEL=<EMBEDDING_MODEL_ID>
GEMINI_EMBEDDING_DIMENSIONS=<SUPPORTED_DIMENSION_MATCHING_SCHEMA>
BACKBOARD_API_KEY=<BACKBOARD_API_KEY>
BACKBOARD_MODEL=<SUPPORTED_COACH_MODEL_ID>
GITHUB_TOKEN=<READ_ONLY_SOURCE_TOKEN_IF_NEEDED>
GITHUB_SOURCE_OWNER=<SIMPLIFYJOBS_ORG>
GITHUB_SOURCE_REPOS=<SUMMER2027_INTERNSHIPS_AND_NEW_GRAD_POSITIONS_REPO_NAMES>
GITHUB_SOURCE_REF=<SOURCE_BRANCH_OR_COMMIT_PER_REPO>
GITHUB_SOURCE_PATH=<SOURCE_FILE_OR_DIRECTORY_PER_REPO>
ENABLE_REAL_RESUMES=<BOOLEAN_DEFAULT_FALSE>
ENABLE_COACH=<BOOLEAN>
DAILY_USER_AI_LIMIT=<REQUEST_LIMIT>
GLOBAL_AI_BUDGET=<APPLICATION_ENFORCED_SPEND_LIMIT>
AUTH0_INGEST_AUDIENCE=<OPTIONAL_WORKER_API_AUDIENCE>
AUTH0_INGEST_CLIENT_ID=<OPTIONAL_WORKER_CLIENT_ID>
AUTH0_INGEST_CLIENT_SECRET=<OPTIONAL_WORKER_CLIENT_SECRET>
```

Names outside SDK-defined Auth0 variables are application configuration conventions. No Backboard assistant/thread ID is a global environment setting; those are private per-user mappings. No Discord credentials until that feature is requested.

## Execution milestones

See the [delivery roadmap](../roadmap.md) for current status, parallel A/B/C workstreams and R0–R3 delivery gates. R2 verifies the anonymous sample demo and authenticated services using synthetic test data; R3 enables the personal-résumé career-building product after data-handling gates pass. Optional-feature checks apply only when that feature is enabled.

## Verification gates

Documentation checks: internal links, whitespace/diff review, placeholder-only committed configuration, and staged scope review. The local foundation checks below do not establish completion of the product gates.

- M2 integration: no-sign-in sample demo, sample/private-route separation, two-user ownership/CSRF; PDF/text limits; five synthetic evidence fixtures; corrections/invalidation; wrong-dimension vectors; repeatable static seeds; unknown eligibility and missing requirements; prompt injection; idempotency, timeouts and provider outage states; quotas; no sensitive logs; production build and browser happy/error paths.
- M3 personal-résumé release: own-résumé career-plan acceptance, verified provider handling/consent, deletion and late-result races, expiry cleanup and durable cleanup retries, plus regression of M2 checks.
- Coaching, when enabled: Backboard user isolation, memory opt-in/opt-out, correction and external deletion reconciliation.
- Later automated refresh: duplicate/changed records, partial snapshot preservation, source closures and stale-data presentation.

Live-provider smoke tests require bounded cost and synthetic data. Foundation verification results are recorded below. Product and live-provider checks remain outstanding.

Selected job sources: `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. Open implementation inputs: snapshot commits and reuse terms, model IDs/embedding config, approved inclusion-resource seed set, provider data-handling terms, local runtime limits, and cleanup scheduler. These do not block publishing the documentation.

## Verification scope

The former Docker implementation passed local checks and GitHub CI at commit `a9c0c08`. Those results apply to that historical commit. The direct-host workflow passed a clean native install under Node 24.20.0 on macOS/ARM64, formatting/lint/type checks, a production build, and smoke tests against both development (15 static assets) and production (9 static assets). The local Homebrew `node@24` path pointed to Node 25, so verification used a temporary official Node 24 archive with its SHA-256 checked against the release checksum. Select a real Node 24 installation before running the commands. The replacement npm-based CI workflow has not been pushed or run remotely. Product/auth/database/provider behavior remains unimplemented and untested. Visual browser verification remains outstanding because Chrome control was not approved.

## Profile integration checks

`PROFILE_DEMO_MODE=true npm run dev` enables the synthetic `/profile` workspace alongside `/opportunities`. `npm test` uses `tsx` to run both tracks. `npm run test:browser` exercises profile extraction, corrections, confirmation, PDF intake and mobile layout after installing Playwright Chromium. See [profile implementation](implementation/person-a.md) for provider boundaries. Live demo embeddings accept only exact approved fixture summaries; edited summaries use simulated vectors.

## Local integration commands added during roadmap execution

- `npm run db:migrate`: load the existing `.env`, connect with verified TLS, and apply checksum-tracked platform/profile/ownership migrations in order. Requires pgvector already available to PostgreSQL; a failure does not authorize bypassing vector constraints. Review the target database before running.
- `TEST_DATABASE_URL=... npm run test:database`: run destructive test-owned-row checks only against a disposable PostgreSQL test database. No personal records or production URL. The suite verifies owner isolation, quotas, atomic replay and expired-lease fencing.
- `PLATFORM_ENABLED=true`: opt into the Auth0/PostgreSQL profile runtime after migrations/configuration. It currently accepts supplied synthetic intake only; it does not enable personal uploads. Private `/api/resumes` never falls back to a demo session.
- `/demo/profile` and `/api/demo/resumes`: isolated supplied-résumé demonstration. `/profile` is the personal-product entry point and accurately reports pending release checks.

Playwright uses `.next-test` output and its own port-3100 origin so it does not reuse a developer's `.next` lock. It forces fixture model mode. The low-cost `gemini-embedding-001` configuration was verified with one synthetic embedding request (768 finite values); this is not an evaluation of extraction quality or authorization to send personal résumés on a free API tier.

### Reviewed catalog setup

After configuring local `.env`, run `npm run db:migrate` against the intended
application database. `npm run catalog:seed -- --validate-only` embeds only public
reviewed role summaries and validates the batch without database writes. It caches
content-addressed embeddings in ignored `.catalog-cache/` to avoid repeated API
charges/quota use. `npm run catalog:seed` then atomically activates the batch;
reusing its version with changed content fails. Change the reviewed manifest and
version together for a new snapshot. Never populate its vectors with fixture data.

The 2026-09-19 seed has 15 roles and three sourced resources. Costs and eligibility
that were not verified are explicitly marked unknown. Qualification notes preserve
unmapped degree requirements and language alternatives. The live Gemini validation
passed for all 15 roles. Live pgvector activation/retrieval subsequently passed as recorded below; authenticated HTTP acceptance remains open.

### Live database and catalog verification — 2026-09-19

Using Node 24 and the locally configured `DATABASE_URL` (never printed), verified certificate-checked TLS and an initially empty public schema. `npm run db:migrate` applied all seven migration files, including pgvector-backed profile tables; rerunning it applied nothing. `npm run catalog:seed` activated the reviewed 15-role/three-resource batch. Direct read-only calls through the application catalog adapter returned three roles per field across all five fields, preserved ordering on repeated requests, and rejected an obsolete catalog version. These checks used actual PostgreSQL vector queries, not fixture vectors or an in-memory adapter. They do not prove Auth0 login, private profile writes, Gemini recommendation availability, or the complete user journey.

### Backboard storage integration

Set `BACKBOARD_API_KEY` only in local `.env`; restart the app after changing it.
With the platform enabled, `/career` offers explicit opt-in to remember the
selected field and active step titles/deliverables. Raw résumés are excluded.
`PUT /api/me/memory` queues an owned, version-checked snapshot or opt-out; a
background worker retries pending writes and cleanup. Later plan edits are not
shared until the user updates the remembered snapshot. Tiger Data remains the
source of truth and a Backboard outage does not prevent local plan use.

The REST adapter uses bounded calls and validates returned identifiers. Separate
assistants isolate users. It creates an empty assistant and records its ID before
storing user context. Cleanup resets memories and deletes the assistant before
clearing provider IDs; account deletion remains pending while those IDs exist.
An unknown initial-write result is reset before retrying. A crash between empty
assistant creation and recording its ID can leave an empty provider assistant;
no user context is written before the ID is recorded.

Verification: fake-provider adapter tests and real PostgreSQL synchronization
regression cover bounded responses, safe errors, restart/retry and opt-out during
a delayed write. On 2026-09-19, a bounded live synthetic check through the adapter
passed assistant creation, memory creation/read/update/read/delete, memory reset
and assistant deletion. This caught and corrected the create-memory response
shape (`success` and `memory_id`, unlike the read/update `id` shape). All temporary
assistants from the failed probes and successful check were deleted. Two adapter
tests and formatting/lint/type checks pass after the correction. Live worker/HTTP
integration, provider retention and authenticated browser UX remain unverified.
Official references checked 2026-09-19: [memory update](https://docs.backboard.io/api-reference/memories/update),
[memory reset](https://docs.backboard.io/api-reference/memories/reset), and
[assistant deletion](https://docs.backboard.io/api-reference/assistants/delete).

### Authenticated onboarding browser checks

To see all 11 browser tests in one Playwright UI, run
`TEST_DATABASE_URL=postgresql://127.0.0.1:55439/postgres npm run test:browser:ui`
with your disposable local PostgreSQL URL. The combined configuration groups tests
under `demo` and `authenticated` and starts their servers on ports 3100 and 3101.

Run `TEST_DATABASE_URL=postgresql://127.0.0.1:55439/postgres npm run test:browser:auth`
with Node 24 and Playwright Chromium installed. Supply your disposable loopback
PostgreSQL URL; remote databases are rejected. The harness creates a unique schema
using the platform/interest migrations and drops it on shutdown. It runs on port
3101 with separate `.next-auth-test` output, synthetic provider settings and a
dedicated test Auth0 secret. SDK-encrypted test cookies exercise the normal session
validation; they do not verify real Auth0 login/callbacks. No production bypass is
installed. This suite covers real onboarding persistence and a career UI scenario
with intercepted synthetic API responses; it does not prove connected résumé
extraction, live recommendations or career persistence. It is separate from the
default anonymous browser suite.

On 2026-09-19 both tests passed: durable interest selection, second-user isolation,
empty-selection prevention, mobile keyboard input, stale-update 409, foreign-origin
403 and signed-out 401. Desktop/mobile screenshots were visually inspected; no
horizontal overflow appeared at 390px. The stale-update check initially exposed
error-class identity differences between Next instrumentation and route bundles;
application errors now carry shared symbol brands so intentional error responses
survive those boundaries. All 161 unit tests also passed. No temporary browser
schemas remained after the first successful run.

The additional career browser scenario passes failure/retry, sourced suggestion
display, save/reload/complete/remove, community opt-in, field switching and
learning-need confirmation. Completing a step or confirming a learning need does
not increase evidence coverage. The response fixture uses the actual domain
transition functions but keeps state in the test process; database durability is
covered separately by integration tests. All three authenticated browser cases
and code checks pass. Desktop/mobile career screenshots were inspected. A separate
bounded live synthetic Gemini synthesis retry returned `AI_TIMEOUT`; live synthesis
acceptance remains open.

### Account data controls

Signed-in users can open `/account` from the home or career navigation. Deletion
requires an explicit checkbox confirmation, then uses the existing owned deletion
pipeline. Status remains available after reload through `GET /api/me/data`;
profile/onboarding redirect deleting accounts to this page. Pending, retrying and
completed states are distinct. The page explains the local worker requirement,
24-hour target, minimal deletion record, and separate Auth0/provider retention.

The authenticated browser suite now has four passing cases. Its deletion case
uses real PostgreSQL, verifies confirmation, persistent pending status, immediate
403 on private reads, redirects and another account's 404 for the deletion ID.
This does not prove remote provider cleanup or the 24-hour operational target.
All 16 database integration tests pass, including existing cleanup/retry/race
coverage. Mobile account and career navigation screenshots were inspected.

### Repeatable service smoke

With migrated local `.env` configuration, run `npm run smoke:services -- --backboard`.
This creates fresh synthetic accounts in the configured application database,
uses supplied fixture extraction with real Gemini embeddings, persists/reloads
profiles, checks owner isolation, reads the active catalog, saves preferences,
and verifies the real Backboard worker's sync/opt-out cleanup. It does not accept
existing user IDs. Cleanup is scoped to these newly created owners; incomplete
provider cleanup retains its durable records and makes the command fail.

Use `--gemini` to require real extraction and recommendation synthesis/action
saving as well. Without that flag those stages are explicitly printed as not run.
These are service-adapter checks, not an Auth0 login or complete HTTP journey.
No billing settings or saved model configuration are changed.

On 2026-09-19, the `--backboard` run passed all stages and cleaned both synthetic
accounts. The separate `--gemini` run failed during extraction with
`AI_UNAVAILABLE`, then cleaned both accounts. A bounded Flash-Lite synthesis probe
also returned unavailable; the configured model remains unchanged. All 16 database
tests and code checks pass, including owner-scoped cleanup regressions. Live Gemini
extraction/synthesis acceptance remains open.

A subsequent single synthetic extraction diagnostic returned HTTP 503 with
Gemini status `UNAVAILABLE` and an explicit high-demand message. This establishes
the cause of that request, not the dashboard's earlier 400/404 failures. Both
Gemini adapters now distinguish request rejection, unavailable model, access
denial, rate limiting and transient failure without exposing upstream bodies or
automatically retrying. All 162 unit tests and code checks pass. No model, key or
billing configuration was changed; live generation acceptance remains open.

After the operator selected `gemini-2.5-flash`, the bounded `--gemini` smoke
failed with `AI_MODEL_UNAVAILABLE` (404); both synthetic accounts were cleaned.
The model was present in the key's model-list response. One subsequent exact
synthetic extraction diagnostic returned 400 `INVALID_ARGUMENT` with no detailed
field information. These differing responses do not establish a missing model
or a quota issue; request compatibility/provider behavior needs further diagnosis.
The operator confirmed that the key still uses unpaid API quota, so personal
résumé processing remains disabled under the documented provider-tier gate.

## Local personal-upload override

The later operator decision in [ADR008](decisions/008-local-personal-resume-demo.md)
supersedes that local restriction. `PERSONAL_RESUME_ENABLED=true` with a loopback
`APP_BASE_URL` enables authenticated PDF/text intake, corrected-profile embeddings
and career synthesis. The checked-in template defaults off; the operator's ignored
local `.env` is enabled. Restart the app after changing this setting. Sign in,
select interests, then open `/profile` and acknowledge processing before uploading.
Anonymous `/demo/profile` remains sample-only. File limits remain 2 MB, five pages,
20,000 text characters; scanned/encrypted PDFs are unsupported.

This override does not change Google's unpaid-service handling or establish R3
release readiness. The UI states external processing and retention limits.
Independent verification: 166 unit tests and formatting/lint/type checks pass,
including versioned consent rejection before intake, arbitrary synthetic text
acceptance in the authenticated test runtime, and anonymous fixture isolation.
Accepted consent is now recorded in `app_users.consent_version/consent_at` before
intake; a real PostgreSQL regression verifies persistence, owner isolation and
rejection after deletion. The HTTP regression uses an injected test runtime and
does not prove live Auth0 or Gemini acceptance.

## Latest production and provider checks

`NEXT_TEST_OUTPUT=smoke npm run build` uses `.next-smoke` so it does not replace
the developer's `.next` or browser-test outputs. The 2026-09-19 attempt failed
fetching Inter and Space Grotesk from Google Fonts (`ENOTFOUND` in the restricted
runner). The network-enabled retry did not execute because automatic approval
review reported a usage limit. This build is not verified; rerun after network
approval is available, then run the applicable production HTTP smoke checks.

Peer verification subsequently resolved that build gate: Claude ran the isolated
production build successfully with network access, started it on port 3050 and
verified HTTP 200 for `/`, `/opportunities`, `/demo/profile` and `/profile`.
Formatting/lint/type checks passed afterward; the temporary server and build
output were removed. These page-status checks do not verify authenticated writes,
static-asset loading or live Gemini generation.

On the restored `gemini-3.8-flash`, minimal text and minimal structured-JSON
requests returned HTTP 200. Exact synthetic extraction returned HTTP 400.
Removing string-length schema keywords, normalizing nullable types, and using
the alternate `responseSchema` format each still returned 400. Removing the
structured-output configuration returned 200 but failed local extraction
validation. These were bounded diagnostic wrappers, not application changes;
strict evidence validation remains intact. Full live generation remains open.

The next controlled probe removed only `facts.maxItems` from the original wire
schema and returned HTTP 200 with four facts passing the unchanged evidence
validator. That narrow adapter change is now implemented: the local Zod parser
still enforces the 60-fact limit and strict object shape. A regression rejects 61
facts; 167 unit tests and code checks pass. The following full service smoke hit
a transient `AI_UNAVAILABLE` before extraction and cleaned both temporary accounts,
so it does not yet prove the complete generation flow.

Live browser inspection found `PLATFORM_ENABLED=false` in the operator's local
configuration despite personal mode being enabled. Both are now enabled locally;
after restarting port 3000, the existing real Auth0 session reaches the interests
onboarding page. This verifies session recognition and runtime/database binding,
not a fresh Auth0 callback or a completed personal résumé journey.
