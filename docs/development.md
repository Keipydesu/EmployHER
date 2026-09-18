# Development and deployment plan

This repository is documentation-only. There is no package manifest, app, migration, test suite, or runnable setup command yet. The following is an implementation plan, not completed setup.

## Local development

1. Select supported compatible Node.js, Next.js, TypeScript, and SDK versions; record them in the future package manifest and lockfile.
2. Create the Next.js application only when implementation is requested. Add Tailwind/shadcn, Auth0, Drizzle/Postgres driver, Zod, Octokit, Gemini SDK, and a Backboard server adapter.
3. Create a development Auth0 Regular Web Application with exact localhost callback/logout URLs according to the pinned SDK. Keep preview and production clients/settings isolated.
4. Provision a development Tiger Data database (or compatible local PostgreSQL with pgvector). Review Drizzle migrations, enable vector, and seed synthetic fixtures. Use TLS with certificate verification and a small connection pool.
5. Copy the placeholder inventory below into an ignored local environment file and populate privately. Validate configuration at startup; fail on missing required secrets. Never expose provider secrets with `NEXT_PUBLIC_`.
6. Implement contracts, ownership, extraction/review, ingestion, matching, resources, then coaching. Add actual setup/server/migrate/seed/lint/typecheck/test scripts and document them when they exist.

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
GITHUB_SOURCE_OWNER=<CURATED_REPOSITORY_OWNER>
GITHUB_SOURCE_REPO=<CURATED_REPOSITORY_NAME>
GITHUB_SOURCE_REF=<SOURCE_BRANCH_OR_COMMIT>
GITHUB_SOURCE_PATH=<SOURCE_FILE_OR_DIRECTORY>
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

Set exact Auth0 callback/logout origins. Confirm provider entitlements/model availability and budgets. Run a small authenticated manual ingestion first; add a scheduled independent worker only after repeat-run behavior works. Configure recurring expiry and deletion cleanup with a durable scheduler before real data is enabled; choose and document the concrete scheduler at implementation.

## Verification gates

Documentation checks today: internal links, whitespace/diff review, placeholder-only configuration, and staged scope review. No runtime claims.

Future implementation checks: two-user ownership and CSRF; PDF/text limits; five synthetic evidence fixtures; user correction and match invalidation; wrong-dimension vectors; duplicate ingestion; partial snapshot preservation; unknown eligibility; missing inclusion signals; prompt injection; idempotency and timeout recovery; provider outage; Backboard user isolation; memory opt-out; deletion/late-result races; expiry cleanup; no sensitive logs; production build and browser happy/error paths. Live-provider smoke tests require bounded cost and synthetic data.

Open implementation inputs: exact curated GitHub source and reuse terms, model IDs/embedding config, approved inclusion-resource seed set, provider data-handling terms, hosting limits, and cleanup scheduler. These do not block publishing the documentation.

Reference: [Vercel function limits](https://vercel.com/docs/functions/limitations). Verify account-specific limits at deployment.
