# Architecture and data flow

```text
Browser → anonymous supplied-sample demo → isolated sample state
Browser → Auth0 login → personal résumé flow → Next.js on localhost
                           ├─ Zod validation + ownership + quotas
                           ├─ Drizzle + pg → Tiger Data PostgreSQL / pgvector
                           ├─ Gemini: extraction, embeddings, gap analysis
                           └─ Backboard: private coaching assistant / threads
Curated GitHub source → Octokit ingestion → normalized roles + source evidence
                                              └─ Gemini role embeddings → database
```

## Boundaries

The anonymous demo exposes only supplied sample data and cannot access personal-upload or private-state routes. Auth0 authenticates real-app users; each private backend route still checks ownership. Resolve a validated issuer/subject pair to an internal user ID. Never trust a submitted user ID. Protect cookie-authenticated mutations against CSRF and origin abuse.

Tiger Data is the source of truth. Gemini suggests structured facts, semantic representations, and explanations; deterministic validators and user confirmation govern what is stored. Backboard owns conversational continuity, not authoritative skills, eligibility, permissions, or match state. Use a separate assistant per user because assistant memory may span threads. Resolve provider IDs on the server.

A separate, proposed shared resource-research cache (see [product.md](product.md)) may use Backboard to hold reusable, non-personal research (candidate certificates/courses/communities per subdomain) with source metadata, keyed by normalized subdomain/query/locale — never keyed by user or containing résumé content. Backboard still is not authoritative there either: the application database records the reviewed resource's ID and version once a research candidate is checked, and only reviewed records are shown to users.

## End-to-end flow

1. Verify the session, consent, upload size/type, and quotas. Proposed MVP upload cap: 2 MB, five pages, or 20,000 text characters. Treat these as application limits to validate in the local runtime.
2. Parse text locally on the server, discard contact details unnecessary for analysis, and ask Gemini for structured skills, experience, and education. Validate using Zod plus exact excerpt checks. Offer review; never silently invent missing fields.
3. Save a versioned structured profile with minimal excerpts. Do not persist the raw PDF/full text. Process within a bounded request, dispose of temporary bytes in a finally block, and require re-upload after failure. No durable raw-file workflow is proposed for this MVP.
4. The user confirms/corrects the profile. Embed the minimized skill/experience summary with a pinned Gemini embedding configuration.
5. Ingestion reads only the configured GitHub repository/path/ref. Parse into a normalized contract, validate source links, record commit SHA and retrieval time, and upsert by stable source key. Embed changed role content only.
6. Filter roles by explicit user criteria, then retrieve a small semantic candidate set. Compare structured requirements and send only needed evidence to Gemini for explanations and bounded next steps. Persist versioned matches.
7. Aggregate recurring requirements across deduplicated, reviewed listings for the chosen path/cohort. Compare those patterns with confirmed profile evidence to guide projects, skills and contextual organizations, not just individual job fit. Show known-requirement denominators, missing-data counts, sources and snapshot dates; temporal trends require comparable snapshots. Show source links, freshness, evidence, uncertainty, and documented resources. Confirmed edits or role changes invalidate cached matches.
8. For coaching, send the user's message and selected minimized context to Backboard. Load current profile/match state from the database, and never let old memory override it.

## Ingestion contract

The selected sources are `SimplifyJobs/Summer2027-Internships` and `SimplifyJobs/New-Grad-Positions`. For the MVP, use a reviewed static snapshot with recorded source commits and requirement excerpts from linked postings; no live ingestion dependency. Verify reuse terms before publishing source-derived data. Synthetic fixtures can unblock development and must be clearly labeled. Discover file layout per source and handle HTML tables embedded in Markdown. Roles without reviewed requirements remain discovery candidates, with no inferred skill-gap claims. GitHub is the discovery source; link the employer application page when present.

The following refresh contract applies when automated ingestion is implemented after the static MVP. Store `sourceKey`, source URL, commit SHA, content hash, fetched/last-seen time, and job status. Require HTTPS and block unsafe URLs; do not fetch arbitrary user/model URLs. Honor pagination, rate limits, Retry-After, and ETag conditional requests. Deduplicate by source key and flag probable cross-source duplicates without destructive merging. Only mark missing jobs inactive after a complete successful snapshot; disappearance means unlisted, not verified filled. Failed/partial ingestion preserves the last good snapshot and displays staleness. Explicit source closures take precedence.

## Execution and failures

For the small demo, use bounded synchronous requests; do not launch unawaited work after responding. Set and verify an overall application request deadline in the local runtime, one validation repair at most, bounded transient retries, and per-user/global spending caps. Return explicit timeout/retry states. Keep model calls outside DB transactions; persist final results atomically after rechecking owner/version/deletion state.

Persist operation IDs and owner-scoped idempotency keys before expensive work. A duplicate completed operation returns its result; an active duplicate returns conflict/retry information. Same key with different input is a conflict. Expired processing leases may be retried explicitly. New intentional regeneration gets a new key.

A larger ingestion corpus can move to a separate scheduled worker. If it calls an ingestion API, use Auth0 M2M Client Credentials with the correct audience and `opportunities:ingest` scope; validate issuer, audience, expiration, and scope. It gets no access to private résumés. This is service authentication, not agent-to-agent auth. A durable queue for user processing is deferred and would require a separate storage/retention design.

Official references: [Auth0 Next.js](https://github.com/auth0/nextjs-auth0), [Client Credentials](https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-credentials-flow), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Backboard architecture](https://docs.backboard.io/concepts/architecture), and [GitHub REST practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api). Checked 2026-09-18; integration behavior remains untested.
