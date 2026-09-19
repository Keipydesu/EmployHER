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
