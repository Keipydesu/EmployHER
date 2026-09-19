# 006. Retain Drizzle with Tiger Data

- Status: Accepted operator clarification.
- Date: 2026-09-19.
- Supersedes: decision 005's Drizzle exclusion and replacement-tooling plan.

## Decision

Keep Drizzle for typed server-side database queries and schema definitions. TypeScript is the application language; Tailwind CSS is the intended styling layer. They coexist with Drizzle rather than replace it.

The planned connection is Next.js server → Drizzle → pg driver → Tiger Data PostgreSQL/pgvector. Tiger Data holds versioned profile evidence, preferences, reviewed catalog/resource data, saved career plans and operation/lifecycle records. Gemini creates embeddings; pgvector supports relevant-role similarity retrieval. Raw résumé files/full text are not retained as database records.

## Consequences

Preserve existing Drizzle dependencies, profile schema and repository code. Complete the pg connection pool with verified TLS, Drizzle bootstrap, ordered migrations, Auth0 owner mapping and runtime binding, then verify transactions, isolation, invalidation and cleanup against the database. Adding a database URL alone does not install the runtime.

The current profile demo uses memory and Opportunities uses local JSON state. This decision restores the planned stack; it does not claim a live connection or authorize changes to a remote database. Tailwind integration remains planned because the current screens use plain CSS.

See the [stack](../../TECH-STACK.md), [development guide](../development.md) and [roadmap](../../roadmap.md).
