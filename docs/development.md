# Local development

The repository includes a minimal Next.js/TypeScript page and npm checks. Docker is deferred. Authentication, database integration, provider adapters, domain migrations, and product routes remain unimplemented. CI runs npm checks and HTTP smoke tests on pushes to `main`/`master` and pull requests; it does not deploy the app.

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

The runner is `scripts/smoke.mjs`, exposed as `npm run smoke`. No separate test framework or coverage threshold is configured. `npm run check` runs Prettier, ESLint, and TypeScript checks. Installs disable dependency lifecycle scripts; direct versions and the lockfile are pinned. See [dependency review](dependency-review.md).

CI installs Node 24, performs a clean npm install, runs checks/build, starts the production app, and runs the same smoke test. Smoke tests do not establish database connectivity or unimplemented product behavior.

## Remaining integrations

Add Tailwind/shadcn, Auth0, Drizzle, Zod, Octokit, Gemini, and optional Backboard as their slices are implemented. Configure exact Auth0 localhost callback/logout URLs for the selected SDK and app port. Add reviewed domain migrations and synthetic fixtures when the database is connected; no migrate/seed command exists yet. Remote database connections must use verified TLS. Follow the M0–M3 roadmap in [product.md](product.md).

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

See `docs/product.md`'s "Three-person parallel MVP roadmap" for the full three-person, milestone-gated work split (M0 foundation → M1 parallel vertical slices → M2 integration/demo → M3 parallel hardening). M2 includes demo reliability/security checks; M3 adds the real-data pilot gates. The roadmap assigns each check group to A, B or C. Optional-feature checks apply only when that feature is enabled.

## Verification gates

Documentation checks: internal links, whitespace/diff review, placeholder-only committed configuration, and staged scope review. The local foundation checks below do not establish completion of the product gates.

- M2 core demo: two-user ownership/CSRF; PDF/text limits; five synthetic evidence fixtures; corrections/invalidation; wrong-dimension vectors; repeatable static seeds; unknown eligibility and missing requirements; prompt injection; idempotency, timeouts and provider outage states; quotas; no sensitive logs; production build and browser happy/error paths.
- M3 real-data pilot: verified provider handling/consent, deletion and late-result races, expiry cleanup and durable cleanup retries, plus regression of M2 checks.
- Coaching, when enabled: Backboard user isolation, memory opt-in/opt-out, correction and external deletion reconciliation.
- Later automated refresh: duplicate/changed records, partial snapshot preservation, source closures and stale-data presentation.

Live-provider smoke tests require bounded cost and synthetic data. Foundation verification results are recorded below. Product and live-provider checks remain outstanding.

Selected job sources: `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. Open implementation inputs: snapshot commits and reuse terms, model IDs/embedding config, approved inclusion-resource seed set, provider data-handling terms, local runtime limits, and cleanup scheduler. These do not block publishing the documentation.

## Verification scope

The former Docker implementation passed local checks and GitHub CI at commit `a9c0c08`. Those results apply to that historical commit. The direct-host workflow passed a clean native install under Node 24.20.0 on macOS/ARM64, formatting/lint/type checks, a production build, and smoke tests against both development (15 static assets) and production (9 static assets). The local Homebrew `node@24` path pointed to Node 25, so verification used a temporary official Node 24 archive with its SHA-256 checked against the release checksum. Select a real Node 24 installation before running the commands. The replacement npm-based CI workflow has not been pushed or run remotely. Product/auth/database/provider behavior remains unimplemented and untested. Visual browser verification remains outstanding because Chrome control was not approved.

## Profile integration checks

`PROFILE_DEMO_MODE=true npm run dev` enables the synthetic `/profile` workspace alongside `/opportunities`. `npm test` uses `tsx` to run both tracks. `npm run test:browser` exercises profile extraction, corrections, confirmation, PDF intake and mobile layout after installing Playwright Chromium. See [profile implementation](implementation/person-a.md) for provider boundaries. Live demo embeddings accept only exact approved fixture summaries; edited summaries use simulated vectors.
