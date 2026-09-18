# Development and deployment plan

The Next.js foundation is implemented for review. It contains a public App Router landing page, shared layout/navigation, a custom 404, Tailwind styling, strict TypeScript, ESLint, and Prettier. There are no personal-data routes, authentication, database, migrations, provider adapters, CI, or deployment yet. shadcn components will be added when an interactive feature needs them.

## Foundation setup

Use Node.js 24.21.0 (see `.nvmrc`) and npm 11. No environment variables or provider accounts are required for this shell.

```sh
npm ci --ignore-scripts
npm run dev
```

Open http://localhost:3000. The page labels future features as planned; there is no upload or login flow.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production compilation and static generation |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint with zero warnings |
| `npm run typecheck` | Generate route types, then strict TypeScript checking |
| `npm run format:check` | Check source/config formatting; existing Markdown is excluded |
| `npm run format` | Format source/config files |
| `npm run check` | Lint, types, and formatting |

Source lives in `src/app`; `@/*` resolves to `src/*`. Keep provider code server-only when integrations are added. Generated Next.js types, builds, local tools, credentials, and dependency directories are ignored. Direct dependencies are exact-pinned and `package-lock.json` fixes the dependency tree. See [dependency review](dependency-review.md).

No test runner is introduced for this static shell. Choose and document one before adding behavioral tests. Auth0, ownership, CSRF, database/migrations, CI, and Vercel are the next platform phase after foundation review.

## Remaining integration plan

1. Keep the foundation runtime/framework pins reviewed; select compatible SDK versions as each integration is added.
2. After foundation review, add Auth0, Drizzle/Postgres driver, Zod, and feature-needed shadcn components. Domain owners add Octokit, Gemini, and Backboard adapters with their slices.
3. Create a development Auth0 Regular Web Application with exact localhost callback/logout URLs according to the pinned SDK. Keep preview and production clients/settings isolated.
4. Provision a development Tiger Data database (or compatible local PostgreSQL with pgvector). Review Drizzle migrations, enable vector, and seed synthetic fixtures. Use TLS with certificate verification and a small connection pool.
5. Copy the placeholder inventory below into an ignored local environment file and populate privately. Validate configuration at startup; fail on missing required secrets. Never expose provider secrets with `NEXT_PUBLIC_`.
6. Follow the M0–M3 parallel roadmap in `docs/product.md`: foundation, profile/opportunity/platform slices, integration, then pilot hardening. Coaching is optional P1. Add migrate/seed/test scripts as those features land and document verified usage.

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

## Deployment on Vercel

Connect this repository when runnable application code exists. Configure server-side secrets separately for development/preview/production; previews must not use production private data. Select Node runtime for database/PDF integrations, verify request-body limits, memory and function duration, and keep total upload size below platform limits. Configure a bounded request deadline; fail clearly rather than promising background execution after response.

Place app and database near each other. Set connection pool and concurrency limits against the database budget. Run reviewed migrations as a controlled release step, not on every server startup. Test on staging, then deploy; roll back application releases without destructive schema rollback. Use additive migrations and keep backups/retention documented.

Set exact Auth0 callback/logout origins. Confirm provider entitlements/model availability and budgets. Load and verify the reviewed static snapshot for the MVP; a scheduled ingestion worker is a later feature. Configure recurring expiry and deletion cleanup with a durable scheduler before real data is enabled; choose and document the concrete scheduler at implementation.

## Execution milestones

See `docs/product.md`'s "Three-person parallel MVP roadmap" for the full three-person, milestone-gated work split (M0 foundation → M1 parallel vertical slices → M2 integration/demo → M3 parallel hardening). M2 includes demo reliability/security checks; M3 adds the real-data pilot gates. The roadmap assigns each check group to A, B or C. Optional-feature checks apply only when that feature is enabled.

## Verification gates

Foundation verification is recorded below. The following integration gates remain unmet.

- M2 core demo: two-user ownership/CSRF; PDF/text limits; five synthetic evidence fixtures; corrections/invalidation; wrong-dimension vectors; repeatable static seeds; unknown eligibility and missing requirements; prompt injection; idempotency, timeouts and provider outage states; quotas; no sensitive logs; production build and browser happy/error paths.
- M3 real-data pilot: verified provider handling/consent, deletion and late-result races, expiry cleanup and durable cleanup retries, plus regression of M2 checks.
- Coaching, when enabled: Backboard user isolation, memory opt-in/opt-out, correction and external deletion reconciliation.
- Later automated refresh: duplicate/changed records, partial snapshot preservation, source closures and stale-data presentation.

Live-provider smoke tests require bounded cost and synthetic data. Live-provider checks have not been performed.

Selected job sources: `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. Open implementation inputs: snapshot commits and reuse terms, model IDs/embedding config, approved inclusion-resource seed set, provider data-handling terms, hosting limits, and cleanup scheduler. These do not block publishing the documentation.

Reference: [Vercel function limits](https://vercel.com/docs/functions/limitations). Verify account-specific limits at deployment.

## Foundation verification (2026-09-18)

Verified on Windows with Node.js 24.21.0 / npm 11.19.0:

- Clean `npm ci --ignore-scripts --offline --cache .tools/npm-cache` reproduced the lockfile from the populated local cache. Stop running Next.js before reinstalling on Windows; its native binary is locked while the server runs.
- `npm run check`: ESLint, strict type checking, and formatting passed.
- `npm run build`: production build passed; `/` and the not-found page are statically generated.
- `npm start`: HTTP 200 for `/`, HTTP 404 for an unknown route, and the foundation disclosure is present.
- `npm run dev`: started successfully and served `/` with HTTP 200.
- Desktop and narrow-layout screenshots visually inspected: [desktop](review/foundation-desktop.png), [mobile layout](review/foundation-mobile.png).

Relative Markdown file links and `git diff --check` passed. No domain tests, live-provider checks, authentication/ownership checks, CI runs, or deployment have occurred. The ESLint compatibility limitation is recorded in the dependency review. Automatic Next.js agent-rule generation is disabled to keep development startup from rewriting repository instructions.
