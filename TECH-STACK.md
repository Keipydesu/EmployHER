# EmployHER — current stack

Status: user-selected direction for future implementation, recorded 2026-09-18. Person A's Next.js/TypeScript profile slice, Zod validation, Drizzle adapter, and Gemini REST integration are implemented locally. Provider infrastructure and production integration remain unprovisioned. See [the profile handoff](docs/implementation/person-a.md). Supersedes the previous Rails stack through [decision 002](docs/decisions/002-hackhers-career-navigator.md).

| Layer | Choice | Responsibility |
| --- | --- | --- |
| App | Next.js + TypeScript | UI and server routes in one application |
| UI | Tailwind + shadcn/ui | Accessible input, review, results, and coaching screens |
| Identity | Auth0 | Normal user login, sessions, protected routes |
| Data | Tiger Data PostgreSQL + pgvector | Authoritative profiles, opportunities, evidence, matches, vectors |
| ORM / validation | Drizzle / Zod | Versioned schema and runtime validation |
| AI | Gemini | Structured résumé extraction, embeddings, grounded gap analysis |
| Coaching | Backboard.io | Persistent conversations and opted-in coaching memory |
| Ingestion | GitHub API + Octokit | Read the two selected SimplifyJobs repositories and update opportunities |
| Hosting | Vercel | Next.js deployment and server-side integration |

Use server-only provider adapters. Pin mutually compatible supported runtime, framework, SDK, and model versions during implementation. No agent-to-agent authentication is needed. An optional independent ingestion worker may use Auth0 Client Credentials and the narrow `opportunities:ingest` scope.

See [architecture](docs/architecture.md) and [development plan](docs/development.md). Earlier stack content remains available in Git history.
