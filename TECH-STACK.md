# EmployHER — current stack

Status: intended stack, clarified 2026-09-19. Next.js/TypeScript, synthetic flows and adapter code exist; connected integrations remain pending. [Decision 006](docs/decisions/006-retain-drizzle-with-tiger-data.md) retains Drizzle alongside TypeScript and Tailwind CSS. Supersedes the previous Rails stack through [decision 002](docs/decisions/002-hackhers-career-navigator.md).

| Layer | Choice | Responsibility |
| --- | --- | --- |
| App | Next.js + TypeScript | UI and server routes in one application |
| UI | Tailwind CSS + shadcn/ui | Accessible input, review, results, and coaching screens |
| Identity | Auth0 | Normal user login, sessions, protected routes |
| Data | Tiger Data PostgreSQL + pgvector | Authoritative profiles, opportunities, evidence, matches, vectors |
| Database access / migrations | Drizzle with the pg driver | Server-side queries, transactions and versioned migrations |
| Validation | Zod | Runtime payload validation |
| AI | Gemini | Structured résumé extraction, embeddings, grounded gap analysis |
| Coaching | Backboard.io | Persistent conversations and opted-in coaching memory |
| Ingestion | GitHub API + Octokit | Read the two selected SimplifyJobs repositories and update opportunities |
| App runtime | Node 24 on localhost | Direct npm development workflow; Docker and hosted deployment deferred |

Use server-only provider adapters. Pin mutually compatible supported runtime, framework, SDK, and model versions during implementation. No agent-to-agent authentication is needed. An optional independent ingestion worker may use Auth0 Client Credentials and the narrow `opportunities:ingest` scope.

The localhost target is recorded in [decision 003](docs/decisions/003-localhost-demo.md). Auth0, database, and AI provider integrations remain planned; localhost does not imply offline operation.

See [architecture](docs/architecture.md) and [development plan](docs/development.md). Earlier stack content remains available in Git history.

The local profile sample workspace is implemented alongside Opportunities. See [profile handoff](docs/implementation/person-a.md); authenticated provider/database integration remains pending.

Current implementation: screens use plain CSS, so Tailwind setup remains planned. The profile schema/repository uses Drizzle, but the pg connection pool, Drizzle bootstrap, shared migrations and authenticated runtime binding still need integration and verification.
