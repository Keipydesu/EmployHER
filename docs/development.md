# Local development plan

The repository includes a minimal Next.js/TypeScript app, Docker Compose, PostgreSQL/pgvector bootstrap, and local checks. Authentication, provider adapters, domain migrations, and product routes remain unimplemented. CI runs the Docker checks on pushes to `main`/`master` and pull requests; it does not deploy the app.

## Local development

1. Install and start Docker with Compose v2 or newer.
2. Copy `.env.example` to `.env` and replace the example database password with a private local value. Do not commit `.env`.
3. Run `docker compose up --build --wait` and open `http://localhost:3000`.
4. Edit files in `app/` for automatic reload. Rebuild with the same command after dependency or configuration changes; only `app/` is bind-mounted.
5. Stop with `docker compose down`. The named database volume persists. `docker compose down --volumes` deletes the local database; use it only for an intentional reset.

Ports bind only to `127.0.0.1`. Change `APP_PORT` or `DB_PORT` in `.env` if 3000 or 5432 is occupied. The app container reaches PostgreSQL at `db:5432`; host tools use `127.0.0.1:<DB_PORT>`. Database/user are both `employher`. Inspect it with `docker compose exec db psql -U employher -d employher`.

The local database uses the upstream pgvector image and enables `vector` on first initialization. It does not create domain tables. Initialization scripts run only on an empty volume; changing the password in `.env` does not change an existing database role's password. Local Docker database traffic is unencrypted; remote Tiger Data connections will require verified TLS. The app receives PG connection settings for future integration but does not query the database yet.

## Local checks

Smoke tests use POSIX shell scripts named `scripts/smoke*.sh`. `scripts/smoke.sh` checks development HTTP content and a real pgvector cosine-distance query over authenticated TCP using synthetic vectors. `scripts/smoke-production.sh` starts an isolated standalone container, checks its HTTP content and referenced JavaScript/CSS assets, then removes that temporary container. No unit-test runner or coverage threshold is configured.

```sh
sh scripts/smoke.sh
docker compose exec app npm run check
docker build --target runner -t employher-local .
sh scripts/smoke-production.sh
```

The `docker build` command runs formatting, ESLint, TypeScript, and a production build, then creates a standalone image running as a non-root user. To run that image locally:

```sh
docker run --rm -p 127.0.0.1:3001:3000 employher-local
```

`npm run dev`, `npm run check`, and `npm run build` can also run on the host after `npm ci --ignore-scripts` using Node 24. There is no `npm test` script. Docker dependency installation disables lifecycle scripts; package versions and container digests are pinned. See [dependency review](dependency-review.md).

## Remaining integration work

Add Tailwind/shadcn, Auth0, Drizzle, Zod, Octokit, Gemini, and optional Backboard adapters as their slices are implemented. Configure exact Auth0 localhost callback/logout URLs for the selected SDK. Implement reviewed domain migrations and synthetic fixtures, and add actual migrate/seed commands then. Follow the M0–M3 roadmap in [product.md](product.md).

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

## Local demo runtime

The Next.js app runs on localhost, with port 3000 by default. Compose sets `APP_BASE_URL` from `APP_PORT`; future Auth0 callback/logout settings must use that same origin. Hosted deployment is deferred; no hosting provider is selected for the current demo.

Keep provider secrets in ignored local environment files and server-side adapters. Auth0, Tiger Data (or compatible local PostgreSQL with pgvector), Gemini, and optional Backboard remain planned integrations; this is not an offline-only demo. Verify upload limits, memory use, request deadlines, connection pool limits, and provider budgets locally. Run reviewed migrations explicitly, not on every server startup.

Load and verify the reviewed static snapshot and synthetic résumé fixtures. Verify the production build and browser flows locally. Recurring expiry/deletion cleanup and durable retries remain gates before real data is enabled; choose and document the concrete scheduler at implementation.

## Execution milestones

See `docs/product.md`'s "Three-person parallel MVP roadmap" for the full three-person, milestone-gated work split (M0 foundation → M1 parallel vertical slices → M2 integration/demo → M3 parallel hardening). M2 includes demo reliability/security checks; M3 adds the real-data pilot gates. The roadmap assigns each check group to A, B or C. Optional-feature checks apply only when that feature is enabled.

## Verification gates

Documentation checks: internal links, whitespace/diff review, placeholder-only committed configuration, and staged scope review. The Docker foundation checks below do not establish completion of the product gates.

- M2 core demo: two-user ownership/CSRF; PDF/text limits; five synthetic evidence fixtures; corrections/invalidation; wrong-dimension vectors; repeatable static seeds; unknown eligibility and missing requirements; prompt injection; idempotency, timeouts and provider outage states; quotas; no sensitive logs; production build and browser happy/error paths.
- M3 real-data pilot: verified provider handling/consent, deletion and late-result races, expiry cleanup and durable cleanup retries, plus regression of M2 checks.
- Coaching, when enabled: Backboard user isolation, memory opt-in/opt-out, correction and external deletion reconciliation.
- Later automated refresh: duplicate/changed records, partial snapshot preservation, source closures and stale-data presentation.

Live-provider smoke tests require bounded cost and synthetic data. Foundation verification results are recorded below. Product and live-provider checks remain outstanding.

Selected job sources: `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. Open implementation inputs: snapshot commits and reuse terms, model IDs/embedding config, approved inclusion-resource seed set, provider data-handling terms, local runtime limits, and cleanup scheduler. These do not block publishing the documentation.

## Foundation verification — 2026-09-18

Passed locally using Docker on macOS/ARM64: Compose configuration validation; app and database health; formatting, ESLint, and TypeScript checks; standalone production image build; development homepage and pgvector smoke checks; production HTTP and referenced static assets. Smoke tests also check PostgreSQL TCP/password authentication. The development app runs as UID 1000. `npm audit` reports zero known advisories. Relative document links and whitespace checks pass.

The workstation's port 5432 was occupied; its ignored `.env` uses `DB_PORT=5433`. The committed default remains 5432 and is configurable. The live app is at `http://localhost:3000`.

Visual browser verification was not completed because the computer-use tool did not approve Chrome control. No screenshot is claimed. Remote GitHub Actions has not yet run for these changes; its Docker commands were checked locally. Product behavior, auth/isolation, external providers, and domain migrations remain unimplemented and untested.
